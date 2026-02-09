# Lume - AI Assistant Platform

A modular platform for building AI assistants with RAG capabilities and integrated evaluation tools.

## Features

- Question-answering assistants with retrieval augmented generation
- Knowledge base management with web crawling and file upload
- Advanced retrieval (hybrid search, HyDE, reranking)
- RAGAS-based evaluation framework
- Support for OpenAI and Ollama models

## Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  Chat | Assistants | Knowledge Base | Evaluation            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  FastAPI Backend                            │
│  • Assistant Registry & Execution Engine                    │
│  • Knowledge Base Management                                │
│  • Evaluation System (RAGAS)                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────┬──────────────────┬──────────────────────┐
│  Qdrant          │  MongoDB         │  LLM Providers       │
│  (Vector DB)     │  (Documents)     │  (OpenAI, Ollama)    │
└──────────────────┴──────────────────┴──────────────────────┘
                            ↓
                    ┌────────────────┐
                    │   Phoenix      │
                    │ (Observability)│
                    └────────────────┘
```

## Installation

### Prerequisites
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- Docker & Docker Compose
- Node.js
- Optional: OpenAI API key, Cohere API key, Tavily API key, llama_cloud API key, Ollama

### Setup

1. **Clone repository**
```bash
git clone https://github.com/mpowd/lume.git
cd lume
```

2. **Create `.env` file**
```env
QDRANT_HOST=qdrant
QDRANT_PORT=6333
MONGODB_URL=mongodb://mongodb:27017
OPENAI_API_KEY=YOUR_KEY
COHERE_API_KEY=YOUR_KEY
TZ=Europe/Berlin
PHOENIX_COLLECTOR_ENDPOINT=http://phoenix:6006
LLAMA_CLOUD_API_KEY=YOUR_KEY
TAVILY_API_KEY=YOUR_KEY
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

3. **Start infrastructure services**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

4. **Start backend**
```bash
# Install dependencies and start development server
uv sync
uv run dev
```

Backend will be available at http://localhost:8000

5. **Start frontend** (in a new terminal)
```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at http://localhost:5173

## Development

### Backend Commands
```bash
# Start development server with hot reload
uv run dev

# Install/update dependencies
uv sync

# Add a new dependency
uv add <package-name>

# Update all dependencies
uv lock --upgrade
```

### Frontend Commands
```bash
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

## Example Workflow

1. Create a knowledge collection (Knowledge Base → New Collection)
2. Add content via web crawler or file upload
3. Create an assistant (Assistants → New Assistant)
4. Configure retrieval settings and prompts
5. Test in chat interface
6. Evaluate with RAGAS metrics

## API Documentation

Interactive API docs available at: http://localhost:8000/docs

### Key Endpoints
- `POST /assistants/` - Create assistant
- `POST /execute/qa` - Execute question-answering
- `POST /knowledge_base/collections` - Create collection
- `POST /website/upload-documents-stream` - Crawl and index website
- `POST /evaluation/evaluate-assistant` - Run evaluation

## Project Structure
```
lume/
├── backend/                 # FastAPI backend
│   ├── api/                # API routes
│   ├── core/               # Core logic (assistants, etc.)
│   ├── services/           # Business logic
│   ├── schemas/            # Pydantic models
│   └── cli.py              # CLI entry points
├── frontend/               # React frontend
├── docker-compose.dev.yml  # Development services
└── pyproject.toml          # Python dependencies
```

## License

MIT
