"use strict";
/**
 * Express App Setup
 * Main application configuration and middleware
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const sessionRoutes_1 = __importDefault(require("./routes/sessionRoutes"));
const rateLimiter_1 = require("./middleware/rateLimiter");
const sanitizer_1 = require("./middleware/sanitizer");
const errorHandler_1 = require("./middleware/errorHandler");
const sessionStore_1 = require("./store/sessionStore");
const app = (0, express_1.default)();
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
app.use(express_1.default.json({ limit: '10kb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10kb' }));
// Request validation middleware
app.use(sanitizer_1.validateRequestSize);
// Input sanitization middleware
app.use(sanitizer_1.sanitizeBody);
// Rate limiting middleware
app.use(rateLimiter_1.rateLimiter);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API routes
app.use('/session', sessionRoutes_1.default);
// Serve frontend static files (relative to project root)
const frontendPublicPath = path_1.default.join(process.cwd(), 'src', 'frontend', 'public');
const frontendSrcPath = path_1.default.join(process.cwd(), 'src', 'frontend', 'src');
const backendPublicPath = path_1.default.join(process.cwd(), 'src', 'backend', 'public');
app.use(express_1.default.static(frontendPublicPath));
app.use('/src', express_1.default.static(frontendSrcPath));
app.use('/audio', express_1.default.static(path_1.default.join(backendPublicPath, 'audio')));
// Serve index.html for all other routes (SPA fallback) - must be before 404 handler
app.get('*', (req, res, next) => {
    // Only serve HTML for non-API routes
    if (!req.path.startsWith('/session') && !req.path.startsWith('/health') && !req.path.startsWith('/src') && !req.path.startsWith('/audio')) {
        res.sendFile(path_1.default.join(frontendPublicPath, 'index.html'));
    }
    else {
        next();
    }
});
// 404 handler (must be after all routes)
app.use(errorHandler_1.notFoundHandler);
// Error handler (must be last)
app.use(errorHandler_1.errorHandler);
// Start cleanup timer for session store
(0, sessionStore_1.startCleanupTimer)();
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    (0, sessionStore_1.stopCleanupTimer)();
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    (0, sessionStore_1.stopCleanupTimer)();
    process.exit(0);
});
exports.default = app;
