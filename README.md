# Lume - AI Assistant Platform

An extensible platform for building AI assistants. Currently focused on question-answering with plans to support diverse use cases.

## 🌟 Overview

Lume is built on an **assistant-first architecture**—instead of being limited to chatbots, the platform is designed to support different types of AI assistants for various tasks. Right now, **Question Answering** is fully implemented, with the infrastructure ready for future assistant types.

## ✨ Features

### 🤖 Extensible Assistant Framework
- **Multiple Assistant Types**: Modular architecture supporting diverse use cases
- **Currently Implemented**: Question Answering (QA) assistants with RAG
- **Easily Extensible**: Add new assistant types through the registry system

### 📚 Knowledge Base Management
- **Collection-Based Organization**: Group related documents into collections
- **Web Crawling**: Automatically scrape and index websites
- **Vector Storage**: Powered by Qdrant for efficient similarity search
- **Document Storage**: MongoDB for original documents and metadata

### 🔍 Advanced Retrieval
- **Hybrid Search**: Combine vector similarity and keyword matching
- **HyDE (Hypothetical Document Embeddings)**: Improve retrieval with generated hypothetical documents
- **Reranking**: Cohere and HuggingFace rerankers for precision
- **Precise Citation**: Advanced citation extraction for source attribution

### 📊 Evaluation Framework
- **RAGAS Integration**: Comprehensive metrics (faithfulness, context recall, answer relevancy, context precision)
- **Dataset Management**: Create test sets manually or automatically
- **Comparative Analysis**: Evaluate multiple assistants side-by-side
- **Visualization**: Interactive charts and performance comparisons

### 🔭 Observability
- **Phoenix Integration**: LLM call tracing and monitoring
- **Performance Tracking**: Execution time and token usage
- **Debugging Tools**: Inspect retrieval and generation steps

## 🏗️ Architecture

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
                    ┌──────────────┐
                    │   Phoenix    │
                    │ (Observability)
                    └──────────────┘
```

**Stack**:
- **Frontend**: React with Tailwind CSS
- **Backend**: FastAPI with modular assistant system
- **Vector DB**: Qdrant for semantic search
- **Document Store**: MongoDB
- **LLMs**: OpenAI API and Ollama (local)
- **Observability**: Phoenix for tracing
- **Crawler**: crawl4ai for web scraping

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose
- API keys for external services:
  - OpenAI API key (for GPT models)
  - Cohere API key (for reranking)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mpowd/lume.git
   cd lume
   ```

2. **Create environment file**
   
   Create a `.env` file in the root directory:
   ```env
   QDRANT_HOST=qdrant
   QDRANT_PORT=6333
   MONGODB_URL=mongodb://mongodb:27017
   OPENAI_API_KEY=your_openai_api_key
   COHERE_API_KEY=your_cohere_api_key
   TZ=Europe/Berlin
   PHOENIX_COLLECTOR_ENDPOINT=http://phoenix:6006
   ```

3. **Start the platform**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

4. **Access the applications**
   - **Lume UI**: http://localhost:5173
   - **API Documentation**: http://localhost:8000/docs
   - **Qdrant Dashboard**: http://localhost:6333/dashboard
   - **MongoDB Express**: http://localhost:8081 (admin/pass)
   - **Phoenix Observability**: http://localhost:6006

### Optional: Install Local Models (Ollama)

If you want to use local models instead of cloud APIs:

1. **Access the Ollama container**
   ```bash
   # Find your container name
   docker ps | grep ollama
   
   # Enter the container
   docker exec -it <container_name> /bin/bash
   ```

2. **Install models**
   ```bash
   # Language models
   ollama pull mistral
   ollama pull llama3
   ollama pull qwen
   
   # Embedding model
   ollama pull jina/jina-embeddings-v2-base-de
   
   # Verify installation
   ollama list
   ```

## 📖 Usage Guide

### 1. Create a Knowledge Collection

1. Navigate to **Knowledge Base**
2. Click **New Collection**
3. Configure:
   - Collection name
   - Embedding model
   - Chunk size and overlap
   - Distance metric (cosine, euclidean, dot product)
4. Click **Create**

### 2. Add Knowledge to Your Collection

1. Select your collection
2. Choose **Add Knowledge** → **Website**
3. Enter URL and configure crawl settings
4. Click **Start Crawl**

### 3. Create a Question Answering Assistant

