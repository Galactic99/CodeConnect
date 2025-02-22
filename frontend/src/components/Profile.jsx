import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  getProfile,
  getFriends,
  sendFriendRequest,
  respondToFriendRequest
} from '../lib/supabase';

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    full_name: '',
    bio: ''
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [friendshipStatus, setFriendshipStatus] = useState('not_friend');

  useEffect(() => {
    const loadProfileData = async () => {
      console.log('Loading profile for user ID:', id); // Debug log
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
        console.log('Profile data fetched:', profileData); // Debug log
        setProfile(profileData);
        
        if (profileData) {
          setEditForm({
            username: profileData.username || '',
            full_name: profileData.full_name || '',
            bio: profileData.bio || ''
          });

          // Load friends if viewing own profile
          if (user.id === id) {
            const friendsData = await getFriends();
            setFriends(friendsData || []);
          }

          // Check friendship status
          const { data: friendshipData } = await supabase
            .from('friendships')
            .select('*')
            .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
            .or(`user_id.eq.${id},friend_id.eq.${id}`)
            .single();

          if (friendshipData) {
            setFriendshipStatus('friend');
          } else {
            // Check for friend requests
            const { data: requestData } = await supabase
              .from('friend_requests')
              .select('*')
              .or(`sender_id.eq.${user.id}.and.receiver_id.eq.${id},sender_id.eq.${id}.and.receiver_id.eq.${user.id}`)
              .eq('status', 'pending')
              .single();

            if (requestData) {
              setFriendshipStatus(requestData.sender_id === user.id ? 'request_sent' : 'request_received');
            }
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, [id, navigate]);

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('profiles')
        .update(editForm)
        .eq('id', currentUser.id);

      if (updateError) throw updateError;
      
      setProfile({ ...profile, ...editForm });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    }
  };

  const handleConnect = async () => {
    try {
      setError(null);
      await sendFriendRequest(id);
      setFriendshipStatus('request_sent'); // Update status to reflect the sent request
    } catch (err) {
      console.error('Error sending friend request:', err);
      setError('Failed to send friend request');
    }
  };

  const handleAcceptRequest = async () => {
    try {
      setError(null);
      await respondToFriendRequest(id, true);
      setFriendshipStatus('friend');
      // Refresh friends list
      const friendsData = await getFriends();
      setFriends(friendsData || []);
    } catch (err) {
      console.error('Error accepting friend request:', err);
      setError('Failed to accept friend request');
    }
  };

  const handleMessage = () => {
    navigate(`/messages/${id}`);
  };

  if (isLoading) {
    return (
      <div className="profile-container">
        <div className="profile-box">
          <div className="loading">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-container">
        <div className="profile-box">
          <div className="error-message">Profile not found</div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === id;

  return (
    <div className="profile-container">
      <div className="profile-box">
        {error && <div className="error-message">{error}</div>}
        
        <div className="profile-header">
          <div className="profile-avatar">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} />
            ) : (
              <div className="avatar-placeholder">
                {profile.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="profile-info">
            <h1>{profile.username}</h1>
            {profile.full_name && <h2>{profile.full_name}</h2>}
            {profile.bio && <p className="bio">{profile.bio}</p>}
            
            <div className="skills-section">
              <h3>Skills</h3>
              {profile.skills && profile.skills.length > 0 ? (
                <ul className="skills-list">
                  {profile.skills.map((skill, index) => (
                    <li key={index} className="skill-item">{skill}</li>
                  ))}
                </ul>
              ) : (
                <p>No skills added yet.</p>
              )}
            </div>
            
            <div className="profile-actions">
              {isOwnProfile ? (
                <button
                  className="action-button primary"
                  onClick={() => navigate('/settings')}
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  {friendshipStatus === 'not_friend' && (
                    <button
                      className="action-button primary"
                      onClick={handleConnect}
                    >
                      Connect
                    </button>
                  )}
                  {friendshipStatus === 'friend' && (
                    <button
                      className="action-button"
                      onClick={handleMessage}
                    >
                      Message
                    </button>
                  )}
                  {friendshipStatus === 'request_sent' && (
                    <span className="status-text">Request Sent</span>
                  )}
                  {friendshipStatus === 'request_received' && (
                    <button
                      className="action-button primary"
                      onClick={handleAcceptRequest}
                    >
                      Accept Request
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {isOwnProfile && friends.length > 0 && (
          <div className="profile-friends">
            <h3>Friends</h3>
            <div className="friends-grid">
              {friends.map((friend) => (
                <div key={friend.id} className="friend-card" onClick={() => navigate(`/profile/${friend.id}`)}>
                  <div className="friend-avatar">
                    {friend.avatar_url ? (
                      <img src={friend.avatar_url} alt={friend.username} />
                    ) : (
                      <div className="avatar-placeholder">
                        {friend.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="friend-name">{friend.username}</span>
                </div>
              ))}
            </div>
          </div>
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

export default Profile; 