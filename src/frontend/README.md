# Frontend

React/Vue.js application for the medical simulation interface.

## Structure

```
public/
├── index.html           # Main HTML file
src/
├── js/
│   ├── main.js         # Main application entry point
│   ├── services/
│   │   └── api.js      # API service for backend communication
│   ├── components/
│   │   ├── messages.js     # Message display component
│   │   ├── patientInfo.js  # Patient info display component
│   │   └── feedback.js     # Feedback display component
│   └── utils/
│       ├── timer.js        # Timer utility
│       └── typewriter.js   # Typewriter effect utility
```

## Running the Frontend

### Option 1: Using a Simple HTTP Server

Since we're using ES modules, you need to serve the files via HTTP (not file://).

**Using Python:**
```bash
cd src/frontend
python3 -m http.server 8080
```

Then open: http://localhost:8080/public/index.html

**Using Node.js (http-server):**
```bash
npm install -g http-server
cd src/frontend
http-server -p 8080
```

**Using PHP:**
```bash
cd src/frontend
php -S localhost:8080
```

### Option 2: Using Vite (Recommended for Development)

```bash
npm install -g vite
cd src/frontend
vite public
```

### Option 3: Serve with Backend (Express static)

You can serve the frontend from the backend by adding this to `src/backend/src/app.ts`:

```typescript
import path from 'path';
app.use(express.static(path.join(__dirname, '../../frontend/public')));
app.use('/src', express.static(path.join(__dirname, '../../frontend/src')));
```

## Configuration

The API base URL is configured in `src/js/services/api.js`. 
By default, it points to `http://localhost:3000`.

Make sure the backend is running on port 3000, or update the `API_BASE_URL` constant.

## Features

- **Test Mode**: Practice mode with patient interaction
- **Learning Mode**: Includes real-time feedback panel
- **Session Management**: Connects to backend API for session handling
- **Real-time Chat**: Interactive conversation with AI patient
- **Timer**: Session timer with auto-expiry
- **Diagnosis Submission**: Submit diagnosis and get feedback
- **Responsive Design**: Built with TailwindCSS

## Backend Integration

The frontend connects to these backend endpoints:

- `POST /session/start` - Start a new session
- `POST /session/message` - Send message to patient
- `POST /session/action` - Record an action (not yet integrated in UI)
- `POST /session/end` - End session with diagnosis
- `GET /session/feedback` - Get feedback for completed session
- `GET /session/export` - Export session data

## TailwindCSS

TailwindCSS is included via CDN. For production, consider using the Tailwind CLI or bundler for optimization.