1. Go to **Assistants** → **New Assistant**
2. Configure:
   - Name and description
   - Select knowledge collections
   - Choose LLM (OpenAI or Ollama)
   - Enable advanced features (hybrid search, HyDE, reranking)
   - Customize prompts
3. Click **Create Assistant**

### 4. Chat with Your Assistant

1. Navigate to **Chat**
2. Select your assistant
3. Ask questions and view sources

### 5. Evaluate Performance

1. Go to **Evaluation**
2. Create a test dataset (manual or RAGAS-generated)
3. Select assistant(s) and run evaluation
4. View RAGAS metrics and compare results

## 🎯 Current Features

### Question Answering Assistant

The QA assistant enables conversational interaction with your knowledge base using RAG.

**Key Capabilities**:
- Source-attributed answers
- Configurable retrieval (hybrid search, HyDE, reranking)
- Custom prompt templates with placeholders
- Precise citation mode for exact quotes
- Reference injection for context

**Advanced Retrieval Options**:
- **Hybrid Search**: Combines vector similarity with keyword matching
- **HyDE**: Generates hypothetical documents to improve retrieval
- **Reranking**: Re-scores results with Cohere or HuggingFace models
- **Precise Citation**: Extracts exact quotes with source attribution

### Future Development

The platform architecture supports additional assistant types. Potential use cases:
- Document retrieval without generation
- Content generation and summarization
- Image generation integration
- Data analysis workflows
- Multi-step reasoning tasks

## 🔧 Configuration

### Prompt Templates

Customize how your assistant uses retrieved context with placeholder variables:
- `{question}` - User's question
- `{context}` - Retrieved documents
- `{reference_name}` - Custom reference text

### References

Add static reference information to your assistant:
1. Create references in assistant settings
2. Use `{reference_name}` in your prompt
3. System substitutes reference text automatically

Useful for company info, guidelines, or domain knowledge.

## 📊 Evaluation

### RAGAS Metrics for QA

- **Faithfulness**: Answer alignment with context
- **Answer Relevancy**: Relevance to question
- **Context Recall**: Quality of retrieval
- **Context Precision**: Ranking of relevant docs

Choose evaluation LLMs: GPT-4, GPT-3.5, or local models.

## 🔌 API Overview

### Core Endpoints

**Assistants**
- `GET /assistants/` - List assistants
- `POST /assistants/` - Create assistant
- `PUT /assistants/{id}` - Update assistant
- `DELETE /assistants/{id}` - Delete assistant

**Execution**
- `POST /execute/qa` - Execute QA assistant

**Knowledge Base**
- `GET /knowledge_base/collections` - List collections
- `POST /knowledge_base/collections` - Create collection
- `POST /knowledge_base/upload_documents` - Add documents

**Website Crawling**
- `GET /website/links` - Extract links
- `POST /website/upload-documents-stream` - Crawl and index (streaming)

**Evaluation**
- `GET /evaluation/datasets` - List datasets
- `POST /evaluation/datasets` - Create dataset
- `POST /evaluation/ragas` - Generate with RAGAS
- `POST /evaluation/evaluate-assistant` - Run evaluation

Full API documentation: http://localhost:8000/docs

## 🛠️ Development

### Project Structure

```
lume/
├── backend/
│   ├── api/              # API routes and schemas
│   ├── core/
│   │   ├── assistants/   # Assistant implementations
│   │   ├── knowledge_base/ # RAG system
│   │   └── evaluation/   # RAGAS integration
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── services/
└── docker-compose.dev.yml
```

### Extending the Platform

To add new assistant types:
1. Create assistant class in `backend/core/assistants/`
2. Register with `AssistantRegistry`
3. Add frontend components
4. Implement execution logic

The modular architecture makes it straightforward to add new capabilities.

## 🐛 Troubleshooting

**Containers not starting**
```bash
docker-compose ps
docker-compose logs api
```

**Ollama models missing**
```bash
docker exec -it <container> ollama list
```

**Slow queries**
- Reduce `top_k` value
- Disable reranking
- Use faster embedding models

## 📄 License

MIT License

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [Qdrant](https://qdrant.tech/)
- [MongoDB](https://www.mongodb.com/)
- [RAGAS](https://docs.ragas.io/)
- [Phoenix](https://phoenix.arize.com/)
- [crawl4ai](https://github.com/unclecode/crawl4ai)
