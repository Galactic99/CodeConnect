-- Extended sample data for CodeConnect platform
BEGIN;

-- Temporarily disable RLS for auth.users
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- First, ensure all required skills exist
DO $$
DECLARE
  required_skills json := '[
    {"name": "JavaScript", "category": "Programming Languages"},
    {"name": "Python", "category": "Programming Languages"},
    {"name": "Java", "category": "Programming Languages"},
    {"name": "C++", "category": "Programming Languages"},
    {"name": "Ruby", "category": "Programming Languages"},
    {"name": "Go", "category": "Programming Languages"},
    {"name": "TypeScript", "category": "Programming Languages"},
    {"name": "Swift", "category": "Programming Languages"},
    {"name": "Kotlin", "category": "Programming Languages"},
    {"name": "Rust", "category": "Programming Languages"},
    {"name": "React", "category": "Frontend"},
    {"name": "Vue.js", "category": "Frontend"},
    {"name": "Angular", "category": "Frontend"},
    {"name": "HTML5", "category": "Frontend"},
    {"name": "CSS3", "category": "Frontend"},
    {"name": "Sass", "category": "Frontend"},
    {"name": "Webpack", "category": "Frontend"},
    {"name": "Next.js", "category": "Frontend"},
    {"name": "Node.js", "category": "Backend"},
    {"name": "Django", "category": "Backend"},
    {"name": "Spring Boot", "category": "Backend"},
    {"name": "Express.js", "category": "Backend"},
    {"name": "Laravel", "category": "Backend"},
    {"name": "FastAPI", "category": "Backend"},
    {"name": "PostgreSQL", "category": "Database"},
    {"name": "MongoDB", "category": "Database"},
    {"name": "MySQL", "category": "Database"},
    {"name": "Redis", "category": "Database"},
    {"name": "Docker", "category": "DevOps"},
    {"name": "Kubernetes", "category": "DevOps"},
    {"name": "AWS", "category": "DevOps"},
    {"name": "Azure", "category": "DevOps"},
    {"name": "Jenkins", "category": "DevOps"},
    {"name": "Terraform", "category": "DevOps"},
    {"name": "Jest", "category": "Testing"},
    {"name": "Cypress", "category": "Testing"},
    {"name": "Selenium", "category": "Testing"},
    {"name": "JUnit", "category": "Testing"},
    {"name": "React Native", "category": "Mobile"},
    {"name": "Flutter", "category": "Mobile"}
  ]'::json;
  skill json;
BEGIN
  -- Check each required skill
  FOR skill IN SELECT * FROM json_array_elements(required_skills)
  LOOP
    -- Insert skill if it doesn't exist
    INSERT INTO skills (id, name, category)
    VALUES (
      gen_random_uuid(),
      skill->>'name',
      skill->>'category'
    )
    ON CONFLICT (name) DO UPDATE 
    SET category = EXCLUDED.category;
  END LOOP;
END $$;

-- Function to create sample users
CREATE OR REPLACE FUNCTION create_sample_users()
RETURNS void AS $$
BEGIN
  FOR n IN 1..50 LOOP
    -- Insert user
    WITH new_user AS (
      INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data
      )
      VALUES (
        gen_random_uuid(),
        'sample_user_' || n || '_' || floor(random() * 1000000)::text || '@example.com',
        '$2a$10$abcdefghijklmnopqrstuvwxyz',
        NOW(),
        NOW() - (n || ' days')::interval,
        NOW(),
        jsonb_build_object(
          'username',
          CASE (n % 5)
            WHEN 0 THEN 'dev'
            WHEN 1 THEN 'coder'
            WHEN 2 THEN 'programmer'
            WHEN 3 THEN 'engineer'
            WHEN 4 THEN 'ninja'
          END || '_' || n || '_' || floor(random() * 1000)::text,
          'full_name',
          (
            CASE (n % 10)
              WHEN 0 THEN 'John'
              WHEN 1 THEN 'Sarah'
              WHEN 2 THEN 'Michael'
              WHEN 3 THEN 'Emma'
              WHEN 4 THEN 'David'
              WHEN 5 THEN 'Lisa'
              WHEN 6 THEN 'James'
              WHEN 7 THEN 'Anna'
              WHEN 8 THEN 'Robert'
              WHEN 9 THEN 'Maria'
            END
            || ' ' ||
            CASE (n % 8)
              WHEN 0 THEN 'Smith'
              WHEN 1 THEN 'Johnson'
              WHEN 2 THEN 'Williams'
              WHEN 3 THEN 'Brown'
              WHEN 4 THEN 'Jones'
              WHEN 5 THEN 'Garcia'
              WHEN 6 THEN 'Miller'
              WHEN 7 THEN 'Davis'
            END
          )
        )
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING id, raw_user_meta_data
    )
    -- Explicitly create profile
    INSERT INTO profiles (
      id,
      username,
      full_name,
      created_at,
      updated_at
    )
    SELECT 
      id,
      raw_user_meta_data->>'username',
      raw_user_meta_data->>'full_name',
      NOW(),
      NOW()
    FROM new_user
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create the sample users
SELECT create_sample_users();

