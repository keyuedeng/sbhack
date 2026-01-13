/**
 * Backend Server Entry Point
 * Starts the Express server for the medical simulation platform
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import { attachTranscribeWs } from './ws/transcribeWs';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Attach WebSocket server for streaming transcription
attachTranscribeWs(server);

server.listen(PORT, () => {
  console.log(`🚀 Medical Simulation Backend running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 API endpoints:`);
  console.log(`   POST /session/start`);
  console.log(`   POST /session/message`);
  console.log(`   POST /session/action`);
  console.log(`   GET  /session/export`);
  console.log(`   WS   /ws/transcribe (streaming transcription)`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
