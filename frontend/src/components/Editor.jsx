import React, { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { MonacoBinding } from 'y-monaco';
import MonacoEditor from 'react-monaco-editor';
import { Awareness } from 'y-protocols/awareness';
import Chat from './Chat';
import { supabase } from '../supabaseClient';

const Editor = ({ sessionId, currentUser }) => {
  const editorRef = useRef(null);
  const [ydoc] = useState(new Y.Doc());
  const [provider, setProvider] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const messagesEndRef = useRef(null);
  const [editorInstance, setEditorInstance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if session exists
        const { data: session, error: sessionError } = await supabase
          .from('coding_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError) {
          // If session doesn't exist, create it
          if (sessionError.code === 'PGRST116') {
            const { error: createError } = await supabase
              .from('coding_sessions')
              .insert({
                id: sessionId,
                created_by: currentUser.id,
                title: `Session ${sessionId}`
              });
            if (createError) throw createError;
          } else {
            throw sessionError;
          }
        }

        // Join session (add to participants)
        const { error: joinError } = await supabase
          .from('session_participants')
          .insert({
            session_id: sessionId,
            user_id: currentUser.id
          })
          .select()
          .single();

        // Ignore if already joined
        if (joinError && joinError.code !== '23505') {
          throw joinError;
        }

      } catch (err) {
        console.error('Error initializing session:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId && currentUser) {
      initializeSession();
    }
  }, [sessionId, currentUser]);

  useEffect(() => {
    if (!sessionId || !editorRef.current) return;

    const awareness = new Awareness(ydoc);
    const webrtcProvider = new WebrtcProvider(`codeconnect-${sessionId}`, ydoc, {
      signaling: ['ws://localhost:3000/signaling'],
      password: null,
      awareness
    });

    setProvider(webrtcProvider);

    const editor = editorRef.current;
    const type = ydoc.getText('monaco');
    
    const binding = new MonacoBinding(
      type,
      editor.getModel(),
      new Set([editor]),
      awareness
    );

    return () => {
      binding.destroy();
      webrtcProvider.destroy();
      ydoc.destroy();
    };
  }, [sessionId, ydoc]);

  useEffect(() => {
    const loadParticipants = async () => {
      try {
        const { data: sessionParticipants, error } = await supabase
          .from('session_participants')
          .select(`
            user_id,
            profiles:user_id (
              username,
              avatar_url
            )
          `)
          .eq('session_id', sessionId);

        if (error) throw error;
        setParticipants(sessionParticipants.map(p => p.profiles));
      } catch (error) {
        console.error('Error loading participants:', error);
      }
    };

    loadParticipants();
  }, [sessionId]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const { data: chatMessages, error } = await supabase
          .from('session_messages')
          .select(`
            *,
            profiles:user_id (
              username,
              avatar_url
            )
          `)
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(chatMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();

    const channel = supabase
      .channel(`session_${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_messages',
        filter: `session_id=eq.${sessionId}`,
      }, async (payload) => {
        // Fetch the complete message with user profile
        const { data: message, error } = await supabase
          .from('session_messages')
          .select(`
            *,
            profiles:user_id (
              username,
              avatar_url
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (!error) {
          setMessages(prev => [...prev, message]);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('session_messages')
        .insert({
          session_id: sessionId,
          user_id: currentUser.id,
          content: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <div className="editor-container">
        <div className="loading">Initializing session...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="editor-container">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="monaco-editor-container">
        <div className="session-header">
          <div className="session-info">
            <span className="session-id">Session #{sessionId}</span>
            <div className="participants">
              {participants.map((participant) => (
                <div key={participant.user_id} className="participant">
                  <div className="participant-avatar">
                    {participant.avatar_url ? (
                      <img src={participant.avatar_url} alt={participant.username} />
                    ) : (
                      participant.username[0].toUpperCase()
                    )}
                  </div>
                  <span>{participant.username}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <MonacoEditor
          width="100%"
          height="100%"
          language="javascript"
          theme="vs-dark"
          editorDidMount={(editor) => {
            editorRef.current = editor;
          }}
          options={{ 
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true
          }}
        />
      </div>

      <div className="chat-container">
        <div className="chat-header">
          <h3>Chat</h3>
        </div>
        <div className="messages">
          {messages.map((message) => (
            <div key={message.id} className="message">
              <div className="message-avatar">
                {message.profiles.avatar_url ? (
                  <img src={message.profiles.avatar_url} alt={message.profiles.username} />
                ) : (
                  message.profiles.username[0].toUpperCase()
                )}
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-username">{message.profiles.username}</span>
                  <span className="message-time">{formatTime(message.created_at)}</span>
                </div>
                <div className="message-text">{message.content}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form className="chat-input" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
          />
          <button type="submit" disabled={!newMessage.trim()}>Send</button>
        </form>
      </div>
    </div>
  );
};

export default Editor;