import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import DeveloperSearch from './components/DeveloperSearch';
import Settings from './components/Settings';
import Editor from './components/Editor';
import Auth from './components/Auth';
import Profile from './components/Profile';
import FriendsList from './components/FriendsList';
import './App.css';

// Wrapper for Editor component to get URL params
const EditorWrapper = () => {
  const { sessionId } = useParams();
  return <Editor sessionId={sessionId} />;
};

function App() {
  const [session, setSession] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Set initial theme
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // The session will be automatically cleared and the user redirected
      // to the login page due to the auth state change listener
    } catch (error) {
      console.error('Error logging out:', error.message);
    }
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <Router>
      <div className="app-container">
        <nav className="main-nav">
          <div className="nav-content">
            <Link to="/" className="nav-logo">
              CodeConnect
            </Link>
            <div className="nav-links">
              <Link to="/developers" className="btn btn-ghost">
                Find Developers
              </Link>
              <Link to="/friends" className="btn btn-ghost">
                Friends
              </Link>
              <Link to="/settings" className="btn btn-ghost">
                Settings
              </Link>
              <Link to="/collaborate" className="btn btn-ghost">
                Code Together
              </Link>
              <button 
                onClick={toggleTheme} 
                className="btn btn-ghost theme-toggle"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <button 
                onClick={handleLogout}
                className="btn btn-ghost logout-button"
                aria-label="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={
              <div className="home-container">
                <h1>Welcome to CodeConnect</h1>
                <p>Connect with developers and code together in real-time</p>
                <div className="home-buttons">
                  <Link to="/developers" className="btn btn-primary">
                    Find Developers
                  </Link>
                  <Link to="/collaborate" className="btn btn-primary">
                    Start Coding
                  </Link>
                  <Link to="/settings" className="btn btn-secondary">
                    Profile Settings
                  </Link>
                </div>
                
                <div className="glowing-button-container">
                  <Link to="/match" className="glowing-button">
                    Find Your Match
                    <span className="glowing-border"></span>
                  </Link>
                </div>

                <div className="features-grid">
                  <div className="feature-card card">
                    <h3>Find Collaborators</h3>
                    <p>Connect with developers who share your interests and skills</p>
                  </div>
                  <div className="feature-card card">
                    <h3>Real-time Collaboration</h3>
                    <p>Code together in real-time with built-in video and chat</p>
                  </div>
                  <div className="feature-card card">
                    <h3>Multiple Languages</h3>
                    <p>Support for all major programming languages</p>
                  </div>
                </div>
              </div>
            } />
            <Route path="/developers" element={<DeveloperSearch />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/friends" element={<FriendsList />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/collaborate" element={
              <div className="collaborate-container">
                <h2>Start Coding Together</h2>
                <div className="session-options">
                  <div className="session-card card">
                    <h3>Create New Session</h3>
                    <Link to={`/session/${Date.now()}`} className="btn btn-primary">
                      Create Session
                    </Link>
                  </div>
                  <div className="session-card card">
                    <h3>Join Existing Session</h3>
                    <div className="join-session-container">
                      <input 
                        type="text" 
                        placeholder="Enter session ID"
                        className="input"
                        id="sessionInput"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            window.location.href = `/session/${e.target.value}`;
                          }
                        }}
                      />
                      <button 
                        className="btn btn-primary"
                        onClick={() => {
                          const sessionId = document.getElementById('sessionInput').value;
                          if (sessionId) {
                            window.location.href = `/session/${sessionId}`;
                          }
                        }}
                      >
                        Join
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            } />
            <Route path="/session/:sessionId" element={<EditorWrapper />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;