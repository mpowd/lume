from typing import Dict, List, Any, Optional
import logging
import asyncio
from langchain_community.document_transformers import LongContextReorder
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnableParallel
from langchain.schema.output_parser import StrOutputParser
from langchain_qdrant import QdrantVectorStore, RetrievalMode
from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_qdrant import FastEmbedSparse
from langchain_cohere import CohereRerank
from langchain.retrievers import ContextualCompressionRetriever
from qdrant_client import QdrantClient
import os
from smolagents import ToolCallingAgent, LiteLLMModel, DuckDuckGoSearchTool, CodeAgent
from backend.db.mongodb import MongoDBClient

from backend.app.core.agents.pydantic_agent import PydanticAgentFactory, process_with_pydantic_agent

from phoenix.otel import register

os.environ["PHOENIX_COLLECTOR_ENDPOINT"] = "http://phoenix:6006"
tracer_provider = register(
    project_name="RAG_Chatbot",
    auto_instrument=True
)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChatbotService:
    def __init__(self):
        self.sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")
        self.embeddings = OllamaEmbeddings(model="jina/jina-embeddings-v2-base-de", base_url="http://ollama:11434")
        self.active_agents = {}
        self.active_pydantic_agents = {}
        self._current_query = ""
        
        self.mongodb_client = MongoDBClient.get_instance()
        
    def get_llm(self, model_name: str):
        """
        Get the appropriate language model based on configuration
        """
        if model_name == "gpt-4o-mini":
            return ChatOpenAI(
                model="gpt-4o-mini", 
                api_key=os.environ.get("OPENAI_API_KEY"),
                temperature=0
            )
        elif model_name in ["mistral", "qwen", "llama3"]:
            return ChatOllama(
                model=model_name, 
                temperature=0,
                base_url="http://ollama:11434"
            )
        else:
            return ChatOpenAI(
                model="gpt-4o-mini", 
                api_key=os.environ.get("OPENAI_API_KEY"),
                temperature=0
            )
    
    def get_litellm_model(self, model_name: str):
        """
        Get the appropriate litellm model for agentic use
        """
        if model_name == "gpt-4o-mini":
            return LiteLLMModel(
                model_id=model_name, 
                api_key=os.environ.get("OPENAI_API_KEY")
            )
        else:
            return LiteLLMModel(
                model_id=f"ollama_chat/{model_name}",
                api_base="http://ollama:11434",
                num_ctx=4096,
            )
        
    
    def generate_hypothetical_document(self, query: str, hyde_prompt: str, llm) -> str:
        """Generate a hypothetical document/answer to improve retrieval"""
        try:
            formatted_prompt = hyde_prompt.format(question=query)
            
            response = llm.invoke(formatted_prompt)
            
            if hasattr(response, 'content'):
                return response.content
            else:
                return str(response)
                
        except Exception as e:
            logger.error(f"Error generating hypothetical document: {str(e)}")
            return query
    
    def get_retriever(self, config: Dict[str, Any]):
        """Create a vector store retriever based on configuration"""
        collections = config.get("collections", [])
        if not collections:
            logger.warning("No collections specified for retrieval")
            return None
            
        collection_name = collections[0]
        logger.info(f"Creating retriever for collection: {collection_name}")
        
        client = QdrantClient(url="http://qdrant:6333", timeout=10.0)
        
        retrieval_mode = RetrievalMode.HYBRID if config.get("hybrid_search", True) else RetrievalMode.DENSE
        
        try:
            vector_store = QdrantVectorStore(
                client=client,
                collection_name=collection_name,
                embedding=self.embeddings,
                sparse_embedding=self.sparse_embeddings,
                retrieval_mode=retrieval_mode,
                vector_name="dense",
                sparse_vector_name="sparse",
            )
            
            top_k = config.get("top_k", 10)
            base_retriever = vector_store.as_retriever(search_kwargs={"k": top_k})
            
            if config.get("hyde", False):
                hyde_prompt = config.get("hyde_prompt", 
                    "Given a question, generate a paragraph of text that answers the question.\n\nQuestion: {question}\n\nParagraph: ")
                
                llm = self.get_llm(config.get("llm", "gpt-4o-mini"))
                
                
                def hyde_retriever(query):
                    hypothetical_doc = self.generate_hypothetical_document(query, hyde_prompt, llm)
                    logger.info(f"Generated hypothetical document: {hypothetical_doc[:100]}...")
                    
                    return base_retriever.invoke(hypothetical_doc)
                
                retriever = RunnableLambda(hyde_retriever)
            else:
                retriever = base_retriever
                
            if config.get("reranking", False):
                reranker_type = config.get("reranker", "Cohere")
                top_n = config.get("top_n", max(1, int(top_k/2)))
                
                logger.info(f"Setting up {reranker_type} reranker with top_n={top_n}")
                
                if reranker_type == "Cohere":
                    if not os.environ.get("COHERE_API_KEY"):
                        logger.warning("COHERE_API_KEY is not set. Reranking will not work properly.")
                    
                    try:
                        cohere_reranker = CohereRerank(
                            cohere_api_key=os.environ.get("COHERE_API_KEY"),
                            model="rerank-english-v3.0",
                            top_n=top_n
                        )
                        
                        contextual_compression_retriever = ContextualCompressionRetriever(
                            base_compressor=cohere_reranker,
                            base_retriever=retriever
                        )
                        
                        retriever = contextual_compression_retriever
                        
                        logger.info("Successfully created Cohere reranker with ContextualCompressionRetriever")
                    except Exception as e:
                        logger.error(f"Error setting up Cohere reranker: {str(e)}", exc_info=True)
                
                elif reranker_type == "Jina":
                    logger.warning("Jina reranker not implemented yet, using default retrieval")
            
            return retriever | RunnableLambda(LongContextReorder().transform_documents)
        
        except Exception as e:
            logger.error(f"Error creating retriever for collection {collection_name}: {str(e)}", exc_info=True)
            return None
    
    def docs2str(self, docs, title="Document"):
        """
        Convert document objects to string format for context
        """
        out_str = ""
        for doc in docs:
            doc_name = getattr(doc, 'metadata', {}).get('Title', title)
            if doc_name:
                out_str += f"[Quote from {doc_name}] "
            out_str += getattr(doc, 'page_content', str(doc)) + "\n"
        return out_str
    
    
    def create_linear_agent(self, config: Dict[str, Any]):
        """
        Create a linear RAG agent based on configuration
        """

        if not config.get("collections"):
            logger.warning("No collections specified. Creating a simple non-RAG agent.")
            
            llm = self.get_llm(config.get("llm", "gpt-4o-mini"))
            
            simple_prompt = ChatPromptTemplate.from_template(
                "User Question: {question}\nAnswer the user conversationally."
            )
            
            simple_chain = (
                {"question": lambda x: x}
                | simple_prompt
                | llm
                | StrOutputParser()
            )
            
            agent = RunnableParallel(
                {"question": lambda x: x}
            ).assign(
                response=simple_chain,
                contexts=[],
                source_urls=[]
            )
            
            return agent
        

        retriever = self.get_retriever(config)
        if not retriever:
            logger.error("Failed to create retriever for linear agent")
            return None
            
        llm = self.get_llm(config.get("llm", "gpt-4o-mini"))
        
        rag_prompt_template = config.get("rag_prompt", 
            "Answer the question using only the context"
            "\n\nRetrieved Context: {context}"
            "\n\nUser Question: {question}"
            "\nAnswer the user conversationally. User is not aware of context."
        )
        
        context_prompt = ChatPromptTemplate.from_template(rag_prompt_template)
        
        answer_chain = (
            {
                'context': lambda x: self.docs2str(x["retrieved_docs"]),
                'question': lambda x: x["question"]
            }
            | context_prompt
            | llm
            | StrOutputParser()
        )
        
        def extract_sources(docs):
            sources = []
            for doc in docs:
                source = doc.metadata.get('source') or doc.metadata.get('url') or doc.metadata.get('source_url')
                sources.append(source if source else "Unknown source")
            return sources
        
        def extract_page_contents(docs):
            return [doc.page_content for doc in docs]
        
        agent = RunnableParallel(
            {
                "retrieved_docs": lambda x: retriever.invoke(x),
                "question": lambda x: x
            }
        ).assign(
            response=answer_chain,
            contexts=lambda x: extract_page_contents(x["retrieved_docs"]),
            source_urls=lambda x: extract_sources(x["retrieved_docs"])
        )
        
        return agent
    
    def create_agentic_agent(self, config: Dict[str, Any]):
        """
        Create an agentic chatbot that can use tools
        """
        workflow_implementation = config.get("workflow_implementation", "smolagents")
        
        collections = config.get("collections", [])
        if collections:
            logger.info(f"Creating agentic agent with collections: {collections}")
        else:
            logger.warning("Creating agentic agent without any collections")
        
        if workflow_implementation == "pydantic_ai":
            logger.info(f"Creating PydanticAI agent with config: {config}")
            return PydanticAgentFactory.create_agent(config, self)
        else:
            # logger.error("smolagent chat request not implemented.")
            model = self.get_litellm_model(config.get("llm", "gpt-4o-mini"))
            
            tools = []
            
            # if collections:
            #     logger.info(f"Adding RetrieverTool with collections: {collections}")
            #     retriever_tool = RetrieverTool(collections=collections)
            #     tools.append(retriever_tool)
            
            # tool_options = config.get("tools", [])
            # if "Web Search" in tool_options:
            #     tools.append(DuckDuckGoSearchTool())
                
            max_steps = config.get("max_steps", 4)
            agent = CodeAgent(
                # tools=tools,
                tools=[DuckDuckGoSearchTool()],
                model=model,
                max_steps=max_steps,
                # add_base_tools="Calculator" in tool_options,
                verbosity_level=1
            )
            
            return agent
        
    def get_agent(self, chatbot_id: str):
        """
        Get or create an agent based on its configuration
        """
        if chatbot_id in self.active_agents:
            logger.info(f"Reusing cached agent for chatbot ID: {chatbot_id}")
            return self.active_agents[chatbot_id]
            
        try:
            from bson.objectid import ObjectId
            
            configs = self.mongodb_client.get_docs(
                filter={"_id": ObjectId(chatbot_id)},
                collection_name="chatbots"
            )
            
            if not configs:
                logger.error(f"Chatbot with ID {chatbot_id} not found")
                return None
                
            config = configs[0]
            
            logger.info(f"Chatbot config: {config}")
            logger.info(f"Selected LLM: {config.get('llm')}")
            logger.info(f"Collections: {config.get('collections', [])}")

            workflow = config.get("workflow", "linear")
            
            if workflow == "linear":
                agent = self.create_linear_agent(config)
            elif workflow == "agentic":
                agent = self.create_agentic_agent(config)
            else:
                logger.error(f"Unknown workflow type: {workflow}")
                return None
                
            self.active_agents[chatbot_id] = agent
            
            return agent
            
        except Exception as e:
            logger.error(f"Error creating agent: {str(e)}", exc_info=True)
            return None
    
    async def process_query(self, chatbot_id: str, query: str):
        """
        Process a user query using the specified chatbot
        """
        try:
            self._current_query = query
            
            from bson.objectid import ObjectId
            configs = self.mongodb_client.get_docs(
                filter={"_id": ObjectId(chatbot_id)},
                collection_name="chatbots"
            )
            
            if not configs:
                return {
                    "response": "Chatbot configuration not found.",
                    "contexts": [],
                    "source_urls": []
                }
                
            config = configs[0]
            workflow = config.get("workflow")
            
            agent = self.get_agent(chatbot_id)
            
            if not agent:
                return {
                    "response": "Sorry, I couldn't find the requested chatbot.",
                    "contexts": [],
                    "source_urls": []
                }
            
            if workflow == "linear":
                result = agent.invoke(query)
                return result
            elif workflow == "agentic":
                if config.get("workflow_implementation", "smolagents") == "pydantic_ai":
                    logger.error("pydantic ai response generation not implemented")
                    # result = await process_with_pydantic_agent(agent, config, query)
                    # return result
                else:
                    logger.info(f"smolagents query: {query}")
                    response = agent.run(query)
                    return {
                        "response": response,
                        "contexts": [],
                        "source_urls": []
                    }
            
        except Exception as e:
            logger.error(f"Error processing query: {str(e)}", exc_info=True)
            return {
                "response": f"Sorry, an error occurred: {str(e)}",
                "contexts": [],
                "source_urls": []
            }

_service_instance = None

def get_chatbot_service():
    """
    Get or create the chatbot service singleton
    """
    global _service_instance
    if _service_instance is None:
        _service_instance = ChatbotService()
    return _service_instance