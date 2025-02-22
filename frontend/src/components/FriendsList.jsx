import { useEffect, useState } from 'react';
import { getFriends } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const FriendsList = () => {
  const [friends, setFriends] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const friendsData = await getFriends();
        setFriends(friendsData);
      } catch (err) {
        setError('Failed to load friends');
      }
    };

    fetchFriends();
  }, []);

  const handleProfileClick = (friendId) => {
    navigate(`/profile/${friendId}`);
  };

  return (
    <div className="friends-list-container">
      <h2>My Friends</h2>
      {error && <div className="error-message">{error}</div>}
      {friends.length === 0 ? (
        <p>No friends found.</p>
      ) : (
        <ul className="friends-list">
          {friends.map((friend) => (
            <li key={friend.id} className="friend-item" onClick={() => handleProfileClick(friend.id)}>
              <span>{friend.username}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FriendsList; 