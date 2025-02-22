-- Sample data for CodeConnect platform

-- First, create users in auth.users table
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'sarah@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz', NOW(), NOW(), NOW(), '{"username":"sarah_dev","full_name":"Sarah Johnson"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'mike@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz', NOW(), NOW(), NOW(), '{"username":"mike_code","full_name":"Michael Smith"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'emma@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz', NOW(), NOW(), NOW(), '{"username":"emma_tech","full_name":"Emma Wilson"}'::jsonb),
  ('44444444-4444-4444-4444-444444444444', 'alex@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz', NOW(), NOW(), NOW(), '{"username":"alex_dev","full_name":"Alex Brown"}'::jsonb),
  ('55555555-5555-5555-5555-555555555555', 'lisa@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz', NOW(), NOW(), NOW(), '{"username":"lisa_code","full_name":"Lisa Anderson"}'::jsonb),
  ('66666666-6666-6666-6666-666666666666', 'james@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz', NOW(), NOW(), NOW(), '{"username":"james_prog","full_name":"James Wilson"}'::jsonb),
  ('77777777-7777-7777-7777-777777777777', 'anna@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz', NOW(), NOW(), NOW(), '{"username":"anna_dev","full_name":"Anna Martinez"}'::jsonb),
  ('88888888-8888-8888-8888-888888888888', 'david@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz', NOW(), NOW(), NOW(), '{"username":"david_tech","full_name":"David Lee"}'::jsonb),
  ('99999999-9999-9999-9999-999999999999', 'sophia@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz', NOW(), NOW(), NOW(), '{"username":"sophia_code","full_name":"Sophia Garcia"}'::jsonb),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ryan@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz', NOW(), NOW(), NOW(), '{"username":"ryan_dev","full_name":"Ryan Taylor"}'::jsonb);

-- Insert sample skills
INSERT INTO skills (id, name, category) VALUES
  (gen_random_uuid(), 'JavaScript', 'Programming Languages'),
  (gen_random_uuid(), 'Python', 'Programming Languages'),
  (gen_random_uuid(), 'React', 'Frontend'),
  (gen_random_uuid(), 'Node.js', 'Backend'),
  (gen_random_uuid(), 'PostgreSQL', 'Database'),
  (gen_random_uuid(), 'Docker', 'DevOps'),
  (gen_random_uuid(), 'AWS', 'Cloud'),
  (gen_random_uuid(), 'TypeScript', 'Programming Languages'),
  (gen_random_uuid(), 'GraphQL', 'API'),
  (gen_random_uuid(), 'Git', 'Version Control');

-- Insert sample interests
INSERT INTO interests (id, name, category) VALUES
  (gen_random_uuid(), 'Open Source', 'Development'),
  (gen_random_uuid(), 'Machine Learning', 'AI'),
  (gen_random_uuid(), 'Web Development', 'Development'),
  (gen_random_uuid(), 'Mobile Apps', 'Development'),
  (gen_random_uuid(), 'Blockchain', 'Technology'),
  (gen_random_uuid(), 'UI/UX Design', 'Design'),
  (gen_random_uuid(), 'Cloud Computing', 'Infrastructure'),
  (gen_random_uuid(), 'Cybersecurity', 'Security'),
  (gen_random_uuid(), 'Game Development', 'Development'),
  (gen_random_uuid(), 'Data Science', 'Analytics');

-- Update the automatically created profiles with our sample data
UPDATE profiles 
SET 
  avatar_url = CASE id
    WHEN '11111111-1111-1111-1111-111111111111' THEN 'https://randomuser.me/api/portraits/women/1.jpg'
    WHEN '22222222-2222-2222-2222-222222222222' THEN 'https://randomuser.me/api/portraits/men/2.jpg'
    WHEN '33333333-3333-3333-3333-333333333333' THEN 'https://randomuser.me/api/portraits/women/3.jpg'
    WHEN '44444444-4444-4444-4444-444444444444' THEN 'https://randomuser.me/api/portraits/men/4.jpg'
    WHEN '55555555-5555-5555-5555-555555555555' THEN 'https://randomuser.me/api/portraits/women/5.jpg'
    WHEN '66666666-6666-6666-6666-666666666666' THEN 'https://randomuser.me/api/portraits/men/6.jpg'
    WHEN '77777777-7777-7777-7777-777777777777' THEN 'https://randomuser.me/api/portraits/women/7.jpg'
    WHEN '88888888-8888-8888-8888-888888888888' THEN 'https://randomuser.me/api/portraits/men/8.jpg'
    WHEN '99999999-9999-9999-9999-999999999999' THEN 'https://randomuser.me/api/portraits/women/9.jpg'
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' THEN 'https://randomuser.me/api/portraits/men/10.jpg'
  END,
  bio = CASE id
    WHEN '11111111-1111-1111-1111-111111111111' THEN 'Full-stack developer passionate about React and Node.js'
    WHEN '22222222-2222-2222-2222-222222222222' THEN 'Python enthusiast and machine learning practitioner'
    WHEN '33333333-3333-3333-3333-333333333333' THEN 'Frontend developer specializing in modern web applications'
    WHEN '44444444-4444-4444-4444-444444444444' THEN 'DevOps engineer with a passion for automation'
    WHEN '55555555-5555-5555-5555-555555555555' THEN 'Backend developer focused on scalable systems'
    WHEN '66666666-6666-6666-6666-666666666666' THEN 'Mobile app developer and UI/UX enthusiast'
    WHEN '77777777-7777-7777-7777-777777777777' THEN 'Cloud architect and AWS certified professional'
    WHEN '88888888-8888-8888-8888-888888888888' THEN 'Security specialist and blockchain developer'
    WHEN '99999999-9999-9999-9999-999999999999' THEN 'Game developer and graphics programming enthusiast'
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' THEN 'Data scientist and AI researcher'
  END,
  updated_at = NOW()
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

