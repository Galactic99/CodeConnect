import { useState, useEffect } from 'react';
import * as Y from 'yjs';

const Chat = ({ ydoc }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const ychat = ydoc.getText('chat');

  useEffect(() => {
    const updateChat = () => {
      setMessages(ychat.toString().split('\n').filter(m => m));
    };

    ychat.observe(updateChat);
    return () => ychat.unobserve(updateChat);
  }, [ychat]);

  const sendMessage = () => {
    if (message.trim()) {
      ychat.insert(ychat.length, `\n${message}`);
      setMessage('');
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className="message">
            {msg}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default Chat;