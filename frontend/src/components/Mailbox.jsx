import { useEffect, useState } from 'react';
import { getPendingFriendRequests, respondToFriendRequest } from '../lib/supabase';

const Mailbox = () => {
  const [friendRequests, setFriendRequests] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFriendRequests = async () => {
      try {
        const requests = await getPendingFriendRequests();
        setFriendRequests(requests);
      } catch (err) {
        setError('Failed to load friend requests');
      }
    };

    fetchFriendRequests();
  }, []);

  const handleAccept = async (requestId) => {
    try {
      await respondToFriendRequest(requestId, true);
      setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      setError('Failed to accept friend request');
    }
  };

  const handleReject = async (requestId) => {
    try {
      await respondToFriendRequest(requestId, false);
      setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      setError('Failed to reject friend request');
    }
  };

  return (
    <div className="mailbox-container">
      <h2>Friend Requests</h2>
      {error && <div className="error-message">{error}</div>}
      {friendRequests.length === 0 ? (
        <p>No friend requests.</p>
      ) : (
        <ul className="friend-requests-list">
          {friendRequests.map((request) => (
            <li key={request.id} className="friend-request-item">
              <span>{request.sender.username}</span>
              <div className="request-actions">
                <button onClick={() => handleAccept(request.id)}>Accept</button>
                <button onClick={() => handleReject(request.id)}>Reject</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Mailbox; 