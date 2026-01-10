# AI Service

Python + FastAPI service for conversational AI patient simulation.

## Structure

```
app/
├── routes/           # FastAPI route definitions
├── services/         # AI/LLM integration services
├── models/           # Pydantic models for request/response
├── prompts/          # LLM prompt templates and system prompts
└── utils/            # Helper functions
```

## Responsibilities

- LLM integration for patient conversation
- Context-aware response generation
- Patient state evolution based on learner actions
- Emotional cue detection and response
- Medical knowledge grounding
