const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const supabase = require('./supabase');
const authRoutes = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/signaling' });

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  // Forward messages to all connected clients
  ws.on('message', (message) => {
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(message.toString());
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server is running on ws://localhost:${PORT}/signaling`);
});