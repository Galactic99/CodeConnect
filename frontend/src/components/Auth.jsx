import { useState } from 'react';
import { supabase } from '../supabaseClient';
import './Auth.css';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('LOGIN');
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = () => {
    if (!email || !password) {
      setError('Email and password are required');
      return false;
    }
    
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (mode === 'SIGNUP' && !username) {
      setError('Username is required for signup');
      return false;
    }

    return true;
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'LOGIN') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        // Sign up with username in metadata
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
              full_name: '',
            },
          }
        });
        
        if (signUpError) throw signUpError;
        
        // Verify the signup was successful
        if (signUpData?.user) {
          try {
            // Force create profile if trigger didn't work
            const { error: profileError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: signUpData.user.id,
                  username: username,
                  full_name: '',
                  avatar_url: '',
                  bio: '',
                  created_at: new Date(),
                  updated_at: new Date()
                }
              ])
              .single();

            if (profileError) throw profileError;

            // Create developer profile
            const { data: devProfile, error: devProfileError } = await supabase
              .from('developer_profiles')
              .insert([
                {
                  user_id: signUpData.user.id,
                  experience_level: 'Beginner',
                  bio: '',
                  github_url: '',
                  linkedin_url: '',
                  website_url: '',
                  available_for_hire: false,
                  created_at: new Date(),
                  updated_at: new Date()
                }
              ])
              .select()
              .single();

            if (devProfileError) throw devProfileError;

            // Create search vectors
            if (devProfile) {
              const { error: searchVectorError } = await supabase
                .from('search_vectors')
                .insert([
                  {
                    developer_id: devProfile.id,
                    search_vector: '',
                    skills_vector: '',
                    interests_vector: '',
                    created_at: new Date(),
                    updated_at: new Date()
                  }
                ]);

              if (searchVectorError) throw searchVectorError;
            }

          } catch (error) {
            console.error('Error creating profile:', error);
            // Don't throw here, as the user is still created
          }
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <div className="logo-container">
            <div className="logo">CC</div>
            <h1>CodeConnect</h1>
          </div>
          <p className="auth-subtitle">
            {mode === 'LOGIN'
              ? 'Welcome back! Sign in to your account'
              : 'Join our community of developers'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-container">
              <i className="fas fa-envelope input-icon"></i>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {mode === 'SIGNUP' && (
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <div className="input-container">
                <i className="fas fa-user input-icon"></i>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-container">
              <i className="fas fa-lock input-icon"></i>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="button-content">
                <div className="spinner"></div>
                <span>{mode === 'LOGIN' ? 'Signing in...' : 'Creating account...'}</span>
              </div>
            ) : (
              <div className="button-content">
                <i className={`fas ${mode === 'LOGIN' ? 'fa-sign-in-alt' : 'fa-user-plus'}`}></i>
                <span>{mode === 'LOGIN' ? 'Sign In' : 'Sign Up'}</span>
              </div>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {mode === 'LOGIN'
              ? "Don't have an account?"
              : 'Already have an account?'}
            <button
              className="auth-switch"
              onClick={() => {
                setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN');
                setError(null);
                setUsername('');
              }}
            >
              {mode === 'LOGIN' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>

        <div className="auth-features">
          <div className="feature">
            <i className="fas fa-users"></i>
            <span>Connect with developers</span>
          </div>
          <div className="feature">
            <i className="fas fa-code"></i>
            <span>Code together in real-time</span>
          </div>
          <div className="feature">
            <i className="fas fa-project-diagram"></i>
            <span>Build amazing projects</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;