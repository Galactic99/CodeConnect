import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Settings.css';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'account', or 'preferences'
  
  const [profile, setProfile] = useState({
    username: '',
    full_name: '',
    avatar_url: '',
    bio: '',
    github_url: '',
    linkedin_url: '',
    website_url: '',
    experience_level: 'Beginner',
    available_for_hire: true
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Try to fetch the profile with joined developer_profiles data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          full_name,
          avatar_url,
          bio,
          experience_level,
          github_url,
          linkedin_url,
          website_url,
          available_for_hire,
          created_at,
          updated_at,
          developer_profiles (
            id,
            experience_level,
            bio,
            github_url,
            linkedin_url,
            website_url,
            available_for_hire,
            avatar_url
          )
        `)
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Create initial profile if it doesn't exist
        const timestamp = new Date().toISOString();
        const newProfile = {
          id: user.id,
          username: `user_${user.id.slice(0, 8)}`,
          full_name: '',
          avatar_url: '',
          bio: '',
          created_at: timestamp,
          updated_at: timestamp
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();

        if (createError) throw createError;

        // Create initial developer profile
        const newDevProfile = {
          user_id: user.id,
          experience_level: 'Beginner',
          bio: '',
          github_url: '',
          linkedin_url: '',
          website_url: '',
          avatar_url: '',
          available_for_hire: true,
          created_at: timestamp,
          updated_at: timestamp
        };

        const { error: devProfileError } = await supabase
          .from('developer_profiles')
          .insert([newDevProfile]);

        if (devProfileError) throw devProfileError;

        // Set the initial profile state
        setProfile({
          ...newProfile,
          ...newDevProfile
        });
      } else if (profileError) {
        throw profileError;
      } else {
        // Merge profile and developer profile data
        const mergedProfile = {
          ...profileData,
          ...(profileData.developer_profiles?.[0] || {}),
        };
        
        // Update the state with merged data
        setProfile(mergedProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const timestamp = new Date().toISOString();

      // Prepare updates for profiles table
      const profileUpdates = {
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        experience_level: profile.experience_level,
        github_url: profile.github_url,
        linkedin_url: profile.linkedin_url,
        website_url: profile.website_url,
        available_for_hire: profile.available_for_hire,
        updated_at: timestamp
      };

      // Log the updates for debugging
      console.log('Updating profiles table with:', profileUpdates);

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw new Error('Failed to update profile information');
      }

      // Prepare updates for developer_profiles table
      const devProfileUpdates = {
        bio: profile.bio,
        experience_level: profile.experience_level || 'Beginner',
        github_url: profile.github_url || '',
        linkedin_url: profile.linkedin_url || '',
        website_url: profile.website_url || '',
        available_for_hire: profile.available_for_hire,
        avatar_url: profile.avatar_url,
        updated_at: timestamp
      };

      // Log the updates for debugging
      console.log('Updating developer_profiles table with:', devProfileUpdates);

      // Check if developer profile exists
      const { data: existingDevProfile, error: checkError } = await supabase
        .from('developer_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError; // Handle other errors
      }

      if (existingDevProfile) {
        // Update existing developer profile
        const { error: updateError } = await supabase
          .from('developer_profiles')
          .update(devProfileUpdates)
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Developer profile update error:', updateError);
          throw new Error('Failed to update developer profile');
        }
      } else {
        // Create new developer profile
        const { error: insertError } = await supabase
          .from('developer_profiles')
          .insert({
            user_id: user.id,
            ...devProfileUpdates,
            created_at: timestamp
          });

        if (insertError) {
          console.error('Developer profile insert error:', insertError);
          throw new Error('Failed to create developer profile');
        }
      }

      // Refresh the profile data to ensure UI is in sync
      await fetchProfile();
      setSuccess('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error.message.includes('duplicate key')) {
        setError('A user with this username already exists. Please choose a different username.');
      } else if (error.message.includes('not-null')) {
        setError('Please fill in all required fields.');
      } else {
        setError(error.message || 'Failed to update profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button 
            className={`tab ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            Account
          </button>
          <button 
            className={`tab ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            Preferences
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      <div className="settings-content">
        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit} className="settings-form">
            <div className="form-section">
              <h2>Basic Information</h2>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={profile.username}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="full_name">Full Name</label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={profile.full_name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={profile.bio}
                  onChange={handleChange}
                  rows="4"
                />
              </div>
            </div>

            <div className="form-section">
              <h2>Professional Details</h2>
              <div className="form-group">
                <label htmlFor="experience_level">Experience Level</label>
                <select
                  id="experience_level"
                  name="experience_level"
                  value={profile.experience_level}
                  onChange={handleChange}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="github_url">GitHub Profile</label>
                <input
                  type="url"
                  id="github_url"
                  name="github_url"
                  value={profile.github_url}
                  onChange={handleChange}
                  placeholder="https://github.com/username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="linkedin_url">LinkedIn Profile</label>
                <input
                  type="url"
                  id="linkedin_url"
                  name="linkedin_url"
                  value={profile.linkedin_url}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="website_url">Personal Website</label>
                <input
                  type="url"
                  id="website_url"
                  name="website_url"
                  value={profile.website_url}
                  onChange={handleChange}
                  placeholder="https://yourwebsite.com"
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="available_for_hire"
                    checked={profile.available_for_hire}
                    onChange={handleChange}
                  />
                  Available for Hire
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'account' && (
          <div className="account-settings">
            <div className="form-section">
              <h2>Account Settings</h2>
              <p>Email and password settings coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="preferences-settings">
            <div className="form-section">
              <h2>Preferences</h2>
              <p>Notification and theme preferences coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings; 