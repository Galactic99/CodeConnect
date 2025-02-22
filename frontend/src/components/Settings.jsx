import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Select from 'react-select';
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

  const [availableSkills, setAvailableSkills] = useState([]);
  const [availableInterests, setAvailableInterests] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);

  useEffect(() => {
    fetchProfile();
    fetchAvailableSkills();
    fetchAvailableInterests();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // First get the developer profile ID
      const { data: devProfile, error: devProfileError } = await supabase
        .from('developer_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (devProfileError && devProfileError.code !== 'PGRST116') {
        throw devProfileError;
      }

      if (devProfile) {
        // Fetch skills with proficiency
        const { data: skillsData, error: skillsError } = await supabase
          .from('developer_skills')
          .select(`
            skill_id,
            proficiency,
            skills (
              id,
              name,
              category
            )
          `)
          .eq('developer_id', devProfile.id);

        if (skillsError) throw skillsError;

        // Fetch interests
        const { data: interestsData, error: interestsError } = await supabase
          .from('developer_interests')
          .select(`
            interest_id,
            interests (
              id,
              name,
              category
            )
          `)
          .eq('developer_id', devProfile.id);

        if (interestsError) throw interestsError;

        // Transform skills and interests data
        const transformedSkills = skillsData?.map(ds => ({
          value: ds.skill_id,
          label: ds.skills.name,
          category: ds.skills.category,
          proficiency: ds.proficiency
        })) || [];

        const transformedInterests = interestsData?.map(di => ({
          value: di.interest_id,
          label: di.interests.name,
          category: di.interests.category
        })) || [];

        setSelectedSkills(transformedSkills);
        setSelectedInterests(transformedInterests);

        console.log('Fetched Skills:', transformedSkills);
        console.log('Fetched Interests:', transformedInterests);
      }

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

  const fetchAvailableSkills = async () => {
    try {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('name');

      if (error) throw error;

      setAvailableSkills(
        data.map(skill => ({
          value: skill.id,
          label: skill.name,
          category: skill.category
        }))
      );
    } catch (error) {
      console.error('Error fetching skills:', error);
      setError('Failed to load available skills');
    }
  };

  const fetchAvailableInterests = async () => {
    try {
      const { data, error } = await supabase
        .from('interests')
        .select('*')
        .order('name');

      if (error) throw error;

      setAvailableInterests(
        data.map(interest => ({
          value: interest.id,
          label: interest.name,
          category: interest.category
        }))
      );
    } catch (error) {
      console.error('Error fetching interests:', error);
      setError('Failed to load available interests');
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

      // Update skills
      if (selectedSkills.length > 0) {
        // Delete existing skills
        await supabase
          .from('developer_skills')
          .delete()
          .eq('developer_id', existingDevProfile.id);

        // Insert new skills
        const { error: skillsError } = await supabase
          .from('developer_skills')
          .insert(
            selectedSkills.map(skill => ({
              developer_id: existingDevProfile.id,
              skill_id: skill.value,
              proficiency: skill.proficiency || 1
            }))
          );

        if (skillsError) throw skillsError;
      }

      // Update interests
      if (selectedInterests.length > 0) {
        // Delete existing interests
        await supabase
          .from('developer_interests')
          .delete()
          .eq('developer_id', existingDevProfile.id);

        // Insert new interests
        const { error: interestsError } = await supabase
          .from('developer_interests')
          .insert(
            selectedInterests.map(interest => ({
              developer_id: existingDevProfile.id,
              interest_id: interest.value
            }))
          );

        if (interestsError) throw interestsError;
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

  const handleSkillChange = (selectedOptions) => {
    setSelectedSkills(selectedOptions || []);
  };

  const handleSkillProficiencyChange = (skillId, newProficiency) => {
    setSelectedSkills(prevSkills =>
      prevSkills.map(skill =>
        skill.value === skillId
          ? { ...skill, proficiency: parseInt(newProficiency) }
          : skill
      )
    );
  };

  const handleInterestChange = (selectedOptions) => {
    setSelectedInterests(selectedOptions || []);
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

            <div className="form-section skills-interests">
              <h2>Skills & Interests</h2>
              
              <div className="skills-section">
                <div className="skills-section-header">
                  <label>Skills</label>
                  <span className="helper-text">(Select skills and set proficiency levels)</span>
                </div>
                <Select
                  isMulti
                  options={availableSkills}
                  value={selectedSkills}
                  onChange={handleSkillChange}
                  className="react-select"
                  placeholder="Search or select skills..."
                  noOptionsMessage={() => "No matching skills found"}
                />
                {selectedSkills.map(skill => (
                  <div key={skill.value} className="skill-proficiency-input">
                    <label>{skill.label}</label>
                    <select
                      value={skill.proficiency || 1}
                      onChange={(e) => handleSkillProficiencyChange(skill.value, e.target.value)}
                    >
                      <option value="1">Beginner</option>
                      <option value="2">Elementary</option>
                      <option value="3">Intermediate</option>
                      <option value="4">Advanced</option>
                      <option value="5">Expert</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="interests-section">
                <div className="interests-section-header">
                  <label>Interests</label>
                  <span className="helper-text">(Select areas that interest you)</span>
                </div>
                <Select
                  isMulti
                  options={availableInterests}
                  value={selectedInterests}
                  onChange={handleInterestChange}
                  className="react-select"
                  placeholder="Search or select interests..."
                  noOptionsMessage={() => "No matching interests found"}
                />
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