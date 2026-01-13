"use strict";
/**
 * Rate Limiting Middleware
 * Basic in-memory rate limiting for hackathon MVP
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = rateLimiter;
// Simple in-memory rate limiter
const requestCounts = new Map();
// Configuration
const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 100; // Max 100 requests per minute per IP
/**
 * Basic rate limiter middleware
 * Limits requests per IP address
 */
function rateLimiter(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    // Get or create rate limit entry for this IP
    let entry = requestCounts.get(ip);
    if (!entry || now > entry.resetTime) {
        // Create new window
        entry = {
            count: 1,
            resetTime: now + WINDOW_MS
        };
        requestCounts.set(ip, entry);
        next();
        return;
    }
    // Increment counter
    entry.count++;
    if (entry.count > MAX_REQUESTS) {
        res.status(429).json({
            error: 'Too many requests',
            message: `Rate limit exceeded. Maximum ${MAX_REQUESTS} requests per minute.`
        });
        return;
    }
    next();
}
/**
 * Clean up old entries periodically (every 5 minutes)
 */
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of requestCounts.entries()) {
        if (now > entry.resetTime) {
            requestCounts.delete(ip);
        }
    }
}, 5 * 60 * 1000);
