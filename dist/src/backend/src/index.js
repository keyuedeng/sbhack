"use strict";
/**
 * Backend Server Entry Point
 * Starts the Express server for the medical simulation platform
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables from .env file
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const transcribeWs_1 = require("./ws/transcribeWs");
const PORT = process.env.PORT || 3000;
const server = http_1.default.createServer(app_1.default);
// Attach WebSocket server for streaming transcription
(0, transcribeWs_1.attachTranscribeWs)(server);
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
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    server.close(() => {
        process.exit(1);
    });
});
// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});
