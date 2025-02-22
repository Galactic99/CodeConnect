import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <h2>Navigation</h2>
      <ul>
        <li>
          <Link to="/friends">My Friends</Link>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar; 