import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import Editor from './components/Editor';
import Profile from './components/Profile';
import SessionManager from './components/SessionManager';
import Settings from './components/Settings';
import './styles.css';

// Wrapper component to get URL params
const EditorWrapper = () => {
  const { id } = useParams();
  return <Editor sessionId={id} />;
};

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={session ? <SessionManager /> : <Auth />} />
        <Route path="/session/:id" element={<EditorWrapper />} />
        <Route path="/profile/:id" element={session ? <Profile /> : <Auth />} />
        <Route path="/settings" element={session ? <Settings /> : <Auth />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;