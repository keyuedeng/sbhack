# How to Run the Medical Simulation Platform

This guide will help you get the application up and running.

## Prerequisites

- **Node.js** (v16 or higher recommended)
- **npm** (comes with Node.js)
- **OpenAI API Key** (for AI patient simulation)

## Setup Steps

### 1. Navigate to the project directory

```bash
cd sbhack
```

### 2. Install dependencies (if not already installed)

Dependencies appear to be installed, but if you need to reinstall:

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the `sbhack` directory with your OpenAI API key:

```bash
# Create .env file
echo "OPENAI_API_KEY=your-api-key-here" > .env
```

**Or manually create `.env` file:**
```
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
PORT=3000
```

> **Important**: Replace `your-api-key-here` with your actual OpenAI API key. You can get one from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 4. Run the application

Start the development server:

```bash
npm run dev
```

You should see output like:
```
🚀 Medical Simulation Backend running on port 3000
📡 Health check: http://localhost:3000/health
📝 API endpoints:
   POST /session/start
   POST /session/message
   POST /session/action
   GET  /session/export
```

### 5. Access the application

Open your web browser and navigate to:

**http://localhost:3000**

The backend serves both the API and the frontend, so you can access everything through this URL.

## Available Scripts

- `npm run dev` - Start the development server (uses ts-node for TypeScript)
- `npm run build` - Build the TypeScript code to JavaScript
- `npm start` - Run the built JavaScript version (requires `npm run build` first)

## Project Structure

- **Backend**: Node.js + Express + TypeScript (port 3000)
- **Frontend**: Vanilla JavaScript (served by the backend)
- **AI Integration**: OpenAI GPT-4 for patient simulation

## Troubleshooting

### Port already in use
If port 3000 is already in use, you can change it by setting the `PORT` environment variable:
```bash
PORT=3001 npm run dev
```

### Missing OpenAI API Key
If you see errors about missing API key, make sure:
1. The `.env` file exists in the `sbhack` directory
2. The `OPENAI_API_KEY` variable is set correctly
3. Your API key is valid and has credits

### Module not found errors
If you get module errors, try:
```bash
npm install
```

## API Endpoints

The backend provides these endpoints:

- `GET /health` - Health check
- `POST /session/start` - Start a new simulation session
- `POST /session/message` - Send a message to the AI patient
- `POST /session/action` - Record an action
- `POST /session/end` - End session with diagnosis
- `GET /session/feedback` - Get feedback for completed session
- `GET /session/export` - Export session data

## Notes

- The application uses in-memory storage, so sessions are lost when the server restarts
- The frontend is automatically served by the backend (no separate frontend server needed)
- The application uses OpenAI's GPT-4 model for patient responses
