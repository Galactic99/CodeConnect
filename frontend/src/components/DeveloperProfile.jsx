import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { supabase } from '../supabaseClient';
import './DeveloperProfile.css';

const DeveloperProfile = () => {
  const [profile, setProfile] = useState({
    experience_level: '',
    bio: '',
    github_url: '',
    linkedin_url: '',
    website_url: '',
    skills: [],
    interests: []
  });

  const [availableSkills, setAvailableSkills] = useState([]);
  const [availableInterests, setAvailableInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const experienceLevels = [
    { value: 'Beginner', label: 'Beginner' },
    { value: 'Intermediate', label: 'Intermediate' },
    { value: 'Advanced', label: 'Advanced' }
  ];

  useEffect(() => {
    fetchProfile();
    fetchSkillsAndInterests();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: profile, error: profileError } = await fetch(
        `/api/developers/profile/${user.id}`
      ).then(res => res.json());

      if (profileError) throw profileError;

      if (profile) {
        setProfile({
          experience_level: profile.experience_level,
          bio: profile.bio || '',
          github_url: profile.github_url || '',
          linkedin_url: profile.linkedin_url || '',
          website_url: profile.website_url || '',
          skills: profile.skills?.map(s => ({
            value: s.skill.id,
            label: s.skill.name,
            proficiency: s.proficiency
          })) || [],
          interests: profile.interests?.map(i => ({
            value: i.interest.id,
            label: i.interest.name
          })) || []
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage({ text: 'Error loading profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSkillsAndInterests = async () => {
    try {
      const [skillsRes, interestsRes] = await Promise.all([
        fetch('/api/developers/skills'),
        fetch('/api/developers/interests')
      ]);

      const skillsData = await skillsRes.json();
      const interestsData = await interestsRes.json();

      setAvailableSkills(
        skillsData.map(skill => ({
          value: skill.id,
          label: skill.name
        }))
      );

      setAvailableInterests(
        interestsData.map(interest => ({
          value: interest.id,
          label: interest.name
        }))
      );
    } catch (error) {
      console.error('Error fetching skills and interests:', error);
      setMessage({ text: 'Error loading skills and interests', type: 'error' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const response = await fetch('/api/developers/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: user.id,
          ...profile,
          skills: profile.skills.map(skill => ({
            id: skill.value,
            proficiency: skill.proficiency || 3
          })),
          interests: profile.interests.map(interest => ({
            id: interest.value
          }))
        })
      });

      if (!response.ok) throw new Error('Failed to update profile');

      setMessage({ text: 'Profile updated successfully', type: 'success' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ text: 'Error updating profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="developer-profile-container">
      <h2>Developer Profile</h2>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label>Experience Level</label>
          <Select
            options={experienceLevels}
            value={experienceLevels.find(el => el.value === profile.experience_level)}
            onChange={(selected) => setProfile(prev => ({
              ...prev,
              experience_level: selected.value
            }))}
            className="react-select"
          />
        </div>

        <div className="form-group">
          <label>Bio</label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile(prev => ({
              ...prev,
              bio: e.target.value
            }))}
            placeholder="Tell us about yourself..."
            rows={4}
          />
        </div>

        <div className="form-group">
          <label>Skills</label>
          <Select
            isMulti
            options={availableSkills}
            value={profile.skills}
            onChange={(selected) => setProfile(prev => ({
              ...prev,
              skills: selected || []
            }))}
            className="react-select"
          />
        </div>

        <div className="form-group">
          <label>Interests</label>
          <Select
            isMulti
            options={availableInterests}
            value={profile.interests}
            onChange={(selected) => setProfile(prev => ({
              ...prev,
              interests: selected || []
            }))}
            className="react-select"
          />
        </div>

        <div className="form-group">
          <label>GitHub URL</label>
          <input
            type="url"
            value={profile.github_url}
            onChange={(e) => setProfile(prev => ({
              ...prev,
              github_url: e.target.value
            }))}
            placeholder="https://github.com/username"
          />
        </div>

        <div className="form-group">
          <label>LinkedIn URL</label>
          <input
            type="url"
            value={profile.linkedin_url}
            onChange={(e) => setProfile(prev => ({
              ...prev,
              linkedin_url: e.target.value
            }))}
            placeholder="https://linkedin.com/in/username"
          />
        </div>

        <div className="form-group">
          <label>Personal Website</label>
          <input
            type="url"
            value={profile.website_url}
            onChange={(e) => setProfile(prev => ({
              ...prev,
              website_url: e.target.value
            }))}
            placeholder="https://yourwebsite.com"
          />
        </div>

        <button type="submit" className="save-button" disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

export default DeveloperProfile; 