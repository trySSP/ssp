# Startup Success Predictor

An AI-powered tool that helps founders articulate their startup vision and receive objective success probability analysis.

## What It Does

**For Founders:**

- Structure your startup thinking using guided sections (Problem Statement, Solution, Market, Team, Funding, Risks)
- Fill in rich-text documents with prompts that guide you through key aspects investors care about
- See a visual coverage indicator showing how complete your documentation is

**AI Analysis:**

- Submit your documentation to receive an AI-powered success probability score
- Get detailed reasoning across market opportunity, product differentiation, team strength, and risk factors
- Use insights to refine your pitch and identify blind spots

## Project Structure

```
.
├── frontend/     # Next.js web application
├── backend/      # FastAPI + LangChain analysis engine
├── Makefile      # Development commands
└── README.md
```

## Prerequisites

- **Node.js** 18+ and **Bun**
- **Python** 3.13+ and **uv**
- **OpenAI API Key** (for backend analysis + summarization)
- **Exa API Key** (for competitor company discovery)

## Quick Start

```bash
# Install all dependencies
make install

# Set up environment (backend)
cp backend/.example.env backend/.env
# Add OPENAI_API_KEY and EXA_API_KEY to backend/.env

# Run both services
make dev
```

### Individual Services

# Frontend only (http://localhost:3000)

```bash
make frontend
```

or

```bash
bun run dev
```

# Backend only (http://localhost:8000)

```bash
make backend
```

or

```bash
uv run uvicorn main:app --reload --port 8000
```

## Environment Variables

| Service  | File                  | Variables        |
| -------- | --------------------- | ---------------- |
| Frontend | `frontend/.env.local` | (optional)       |
| Backend  | `backend/.env`        | `OPENAI_API_KEY`, `EXA_API_KEY`, `OPENAI_ANALYSIS_MODEL` (optional), `OPENAI_SUMMARIZER_MODEL` (optional), `EXA_COMPETITOR_LIMIT` (optional), `X_BEARER_TOKEN` (optional), `REDDIT_USER_AGENT` (optional), `SOCIAL_SIGNAL_LIMIT_PER_SOURCE` (optional), `SOCIAL_SIGNAL_TIMEOUT_SECONDS` (optional), `SOCIAL_SIGNAL_INCLUDE_HN` (optional) |
