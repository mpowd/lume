# RAG Chatbot Platform

A flexible and powerful Retrieval-Augmented Generation (RAG) platform that allows you to create, manage, and evaluate chatbots with customizable knowledge sources.


## 🌟 Features

- **Knowledge Base Management**
  - Web page crawling to build collections
  - Document chunking with configurable sizes and overlap
  - Hybrid search combining vector and keyword search

- **Chatbot Creation & Management**
  - Linear conversation workflows
  - Customizable RAG prompt templates
  - Hypothetical Document Embedding (HyDE) for improved retrieval
  - Reranking support with Cohere

- **Evaluation Framework**
  - Create test datasets manually or automatically
  - Evaluate chatbots against test datasets
  - Comprehensive RAGAS metrics (faithfulness, context recall, answer relevancy, context precision)
  - Comparative evaluation of multiple chatbots
  - Visualization of evaluation results


## 🏗️ Architecture

The platform consists of several components:

- **Frontend**: Streamlit application with pages for chatting, managing collections and chatbots, and evaluating performance
- **Backend**: FastAPI service managing chat, knowledge base, crawl4ai crawler and evaluation
- **Vector Database**: Qdrant for efficient vector search
- **Document Store**: MongoDB for storing documents, configurations, and evaluation results
- **Language Models**: Local (via Ollama) and API-based LLMs

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose
- API keys for external services (if using):
  - OpenAI API key
  - Cohere API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/rag-chatbot-platform.git
   cd rag-chatbot-platform
   ```

2. Create a `.env` file with your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key
   COHERE_API_KEY=your_cohere_api_key
   ```

3. Start the services with Docker Compose:
   ```bash
   docker-compose up -d
   ```

4. Access the application at: http://localhost:8501

## 📝 Usage Guide

### 1. Creating Knowledge Collections

1. Navigate to the **Collections** tab
2. Click on the **Create New collection** tab
3. Enter a name and configure embedding model, chunk size, and distance metric
4. Use the web crawler to add content to your collection

### 2. Creating a Chatbot

1. Navigate to the **Manage Chatbots** page
2. Fill in the basic configuration (name, workflow type, knowledge sources)
3. Configure retrieval settings (hybrid search, HyDE, reranking)
4. Set generation settings (LLM model, response prompt template)
5. Click "Create Chatbot"

### 3. Chatting with Your Chatbot

1. Navigate to the **Chat** page
2. Select your chatbot from the sidebar
3. Start asking questions!

### 4. Evaluating Chatbot Performance

1. Navigate to the **Evaluation** page
2. Create an evaluation dataset (manually or automatically)
3. Select a chatbot to evaluate
4. View and compare evaluation results

## 🧩 API Endpoints

The backend exposes several API routes:

- `/chat`: For interactive chat with the selected chatbot
- `/knowledge_base`: For managing collections and documents
- `/crawl`: For web crawling to collect documents
- `/evaluation`: For creating datasets and evaluating chatbot performance
- `/chatbot`: For managing chatbot configurations

## 🛠️ Advanced Configuration


### RAG Prompt Templates

Customize the RAG prompt template in the chatbot configuration to adjust how the model uses retrieved context.


## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Built with [FastAPI](https://fastapi.tiangolo.com/), [Streamlit](https://streamlit.io/), [LangChain](https://python.langchain.com/), [Crawl4ai](https://github.com/unclecode/crawl4ai), [Qdrant](https://qdrant.tech/), and [MongoDB](https://www.mongodb.com/)
- Evaluation metrics powered by [RAGAS](https://docs.ragas.io/)
