# Medical Simulation Platform

An interactive, adaptive medical simulation platform for medical students.

## Project Structure

```
src/
├── frontend/          # React/Vue frontend application
├── backend/           # Node.js + Express API server
├── ai-service/        # Python + FastAPI conversational AI service
└── shared/            # Shared types and scenario definitions

config/                # Configuration files
docs/                  # Documentation
scripts/               # Build and deployment scripts
```

## Tech Stack

- **Frontend**: React/Vue.js
- **Backend API**: Node.js + Express
- **AI Service**: Python + FastAPI
- **Storage**: In-memory store
- **AI**: LLM integration for conversational patient simulation

## Features

- Conversational AI patient with emotional intelligence
- Dynamic scenario evolution based on learner decisions
- Comprehensive medical workflow (history, physical exam, labs, imaging, treatment)
- Free-text input for realistic interactions
