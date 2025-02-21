import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getProfile, updateProfile } from '../lib/supabase';

const Settings = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'security'
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [profileForm, setProfileForm] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: ''
  });

  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const initializeSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          navigate('/');
          return;
        }

        setCurrentUser(user);

        // Get profile data
        const profileData = await getProfile(user.id);
        if (profileData) {
          setProfileForm({
            username: profileData.username || '',
            full_name: profileData.full_name || '',
            bio: profileData.bio || '',
            avatar_url: profileData.avatar_url || ''
          });
          if (profileData.avatar_url) {
            setAvatarPreview(profileData.avatar_url);
          }
        }
      } catch (err) {
        console.error('Error initializing settings:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSettings();
  }, [navigate]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const preview = URL.createObjectURL(file);
      setAvatarPreview(preview);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !currentUser) return null;
    
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${currentUser.id}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let avatarUrl = profileForm.avatar_url;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      await updateProfile(currentUser.id, {
        ...profileForm,
        avatar_url: avatarUrl
      });

      setSuccess('Profile updated successfully');
      setAvatarFile(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (securityForm.newPassword !== securityForm.confirmPassword) {
        throw new Error('New passwords do not match');
      }

      const { error } = await supabase.auth.updateUser({
        password: securityForm.newPassword
      });

      if (error) throw error;

      setSuccess('Password updated successfully');
      setSecurityForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating password:', error);
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="settings-container">
        <div className="settings-box">
          <div className="loading">Loading settings...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="settings-container">
        <div className="settings-box">
          <div className="error-message">Please sign in to access settings</div>
          <div className="settings-footer">
            <button className="back-button" onClick={() => navigate('/')}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-box">
        <div className="settings-header">
          <h1>Settings</h1>
          <div className="tab-switcher">
            <button
              className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button
              className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              Security
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {activeTab === 'profile' ? (
          <form onSubmit={handleProfileSubmit} className="settings-form">
            <div className="avatar-section">
              <div className="avatar-preview">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" />
                ) : (
                  <div className="avatar-placeholder">
                    {profileForm.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="avatar-upload">
                <label className="upload-button" htmlFor="avatar">
                  Change Photo
                </label>
                <input
                  type="file"
                  id="avatar"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={profileForm.username}
                onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                rows={4}
              />
            </div>

            <button type="submit" className="submit-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSecuritySubmit} className="settings-form">
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                id="currentPassword"
                type="password"
                value={securityForm.currentPassword}
                onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                value={securityForm.newPassword}
                onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={securityForm.confirmPassword}
                onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="submit-button" disabled={isSaving}>
              {isSaving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        <div className="settings-footer">
          <button className="back-button" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings; 