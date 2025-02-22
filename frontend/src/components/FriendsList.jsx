import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './FriendsList.css';

const FriendsList = () => {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' or 'requests'

  useEffect(() => {
    fetchFriendsAndRequests();
  }, []);

  const fetchFriendsAndRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch friends
      const { data: friendsData, error: friendsError } = await supabase
        .from('user_friends')
        .select('*')
        .order('username');

      if (friendsError) throw friendsError;

      // Fetch pending friend requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('friend_requests')
        .select(`
          id,
          sender:sender_id (id, username, avatar_url),
          status,
          created_at
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      setFriends(friendsData || []);
      setPendingRequests(requestsData || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
      setError('Failed to load friends and requests');
    } finally {
      setLoading(false);
    }
  };

  const handleFriendRequest = async (requestId, accept) => {
    try {
      setError(null);
      const { error } = await supabase.rpc('handle_friend_request', {
        request_id: requestId,
        accept_request: accept
      });

      if (error) throw error;

      // Refresh the lists
      fetchFriendsAndRequests();
    } catch (error) {
      console.error('Error handling friend request:', error);
      setError('Failed to process friend request');
    }
  };

  const removeFriend = async (friendId) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`user_id.eq.${friendId},friend_id.eq.${friendId}`);

      if (error) throw error;

      // Update friends list
      setFriends(friends.filter(friend => friend.id !== friendId));
    } catch (error) {
      console.error('Error removing friend:', error);
      setError('Failed to remove friend');
    }
  };

  if (loading) {
    return (
      <div className="friends-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="friends-container">
      <div className="friends-header">
        <h1>Friends & Requests</h1>
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            Friends ({friends.length})
          </button>
          <button 
            className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Requests ({pendingRequests.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="friends-content">
        {activeTab === 'friends' ? (
          <div className="friends-list">
            {friends.length === 0 ? (
              <div className="empty-state">
                <p>You haven't added any friends yet.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => window.location.href = '/developers'}
                >
                  Find Developers
                </button>
              </div>
            ) : (
              friends.map(friend => (
                <div key={friend.id} className="friend-card">
                  <img 
                    src={friend.avatar_url || 'https://via.placeholder.com/50'} 
                    alt={friend.username}
                    className="friend-avatar"
                  />
                  <div className="friend-info">
                    <h3>{friend.full_name || friend.username}</h3>
                    <p className="friend-username">@{friend.username}</p>
                  </div>
                  <div className="friend-actions">
                    <button 
                      className="btn btn-primary"
                      onClick={() => window.location.href = `/profile/${friend.id}`}
                    >
                      View Profile
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => removeFriend(friend.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="requests-list">
            {pendingRequests.length === 0 ? (
              <div className="empty-state">
                <p>No pending friend requests.</p>
              </div>
            ) : (
              pendingRequests.map(request => (
                <div key={request.id} className="request-card">
                  <img 
                    src={request.sender.avatar_url || 'https://via.placeholder.com/50'} 
                    alt={request.sender.username}
                    className="friend-avatar"
                  />
                  <div className="request-info">
                    <h3>{request.sender.username}</h3>
                    <p className="request-time">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="request-actions">
                    <button 
                      className="btn btn-success"
                      onClick={() => handleFriendRequest(request.id, true)}
                    >
                      Accept
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleFriendRequest(request.id, false)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsList; 