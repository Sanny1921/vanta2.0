import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import socketManager from './managers/SocketManager.js';
import lifecycleManager from './managers/LifecycleManager.js';
import voiceRoutes from './routes/voiceRoutes.js';
import { clearAllVoiceFiles } from './utils/voiceCleanup.js';

const PORT = process.env.PORT || 3001;
const app = express();
const server = createServer(app);

// Setup CORS for Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Mount voice message API routes
app.use('/api', voiceRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Setup Socket.IO events
socketManager.setupSocketEvents(io);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  lifecycleManager.cleanupAll();
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});

// Perform startup sweep of temporary audio files
clearAllVoiceFiles();

// Start server
server.listen(PORT, () => {
  console.log(`[Server] Vanta server running on port ${PORT}`);
  console.log(`[Server] Client URL: ${process.env.CLIENT_URL || 'Any (Development fallback)'}`);
});



