/**
 * Express App Setup
 * Main application configuration and middleware
 */

import express, { Express } from 'express';
import path from 'path';
import sessionRoutes from './routes/sessionRoutes';
import { rateLimiter } from './middleware/rateLimiter';
import { sanitizeBody, validateRequestSize } from './middleware/sanitizer';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { startCleanupTimer, stopCleanupTimer } from './store/sessionStore';

const app: Express = express();

// Trust proxy (important if behind reverse proxy for correct IPs)
app.set('trust proxy', 1);

// CORS middleware (simple for hackathon - allow all origins)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Request size limits (JSON body parser with size limit)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request validation middleware
app.use(validateRequestSize);

// Input sanitization middleware
app.use(sanitizeBody);

// Rate limiting middleware
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/session', sessionRoutes);

// Serve frontend static files (relative to project root)
const frontendPublicPath = path.join(process.cwd(), 'src', 'frontend', 'public');
const frontendSrcPath = path.join(process.cwd(), 'src', 'frontend', 'src');

app.use(express.static(frontendPublicPath));
app.use('/src', express.static(frontendSrcPath));

// Serve index.html for all other routes (SPA fallback) - must be before 404 handler
app.get('*', (req, res, next) => {
  // Only serve HTML for non-API routes
  if (!req.path.startsWith('/session') && !req.path.startsWith('/health') && !req.path.startsWith('/src')) {
    res.sendFile(path.join(frontendPublicPath, 'index.html'));
  } else {
    next();
  }
});

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start cleanup timer for session store
startCleanupTimer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  stopCleanupTimer();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  stopCleanupTimer();
  process.exit(0);
});

export default app;
