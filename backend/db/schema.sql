-- Create enum types
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experience_level') THEN
        CREATE TYPE experience_level AS ENUM ('Beginner', 'Intermediate', 'Advanced');
    END IF;
END
$$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create a trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
DECLARE
  dev_profile_id UUID;
  username_val TEXT;
  full_name_val TEXT;
BEGIN
  -- Extract username and full_name from metadata
  username_val := COALESCE(
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1),
    'user_' || SUBSTR(NEW.id::text, 1, 8)
  );
  full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  -- Create the basic profile first
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar_url,
    bio,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    username_val,
    full_name_val,
    '',
    '',
    NOW(),
    NOW()
  );

  -- Create developer profile
  INSERT INTO public.developer_profiles (
    user_id,
    experience_level,
    bio,
    available_for_hire,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    'Beginner',
    '',
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO dev_profile_id;

  -- Initialize search vectors
  INSERT INTO public.search_vectors (
    developer_id,
    search_vector,
    skills_vector,
    interests_vector
  )
  VALUES (
    dev_profile_id,
    setweight(to_tsvector('english', COALESCE(username_val, '')), 'A'),
    to_tsvector('english', ''),
    to_tsvector('english', '')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error and details
  RAISE LOG 'Error in create_profile_for_user for user %: %, SQLSTATE: %', NEW.id, SQLERRM, SQLSTATE;
  -- Continue with the transaction
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;

-- Create the trigger
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

-- Create friendships table (for managing friend relationships)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  friend_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  receiver_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(sender_id, receiver_id),
  CHECK (sender_id != receiver_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  receiver_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  CHECK (sender_id != receiver_id)
);

-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create interests table
CREATE TABLE IF NOT EXISTS interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create developer_profiles table
CREATE TABLE IF NOT EXISTS developer_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  experience_level experience_level NOT NULL,
  bio TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  available_for_hire BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);

-- Create developer_skills table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS developer_skills (
  developer_id UUID REFERENCES developer_profiles(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  proficiency INTEGER CHECK (proficiency BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (developer_id, skill_id)
);

-- Create developer_interests table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS developer_interests (
  developer_id UUID REFERENCES developer_profiles(id) ON DELETE CASCADE,
  interest_id UUID REFERENCES interests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (developer_id, interest_id)
);

-- Create search_vectors table for full-text search
CREATE TABLE IF NOT EXISTS search_vectors (
  developer_id UUID REFERENCES developer_profiles(id) ON DELETE CASCADE PRIMARY KEY,
  search_vector tsvector,
  skills_vector tsvector,
  interests_vector tsvector
);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_search_vector ON search_vectors USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_skills_vector ON search_vectors USING gin(skills_vector);
CREATE INDEX IF NOT EXISTS idx_interests_vector ON search_vectors USING gin(interests_vector);

-- Create function to update search vectors
CREATE OR REPLACE FUNCTION update_search_vectors()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO search_vectors (developer_id, search_vector, skills_vector, interests_vector)
  SELECT
    dp.id,
    setweight(to_tsvector('english', COALESCE(p.username, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(dp.bio, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(dp.experience_level::text, '')), 'C'),
    setweight(to_tsvector('english', string_agg(COALESCE(s.name, ''), ' ')), 'A'),
    setweight(to_tsvector('english', string_agg(COALESCE(i.name, ''), ' ')), 'B')
  FROM developer_profiles dp
  JOIN profiles p ON p.id = dp.user_id
  LEFT JOIN developer_skills ds ON ds.developer_id = dp.id
  LEFT JOIN skills s ON s.id = ds.skill_id
  LEFT JOIN developer_interests di ON di.developer_id = dp.id
  LEFT JOIN interests i ON i.id = di.interest_id
  WHERE dp.id = NEW.id
  GROUP BY dp.id, p.username, dp.bio, dp.experience_level
  ON CONFLICT (developer_id) DO UPDATE
  SET
    search_vector = EXCLUDED.search_vector,
    skills_vector = EXCLUDED.skills_vector,
    interests_vector = EXCLUDED.interests_vector;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update search vectors
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_developer_search_vectors') THEN
        CREATE TRIGGER update_developer_search_vectors
        AFTER INSERT OR UPDATE ON developer_profiles
        FOR EACH ROW
        EXECUTE FUNCTION update_search_vectors();
    END IF;
END
$$;

-- Create function to search developers
CREATE OR REPLACE FUNCTION search_developers(
  search_query TEXT,
  skill_filter TEXT[] DEFAULT NULL,
  interest_filter TEXT[] DEFAULT NULL,
  experience_filter experience_level[] DEFAULT NULL,
  page_number INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  experience_level experience_level,
  bio TEXT,
  skills TEXT[],
  interests TEXT[],
  match_score DOUBLE PRECISION
) AS $$
DECLARE
  query_tsquery tsquery;
BEGIN
  -- Safely create tsquery, return empty if invalid
  IF search_query IS NOT NULL AND search_query != '' THEN
    BEGIN
      query_tsquery := to_tsquery('english', search_query);
    EXCEPTION WHEN OTHERS THEN
      query_tsquery := to_tsquery('english', '');
    END;
  END IF;

  RETURN QUERY
  WITH developer_data AS (
    SELECT
      dp.id,
      dp.user_id,
      p.username,
      p.full_name,
      p.avatar_url,
      dp.experience_level,
      dp.bio,
      array_remove(array_agg(DISTINCT s.name), NULL) as skills,
      array_remove(array_agg(DISTINCT i.name), NULL) as interests,
      sv.search_vector,
      sv.skills_vector,
      sv.interests_vector
    FROM developer_profiles dp
    JOIN profiles p ON p.id = dp.user_id
    LEFT JOIN search_vectors sv ON sv.developer_id = dp.id
    LEFT JOIN developer_skills ds ON ds.developer_id = dp.id
    LEFT JOIN skills s ON s.id = ds.skill_id
    LEFT JOIN developer_interests di ON di.developer_id = dp.id
    LEFT JOIN interests i ON i.id = di.interest_id
    WHERE
      (skill_filter IS NULL OR s.name = ANY(skill_filter))
      AND (interest_filter IS NULL OR i.name = ANY(interest_filter))
      AND (experience_filter IS NULL OR dp.experience_level = ANY(experience_filter))
    GROUP BY dp.id, dp.user_id, p.username, p.full_name, p.avatar_url, dp.experience_level, dp.bio, sv.search_vector, sv.skills_vector, sv.interests_vector
  )
  SELECT
    dd.id,
    dd.user_id,
    dd.username,
    dd.full_name,
    dd.avatar_url,
    dd.experience_level,
    dd.bio,
    dd.skills,
    dd.interests,
    CASE 
      WHEN query_tsquery IS NULL THEN 0::DOUBLE PRECISION
      ELSE (
        COALESCE(ts_rank(dd.search_vector, query_tsquery), 0) +
        COALESCE(ts_rank(dd.skills_vector, query_tsquery), 0) +
        COALESCE(ts_rank(dd.interests_vector, query_tsquery), 0)
      )::DOUBLE PRECISION
    END as match_score
  FROM developer_data dd
  WHERE
    query_tsquery IS NULL OR
    dd.search_vector @@ query_tsquery OR
    dd.skills_vector @@ query_tsquery OR
    dd.interests_vector @@ query_tsquery
  ORDER BY match_score DESC, dd.username ASC
  LIMIT page_size
  OFFSET (page_number - 1) * page_size;
END;
$$ LANGUAGE plpgsql;

-- Create RLS (Row Level Security) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_vectors ENABLE ROW LEVEL SECURITY;

-- Grant trigger function necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Developer profiles policies
CREATE POLICY "Public developer profiles are viewable by everyone"
  ON developer_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own developer profile"
  ON developer_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own developer profile"
  ON developer_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Search vectors policies
CREATE POLICY "Public search vectors are viewable by everyone"
  ON search_vectors FOR SELECT
  USING (true);

CREATE POLICY "Search vectors can be inserted for own profile"
  ON search_vectors FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM developer_profiles dp
    WHERE dp.id = developer_id AND (dp.user_id = auth.uid() OR auth.role() = 'service_role')
  ));

CREATE POLICY "Search vectors can be updated for own profile"
  ON search_vectors FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM developer_profiles dp
    WHERE dp.id = developer_id AND dp.user_id = auth.uid()
  ));

-- Friendships policies
CREATE POLICY "Users can view their own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create their own friendships"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Friend requests policies
CREATE POLICY "Users can view their own friend requests"
  ON friend_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
  ON friend_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update friend requests they received"
  ON friend_requests FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Messages policies
CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Create helpful views
CREATE OR REPLACE VIEW user_friends AS
SELECT 
  p.id,
  p.username,
  p.full_name,
  p.avatar_url,
  f.created_at as friendship_created_at
FROM profiles p
INNER JOIN friendships f 
  ON (f.friend_id = p.id OR f.user_id = p.id)
WHERE 
  CASE 
    WHEN f.user_id = auth.uid() THEN f.friend_id = p.id
    WHEN f.friend_id = auth.uid() THEN f.user_id = p.id
  END;

-- Function to search users
CREATE OR REPLACE FUNCTION search_users(search_query TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  friendship_status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    CASE
      WHEN f.id IS NOT NULL THEN 'friend'
      WHEN fr_sent.id IS NOT NULL THEN 'request_sent'
      WHEN fr_received.id IS NOT NULL THEN 'request_received'
      ELSE 'not_friend'
    END as friendship_status
  FROM profiles p
  LEFT JOIN friendships f 
    ON (f.user_id = auth.uid() AND f.friend_id = p.id)
    OR (f.friend_id = auth.uid() AND f.user_id = p.id)
  LEFT JOIN friend_requests fr_sent
    ON fr_sent.sender_id = auth.uid() AND fr_sent.receiver_id = p.id
  LEFT JOIN friend_requests fr_received
    ON fr_received.receiver_id = auth.uid() AND fr_received.sender_id = p.id
  WHERE 
    p.id != auth.uid()
    AND (
      p.username ILIKE '%' || search_query || '%'
      OR p.full_name ILIKE '%' || search_query || '%'
    )
  LIMIT 20;
END;
$$; 