-- Insert developer profiles
INSERT INTO developer_profiles (id, user_id, experience_level, bio, github_url, linkedin_url, website_url, available_for_hire) VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Advanced', 'Senior full-stack developer with 5+ years of experience', 'https://github.com/sarah_dev', 'https://linkedin.com/in/sarah_dev', 'https://sarah-dev.com', true),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'Intermediate', 'Python developer focusing on ML and AI', 'https://github.com/mike_code', 'https://linkedin.com/in/mike_code', 'https://mike-code.com', false),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'Advanced', 'Frontend expert specializing in React', 'https://github.com/emma_tech', 'https://linkedin.com/in/emma_tech', 'https://emma-tech.com', true),
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 'Advanced', 'DevOps engineer with cloud expertise', 'https://github.com/alex_dev', 'https://linkedin.com/in/alex_dev', 'https://alex-dev.com', false),
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', 'Intermediate', 'Backend developer working with Node.js', 'https://github.com/lisa_code', 'https://linkedin.com/in/lisa_code', 'https://lisa-code.com', true),
  (gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 'Beginner', 'Mobile developer learning React Native', 'https://github.com/james_prog', 'https://linkedin.com/in/james_prog', 'https://james-prog.com', true),
  (gen_random_uuid(), '77777777-7777-7777-7777-777777777777', 'Advanced', 'AWS solutions architect', 'https://github.com/anna_dev', 'https://linkedin.com/in/anna_dev', 'https://anna-dev.com', false),
  (gen_random_uuid(), '88888888-8888-8888-8888-888888888888', 'Intermediate', 'Blockchain and security specialist', 'https://github.com/david_tech', 'https://linkedin.com/in/david_tech', 'https://david-tech.com', true),
  (gen_random_uuid(), '99999999-9999-9999-9999-999999999999', 'Advanced', 'Game developer with Unity expertise', 'https://github.com/sophia_code', 'https://linkedin.com/in/sophia_code', 'https://sophia-code.com', true),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Intermediate', 'Data scientist working on ML projects', 'https://github.com/ryan_dev', 'https://linkedin.com/in/ryan_dev', 'https://ryan-dev.com', false);

-- Create some friendships
INSERT INTO friendships (user_id, friend_id, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', NOW()),
  ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', NOW()),
  ('55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666', NOW()),
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', NOW()),
  ('99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW());

-- Create some pending friend requests
INSERT INTO friend_requests (sender_id, receiver_id, status, created_at, updated_at) VALUES
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'pending', NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 'pending', NOW(), NOW()),
  ('66666666-6666-6666-6666-666666666666', '88888888-8888-8888-8888-888888888888', 'pending', NOW(), NOW());

-- Add some messages
INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Hey, would you like to collaborate on a project?', NOW()),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Sure! What kind of project do you have in mind?', NOW()),
  ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'I need help with a DevOps setup', NOW()),
  ('55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666', 'Can you review my React Native code?', NOW());

-- Link developers with skills (with proficiency levels)
WITH dev_ids AS (SELECT id FROM developer_profiles),
     skill_ids AS (SELECT id FROM skills)
INSERT INTO developer_skills (developer_id, skill_id, proficiency)
SELECT 
  d.id,
  s.id,
  floor(random() * 4 + 2)::int  -- Random proficiency between 2 and 5
FROM dev_ids d
CROSS JOIN skill_ids s
WHERE random() < 0.3;  -- Only create entries for ~30% of possible combinations

-- Link developers with interests
WITH dev_ids AS (SELECT id FROM developer_profiles),
     interest_ids AS (SELECT id FROM interests)
INSERT INTO developer_interests (developer_id, interest_id)
SELECT 
  d.id,
  i.id
FROM dev_ids d
CROSS JOIN interest_ids i
WHERE random() < 0.3;  -- Only create entries for ~30% of possible combinations

-- Update search vectors directly instead of calling the trigger function
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
GROUP BY dp.id, p.username, dp.bio, dp.experience_level
ON CONFLICT (developer_id) DO UPDATE
SET
  search_vector = EXCLUDED.search_vector,
  skills_vector = EXCLUDED.skills_vector,
  interests_vector = EXCLUDED.interests_vector; 