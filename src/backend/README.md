# Backend API

Node.js + Express server for orchestrating simulation sessions and managing state.

## Structure

```
src/
├── routes/           # API route definitions
├── controllers/      # Request handlers
├── services/         # Business logic (session management, AI service integration)
├── middleware/       # Express middleware (auth, logging, error handling)
├── models/           # Data models/schemas
├── store/            # In-memory data store implementation
└── utils/            # Helper functions
```

## Responsibilities

- Session management
- Simulation state tracking
- Coordination between frontend and AI service
- In-memory storage of active sessions
- Scenario progression logic
