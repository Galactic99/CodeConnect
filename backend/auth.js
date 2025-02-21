const express = require('express');
const supabase = require('./supabase');
const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  const { email, password, username, skills } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, skills },
    },
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({ user: data.user });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  res.status(200).json({ user: data.user });
});

// Logout
router.post('/logout', async (req, res) => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;