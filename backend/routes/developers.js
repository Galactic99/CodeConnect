const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// Get developer profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('developer_profiles')
      .select(`
        *,
        user:user_id (username, full_name, avatar_url),
        skills:developer_skills (
          skill:skill_id (id, name, category),
          proficiency
        ),
        interests:developer_interests (
          interest:interest_id (id, name, category)
        )
      `)
      .eq('user_id', req.params.userId)
      .single();

    if (error) throw error;
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update developer profile
router.post('/profile', async (req, res) => {
  try {
    const {
      user_id,
      experience_level,
      bio,
      github_url,
      linkedin_url,
      website_url,
      skills,
      interests
    } = req.body;

    // Start a transaction
    const { data: profile, error: profileError } = await supabase
      .from('developer_profiles')
      .upsert({
        user_id,
        experience_level,
        bio,
        github_url,
        linkedin_url,
        website_url,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) throw profileError;

    // Update skills
    if (skills && skills.length > 0) {
      // Delete existing skills
      await supabase
        .from('developer_skills')
        .delete()
        .eq('developer_id', profile.id);

      // Insert new skills
      const { error: skillsError } = await supabase
        .from('developer_skills')
        .insert(
          skills.map(skill => ({
            developer_id: profile.id,
            skill_id: skill.id,
            proficiency: skill.proficiency
          }))
        );

      if (skillsError) throw skillsError;
    }

    // Update interests
    if (interests && interests.length > 0) {
      // Delete existing interests
      await supabase
        .from('developer_interests')
        .delete()
        .eq('developer_id', profile.id);

      // Insert new interests
      const { error: interestsError } = await supabase
        .from('developer_interests')
        .insert(
          interests.map(interest => ({
            developer_id: profile.id,
            interest_id: interest.id
          }))
        );

      if (interestsError) throw interestsError;
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search developers
router.get('/search', async (req, res) => {
  try {
    const {
      query,
      skills,
      interests,
      experience,
      page = 1,
      limit = 10
    } = req.query;

    // Convert query to PostgreSQL tsquery format
    const searchQuery = query
      ? query
          .trim()
          .split(/\s+/)
          .map(term => `${term}:*`)
          .join(' & ')
      : null;

    // Parse array parameters
    const skillFilter = skills ? skills.split(',') : null;
    const interestFilter = interests ? interests.split(',') : null;
    const experienceFilter = experience ? experience.split(',') : null;

    const { data, error } = await supabase
      .rpc('search_developers', {
        search_query: searchQuery,
        skill_filter: skillFilter,
        interest_filter: interestFilter,
        experience_filter: experienceFilter,
        page_number: parseInt(page),
        page_size: parseInt(limit)
      });

    if (error) throw error;

    res.json({
      results: data,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available skills
router.get('/skills', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available interests
router.get('/interests', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('interests')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 