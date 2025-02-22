import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  getProfile,
  getFriends,
  sendFriendRequest,
  respondToFriendRequest,
  getPendingFriendRequests
} from '../lib/supabase';
import './Profile.css';

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [friendshipStatus, setFriendshipStatus] = useState('not_friend');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'projects', 'activity'
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    loadProfileData();
  }, [id]);

  const loadProfileData = async () => {
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
      const profileData = await getProfile(id);
      setProfile(profileData);
      
      // Load friends and pending requests
      const friendsData = await getFriends();
      setFriends(friendsData || []);
      
      const requestsData = await getPendingFriendRequests();
      setPendingRequests(requestsData || []);
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      await sendFriendRequest(id);
      setFriendshipStatus('request_sent');
    } catch (error) {
      console.error('Error sending friend request:', error);
      if (error.message === 'Friend request already sent') {
        setError('You have already sent a friend request to this user');
      } else if (error.message === 'Already friends with this user') {
        setError('You are already friends with this user');
      } else {
        setError('Failed to send friend request. Please try again.');
      }
    }
  };

  const handleAcceptRequest = async () => {
    try {
      await respondToFriendRequest(id, true);
      setFriendshipStatus('friend');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      setError('Failed to accept friend request');
    }
  };

  const handleMessage = () => {
    navigate(`/messages/${id}`);
  };

  if (isLoading) {
    return (
      <div className="profile-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="error-container">
          <i className="fas fa-exclamation-circle"></i>
          <h2>Error Loading Profile</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === id;
  const isFriend = friends.some(friend => 
    friend.id === id || friend.friend_id === id || friend.user_id === id
  );
  const isRequestPending = pendingRequests.some(request => request.sender_id === currentUser.id && request.receiver_id === id);

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-cover">
          <div className="profile-avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} />
            ) : (
              <div className="avatar-placeholder">
                {profile?.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
        
        <div className="profile-info">
          <div className="profile-name-section">
            <h1>{profile?.username}</h1>
            {profile?.full_name && <h2>{profile.full_name}</h2>}
            <div className="profile-badges">
              {profile?.experience_level && (
                <span className="badge experience-badge">
                  <i className="fas fa-code"></i>
                  {profile.experience_level}
                </span>
              )}
              {profile?.available_for_hire && (
                <span className="badge hire-badge">
                  <i className="fas fa-briefcase"></i>
                  Available for Hire
                </span>
              )}
            </div>
          </div>

          <div className="profile-actions">
            {isOwnProfile ? (
              <button
                className="btn-primary"
                onClick={() => navigate('/settings')}
              >
                <i className="fas fa-edit"></i>
                Edit Profile
              </button>
            ) : (
              <div className="action-buttons">
                {!isRequestPending && !isFriend && (
                  <button
                    className="btn-primary"
                    onClick={handleConnect}
                  >
                    <i className="fas fa-user-plus"></i>
                    Connect
                  </button>
                )}
                {isFriend && (
                  <span className="status-text">
                    <i className="fas fa-user-friends"></i>
                    Friends ✅
                  </span>
                )}
                {isRequestPending && (
                  <span className="status-text">
                    <i className="fas fa-clock"></i>
                    Request Sent
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <i className="fas fa-user"></i>
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          <i className="fas fa-project-diagram"></i>
          Projects
        </button>
        <button
          className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <i className="fas fa-chart-line"></i>
          Activity
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'overview' && (
          <>
            <div className="profile-section">
              <h3>About</h3>
              <p className="bio">{profile?.bio || 'No bio available'}</p>
            </div>

            <div className="profile-section">
              <h3>Skills</h3>
              <div className="skills-grid">
                {profile?.skills && profile.skills.length > 0 ? (
                  profile.skills.map((skill, index) => (
                    <div key={index} className="skill-card">
                      <div className="skill-header">
                        <span className="skill-name">{skill.name}</span>
                        {skill.category && (
                          <span className="skill-category">{skill.category}</span>
                        )}
                      </div>
                      <div className="skill-proficiency">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <i
                            key={i}
                            className={`fas fa-star ${
                              i < skill.proficiency ? 'filled' : ''
                            }`}
                          ></i>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">No skills added yet</p>
                )}
              </div>
            </div>

            {isOwnProfile && friends.length > 0 && (
              <div className="profile-section">
                <h3>Friends</h3>
                <div className="friends-grid">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="friend-card"
                      onClick={() => navigate(`/profile/${friend.id}`)}
                    >
                      <div className="friend-avatar">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt={friend.username} />
                        ) : (
                          <div className="avatar-placeholder">
                            {friend.username[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="friend-info">
                        <span className="friend-name">{friend.username}</span>
                        {friend.experience_level && (
                          <span className="friend-level">
                            {friend.experience_level}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'projects' && (
          <div className="profile-section">
            <h3>Projects</h3>
            <p className="empty-state">Projects feature coming soon...</p>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="profile-section">
            <h3>Recent Activity</h3>
            <p className="empty-state">Activity tracking coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile; 