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
BEGIN
  INSERT INTO profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTR(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER create_profile_on_signup
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

-- Create RLS (Row Level Security) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

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

-- Create coding sessions table
CREATE TABLE IF NOT EXISTS coding_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT,
  language TEXT DEFAULT 'javascript',
  content TEXT DEFAULT ''
);

-- Create session participants table
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES coding_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Create session messages table
CREATE TABLE IF NOT EXISTS session_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES coding_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for coding sessions and related tables
ALTER TABLE coding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;

-- Coding sessions policies
CREATE POLICY "Sessions are viewable by participants"
  ON coding_sessions
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM session_participants 
      WHERE session_id = id
    ) OR auth.uid() = created_by
  );

CREATE POLICY "Users can create sessions"
  ON coding_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Session creators can update their sessions"
  ON coding_sessions
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Participants policies
CREATE POLICY "Participants can be viewed by session members"
  ON session_participants
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM session_participants sp 
      WHERE sp.session_id = session_id
    )
  );

CREATE POLICY "Users can join sessions"
  ON session_participants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave sessions"
  ON session_participants
  FOR DELETE
  USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Messages can be viewed by session members"
  ON session_messages
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM session_participants sp 
      WHERE sp.session_id = session_id
    )
  );

CREATE POLICY "Session members can send messages"
  ON session_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT user_id 
      FROM session_participants sp 
      WHERE sp.session_id = session_id
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_coding_sessions_created_by ON coding_sessions(created_by);
CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX idx_session_messages_session_id ON session_messages(session_id);
CREATE INDEX idx_session_messages_created_at ON session_messages(created_at); 