-- Insert interests if they don't exist
INSERT INTO interests (id, name, category)
VALUES
  -- Development Areas
  (gen_random_uuid(), 'Web Development', 'Development'),
  (gen_random_uuid(), 'Mobile Development', 'Development'),
  (gen_random_uuid(), 'Game Development', 'Development'),
  (gen_random_uuid(), 'DevOps', 'Development'),
  (gen_random_uuid(), 'System Architecture', 'Development'),
  -- Technology
  (gen_random_uuid(), 'Artificial Intelligence', 'Technology'),
  (gen_random_uuid(), 'Machine Learning', 'Technology'),
  (gen_random_uuid(), 'Blockchain', 'Technology'),
  (gen_random_uuid(), 'Cloud Computing', 'Technology'),
  (gen_random_uuid(), 'Internet of Things', 'Technology'),
  (gen_random_uuid(), 'Cybersecurity', 'Technology'),
  (gen_random_uuid(), 'Big Data', 'Technology'),
  -- Industry
  (gen_random_uuid(), 'Fintech', 'Industry'),
  (gen_random_uuid(), 'Healthcare Tech', 'Industry'),
  (gen_random_uuid(), 'E-commerce', 'Industry'),
  (gen_random_uuid(), 'EdTech', 'Industry'),
  -- Practices
  (gen_random_uuid(), 'Open Source', 'Practices'),
  (gen_random_uuid(), 'Agile Development', 'Practices'),
  (gen_random_uuid(), 'Clean Code', 'Practices'),
  (gen_random_uuid(), 'Code Review', 'Practices')
ON CONFLICT (name) DO NOTHING;

-- Update profiles with random data
WITH user_data AS (
  SELECT id, raw_user_meta_data->>'username' as username,
         raw_user_meta_data->>'full_name' as full_name
  FROM auth.users
  WHERE email LIKE 'user%@example.com'
)
UPDATE profiles 
SET 
  username = ud.username,
  full_name = ud.full_name,
  avatar_url = 'https://i.pravatar.cc/150?u=' || profiles.id,
  bio = CASE (RANDOM() * 4)::INT
    WHEN 0 THEN 'Passionate developer focused on building scalable applications'
    WHEN 1 THEN 'Full-stack engineer with a love for clean code and best practices'
    WHEN 2 THEN 'Tech enthusiast exploring the latest in web and mobile development'
    WHEN 3 THEN 'Software architect with expertise in distributed systems'
    WHEN 4 THEN 'Problem solver who enjoys tackling complex technical challenges'
  END,
  updated_at = NOW()
FROM user_data ud
WHERE profiles.id = ud.id;

-- Create developer profiles
INSERT INTO developer_profiles (id, user_id, experience_level, bio, github_url, linkedin_url, website_url, available_for_hire)
SELECT 
  gen_random_uuid(),
  u.id,
  (CASE (RANDOM() * 2)::INT
    WHEN 0 THEN 'Beginner'
    WHEN 1 THEN 'Intermediate'
    WHEN 2 THEN 'Advanced'
  END)::experience_level,
  p.bio,
  'https://github.com/' || p.username,
  'https://linkedin.com/in/' || p.username,
  'https://' || p.username || '.dev',
  RANDOM() > 0.5
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.email LIKE 'user%@example.com'
ON CONFLICT (user_id) DO NOTHING;

-- Add developer skills (3-7 skills per developer)
WITH dev_skills AS (
  SELECT dp.id as developer_id,
         s.id as skill_id,
         FLOOR(RANDOM() * 5 + 1) as proficiency
  FROM developer_profiles dp
  CROSS JOIN skills s
  WHERE RANDOM() < 0.2  -- 20% chance of having each skill
)
INSERT INTO developer_skills (developer_id, skill_id, proficiency)
SELECT developer_id, skill_id, proficiency
FROM dev_skills
ON CONFLICT (developer_id, skill_id) DO NOTHING;

-- Add developer interests (2-5 interests per developer)
WITH dev_interests AS (
  SELECT dp.id as developer_id,
         i.id as interest_id
  FROM developer_profiles dp
  CROSS JOIN interests i
  WHERE RANDOM() < 0.15  -- 15% chance of having each interest
)
INSERT INTO developer_interests (developer_id, interest_id)
SELECT developer_id, interest_id
FROM dev_interests
ON CONFLICT (developer_id, interest_id) DO NOTHING;

