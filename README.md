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

**Prerequisites:** Docker, Docker Compose, node.js, optional: [OpenAI API key, Cohere api key, Tavily api key, llama_cloud api key, Ollama]

1. Clone repository
```bash
git clone https://github.com/mpowd/lume.git
cd lume
```

2. Create `.env` file
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

3. Start backend
```bash
docker-compose -f docker-compose.dev.yml up -d
```

4. Start frontend
```bash
cd frontend
npm install
npm run dev
```

## Example Workflow

1. Create a knowledge collection (Knowledge Base → New Collection)
2. Add content via web crawler or file upload
3. Create an assistant (Assistants → New Assistant)
4. Configure retrieval settings and prompts
5. Test in chat interface
6. Evaluate with RAGAS metrics

## API

- `POST /assistants/` - Create assistant
- `POST /execute/qa` - Execute question-answering
- `POST /knowledge_base/collections` - Create collection
- `POST /website/upload-documents-stream` - Crawl and index website
- `POST /evaluation/evaluate-assistant` - Run evaluation

Docs: http://localhost:8000/docs

## License

MIT
