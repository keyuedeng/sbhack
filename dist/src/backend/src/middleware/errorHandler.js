"use strict";
/**
 * Error Handling Middleware
 * Catches errors and returns appropriate HTTP responses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
function errorHandler(err, req, res, next) {
    console.error('Error:', err);
    // Default error response
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
}
function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'Not found',
        path: req.path
    });
}
