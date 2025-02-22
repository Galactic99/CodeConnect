import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  searchUsers,
  getPendingFriendRequests,
  sendFriendRequest as sendRequest,
  respondToFriendRequest
} from '../lib/supabase';
import Mailbox from './Mailbox';
import Sidebar from './Sidebar';

const SessionManager = () => {
  const [sessionId, setSessionId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('coding'); // 'coding' or 'social'
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFriendRequests();
  }, []);

  const fetchFriendRequests = async () => {
    try {
      const requests = await getPendingFriendRequests();
      setFriendRequests(requests);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      setError('Failed to load friend requests');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const createSession = () => {
    setIsCreating(true);
    try {
      const id = Math.random().toString(36).substr(2, 9);
      navigate(`/session/${id}`);
    } catch (error) {
      setIsCreating(false);
    }
  };

  const joinSession = (e) => {
    e.preventDefault();
    if (sessionId.trim()) {
      navigate(`/session/${sessionId}`);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      await sendRequest(userId);
      // Update the user's status in search results
      setSearchResults(prev =>
        prev.map(user =>
          user.id === userId
            ? { ...user, friendship_status: 'request_sent' }
            : user
        )
      );
    } catch (error) {
      console.error('Failed to send friend request:', error);
      setError('Failed to send friend request');
    }
  };

  const handleFriendRequest = async (requestId, accept) => {
    try {
      await respondToFriendRequest(requestId, accept);
      // Remove the request from the list
      setFriendRequests(prev =>
        prev.filter(request => request.id !== requestId)
      );
    } catch (error) {
      console.error('Failed to respond to friend request:', error);
      setError('Failed to respond to friend request');
    }
  };

  const viewProfile = (userId) => {
    navigate(`/profile/${userId}`);
  };

  const sendMessage = (userId) => {
    navigate(`/messages/${userId}`);
  };

  return (
    <div className="home-container">
      <Sidebar />
      <div className="home-content">
        <div className="home-box card">
          <h2>Create New Session</h2>
          <button
            className="create-session-button"
            onClick={createSession}
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create New Session'}
          </button>
        </div>

        <div className="home-box card">
          <h2>Join Existing Session</h2>
          <form onSubmit={joinSession} className="join-session-form">
            <div className="form-group">
              <label htmlFor="sessionId">Session ID</label>
              <input
                id="sessionId"
                placeholder="Enter session ID"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="join-session-button"
              disabled={!sessionId.trim()}
            >
              Join Session
            </button>
          </form>
        </div>

        <div className="home-box card">
          <h2>Manage Profile</h2>
          <button
            className="profile-button"
            onClick={() => navigate('/settings')}
          >
            Manage Profile
          </button>
        </div>

        <div className="home-box card">
          <h2>Search Developers</h2>
          <form onSubmit={handleSearch} className="search-form">
            <div className="form-group">
              <input
                type="text"
                placeholder="Search developers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <button
                type="submit"
                className="search-button"
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>
        </div>

        {error && <div className="error-message">{error}</div>}

        {activeTab === 'coding' ? (
          <div className="home-actions">
            <div className="session-divider">
              <span>OR</span>
            </div>
          </div>
        ) : (
          <div className="social-section">
            {searchResults.length > 0 && (
              <div className="search-results">
                <h3>Search Results</h3>
                <div className="user-list">
                  {searchResults.map((user) => (
                    <div key={user.id} className="user-card">
                      <div className="user-info">
                        <span className="username">{user.username}</span>
                        <div className="user-actions">
                          <button
                            className="action-button"
                            onClick={() => viewProfile(user.id)}
                          >
                            Profile
                          </button>
                          {user.friendship_status === 'not_friend' && (
                            <button
                              className="action-button primary"
                              onClick={() => sendFriendRequest(user.id)}
                            >
                              Add Friend
                            </button>
                          )}
                          {/* {user.friendship_status === 'friend' && (
                            <button
                              className="action-button"
                              onClick={() => sendMessage(user.id)}
                            >
                              Message
                            </button>
                          )} */}
                          {user.friendship_status === 'request_sent' && (
                            <span className="status-text">Request Sent</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {friendRequests.length > 0 && (
              <div className="friend-requests">
                <h3>Friend Requests</h3>
                <div className="user-list">
                  {friendRequests.map((request) => (
                    <div key={request.id} className="user-card">
                      <div className="user-info">
                        <span className="username">{request.sender.username}</span>
                        <div className="user-actions">
                          <button
                            className="action-button primary"
                            onClick={() => handleFriendRequest(request.id, true)}
                          >
                            Accept
                          </button>
                          <button
                            className="action-button secondary"
                            onClick={() => handleFriendRequest(request.id, false)}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Mailbox />

        <div className="home-footer">
          <button className="logout-button" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionManager;