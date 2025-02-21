import { useState } from 'react';
import { supabase } from '../supabaseClient';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('LOGIN');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: authError } =
        mode === 'LOGIN'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (authError) throw authError;
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>CodeConnect</h1>
          <p className="auth-subtitle">
            {mode === 'LOGIN'
              ? 'Sign in to your account'
              : 'Create a new account'}
          </p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading
              ? 'Loading...'
              : mode === 'LOGIN'
              ? 'Sign In'
              : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {mode === 'LOGIN'
              ? "Don't have an account?"
              : 'Already have an account?'}
            <button
              className="auth-switch"
              onClick={() => setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')}
            >
              {mode === 'LOGIN' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;