-- Create some friendships (each user has 2-5 friends)
INSERT INTO friendships (user_id, friend_id, created_at)
SELECT DISTINCT
  u1.id as user_id,
  u2.id as friend_id,
  NOW() - (RANDOM() * 365 || ' days')::interval
FROM profiles u1
CROSS JOIN profiles u2
WHERE u1.id < u2.id
  AND u1.username LIKE 'user%'
  AND u2.username LIKE 'user%'
  AND RANDOM() < 0.1  -- 10% chance of friendship between any two users
  AND NOT EXISTS (
    SELECT 1 FROM friendships f
    WHERE (f.user_id = u1.id AND f.friend_id = u2.id)
       OR (f.user_id = u2.id AND f.friend_id = u1.id)
  );

-- Create some pending friend requests
INSERT INTO friend_requests (sender_id, receiver_id, status, created_at, updated_at)
SELECT DISTINCT
  u1.id as sender_id,
  u2.id as receiver_id,
  'pending',
  NOW() - (RANDOM() * 30 || ' days')::interval,
  NOW() - (RANDOM() * 30 || ' days')::interval
FROM profiles u1
CROSS JOIN profiles u2
WHERE u1.id < u2.id
  AND u1.username LIKE 'user%'
  AND u2.username LIKE 'user%'
  AND RANDOM() < 0.05  -- 5% chance of pending request between any two users
  AND NOT EXISTS (
    SELECT 1 FROM friendships f
    WHERE (f.user_id = u1.id AND f.friend_id = u2.id)
       OR (f.user_id = u2.id AND f.friend_id = u1.id)
  )
  AND NOT EXISTS (
    SELECT 1 FROM friend_requests fr
    WHERE (fr.sender_id = u1.id AND fr.receiver_id = u2.id)
       OR (fr.sender_id = u2.id AND fr.receiver_id = u1.id)
  );

-- Add some messages between friends
INSERT INTO messages (sender_id, receiver_id, content, created_at)
SELECT 
  f.user_id,
  f.friend_id,
  CASE (RANDOM() * 4)::INT
    WHEN 0 THEN 'Hey! Would you like to collaborate on a project?'
    WHEN 1 THEN 'I saw your profile and I''m impressed with your skills!'
    WHEN 2 THEN 'Can you help me with a technical question?'
    WHEN 3 THEN 'Let''s work on something together!'
    WHEN 4 THEN 'I''d love to learn more about your experience with ' || s.name
  END,
  NOW() - (RANDOM() * 30 || ' days')::interval
FROM friendships f
CROSS JOIN skills s
WHERE RANDOM() < 0.3  -- 30% chance of message between friends
LIMIT 100;  -- Limit to 100 messages total

-- Create materialized view for search cache
CREATE MATERIALIZED VIEW IF NOT EXISTS developer_search_cache AS
SELECT
  dp.id as developer_id,
  p.username,
  p.full_name,
  dp.bio,
  dp.experience_level,
  dp.github_url,
  dp.linkedin_url,
  dp.website_url,
  dp.available_for_hire,
  array_agg(DISTINCT s.name) as skills,
  array_agg(DISTINCT i.name) as interests,
  setweight(to_tsvector('english', COALESCE(p.username, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(p.full_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(dp.bio, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(dp.experience_level::text, '')), 'C') as search_vector,
  setweight(to_tsvector('english', string_agg(COALESCE(s.name, ''), ' ')), 'A') as skills_vector,
  setweight(to_tsvector('english', string_agg(COALESCE(i.name, ''), ' ')), 'B') as interests_vector
FROM developer_profiles dp
JOIN profiles p ON p.id = dp.user_id
LEFT JOIN developer_skills ds ON ds.developer_id = dp.id
LEFT JOIN skills s ON s.id = ds.skill_id
LEFT JOIN developer_interests di ON di.developer_id = dp.id
LEFT JOIN interests i ON i.id = di.interest_id
GROUP BY dp.id, p.username, p.full_name, dp.bio, dp.experience_level, dp.github_url, dp.linkedin_url, dp.website_url, dp.available_for_hire;

-- Create indexes on the materialized view
CREATE INDEX IF NOT EXISTS idx_developer_search_cache_search_vector ON developer_search_cache USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_developer_search_cache_skills_vector ON developer_search_cache USING gin(skills_vector);
CREATE INDEX IF NOT EXISTS idx_developer_search_cache_interests_vector ON developer_search_cache USING gin(interests_vector);

-- Update search vectors
REFRESH MATERIALIZED VIEW developer_search_cache;

-- Restore RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

COMMIT; 