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
from pydantic import BaseModel, Field
from langchain_core.output_parsers import PydanticOutputParser

from backend.app.core.agents.pydantic_agent import (
    PydanticAgentFactory,
    process_with_pydantic_agent,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CitedAnswer(BaseModel):
    """Answer with citation information"""

    answer: str = Field(description="The answer to the user's question")
    used_chunk_indices: List[int] = Field(
        description="List of chunk indices (0-based) that were directly used to generate the answer. Only include chunks you actually referenced."
    )


class ChatbotService:
    def __init__(self):
        self.sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")
        self.embeddings = OllamaEmbeddings(
            model="jina/jina-embeddings-v2-base-de", base_url="http://ollama:11434"
        )
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
                temperature=0,
            )
        elif model_name in ["mistral", "qwen", "llama3"]:
            return ChatOllama(
                model=model_name, temperature=0, base_url="http://ollama:11434"
            )
        else:
            return ChatOpenAI(
                model="gpt-4o-mini",
                api_key=os.environ.get("OPENAI_API_KEY"),
                temperature=0,
            )

    def get_litellm_model(self, model_name: str):
        """
        Get the appropriate litellm model for agentic use
        """
        if model_name == "gpt-4o-mini":
            return LiteLLMModel(
                model_id=model_name, api_key=os.environ.get("OPENAI_API_KEY")
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

            if hasattr(response, "content"):
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

        retrieval_mode = (
            RetrievalMode.HYBRID
            if config.get("hybrid_search", True)
            else RetrievalMode.DENSE
        )

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
            base_retriever = vector_store.as_retriever(
                search_kwargs={"k": top_k, "score_threshold": 0.1}
            )

            if config.get("hyde", False):
                hyde_prompt = config.get(
                    "hyde_prompt",
                    "Given a question, generate a paragraph of text that answers the question.\n\nQuestion: {question}\n\nParagraph: ",
                )

                llm = self.get_llm(config.get("llm", "gpt-4o-mini"))

                def hyde_retriever(query):
                    hypothetical_doc = self.generate_hypothetical_document(
                        query, hyde_prompt, llm
                    )
                    logger.info(
                        f"Generated hypothetical document: {hypothetical_doc[:100]}..."
                    )

                    return base_retriever.invoke(hypothetical_doc)

                retriever = RunnableLambda(hyde_retriever)
            else:
                retriever = base_retriever

            if config.get("reranking", False):
                reranker_type = config.get("reranker", "Cohere")
                top_n = config.get("top_n", max(1, int(top_k / 2)))

                logger.info(f"Setting up {reranker_type} reranker with top_n={top_n}")

                if reranker_type == "Cohere":
                    if not os.environ.get("COHERE_API_KEY"):
                        logger.warning(
                            "COHERE_API_KEY is not set. Reranking will not work properly."
                        )

                    try:
                        cohere_reranker = CohereRerank(
                            cohere_api_key=os.environ.get("COHERE_API_KEY"),
                            model="rerank-v3.5",
                            top_n=top_n,
                        )

                        contextual_compression_retriever = (
                            ContextualCompressionRetriever(
                                base_compressor=cohere_reranker,
                                base_retriever=retriever,
                            )
                        )

                        retriever = contextual_compression_retriever

                        logger.info(
                            "Successfully created Cohere reranker with ContextualCompressionRetriever"
                        )
                    except Exception as e:
                        logger.error(
                            f"Error setting up Cohere reranker: {str(e)}", exc_info=True
                        )

                elif reranker_type == "Jina":
                    logger.warning(
                        "Jina reranker not implemented yet, using default retrieval"
                    )

            return retriever | RunnableLambda(LongContextReorder().transform_documents)

        except Exception as e:
            logger.error(
                f"Error creating retriever for collection {collection_name}: {str(e)}",
                exc_info=True,
            )
            return None

    def docs2str(self, docs, title="Document"):
        """
        Convert document objects to string format for context
        """
        out_str = ""
        for doc in docs:
            doc_name = getattr(doc, "metadata", {}).get("Title", title)
            if doc_name:
                out_str += f"[Quote from {doc_name}] "
            out_str += getattr(doc, "page_content", str(doc)) + "\n"
        return out_str

    def format_context_with_indices(self, docs):
        """Format context chunks with indices for citation"""
        return "\n\n".join(
            [f"[Chunk {i}]\n{doc.page_content}" for i, doc in enumerate(docs)]
        )

    def create_linear_agent(self, config: Dict[str, Any]):
        """
        Create a linear RAG agent based on configuration
        """

        # Define helper functions FIRST
        def extract_sources_with_scores(docs):
            """Extract sources and their relevance scores"""
            sources = []
            for doc in docs:
                source = (
                    doc.metadata.get("source")
                    or doc.metadata.get("url")
                    or doc.metadata.get("source_url")
                )

                # Cohere reranker stores the relevance score in metadata
                score = None

                # Check for Cohere relevance score (from ContextualCompressionRetriever)
                if "relevance_score" in doc.metadata:
                    score = doc.metadata["relevance_score"]
                    logger.info(f"Found Cohere relevance_score: {score} for {source}")

                # Fallback: check other common score locations
                elif "_score" in doc.metadata:
                    score = doc.metadata["_score"]
                    logger.info(f"Found _score: {score} for {source}")

                # Log if no score found
                if score is None:
                    logger.warning(f"No score found for {source}, using default 0.5")
                    logger.info(f"Available metadata keys: {doc.metadata.keys()}")

                sources.append(
                    {
                        "url": source if source else "Unknown source",
                        "score": float(score) if score is not None else 0.5,
                    }
                )

            return sources

        def extract_page_contents(docs):
            """Extract page contents from documents"""
            return [doc.page_content for doc in docs]

        if not config.get("collections"):
            logger.warning("No collections specified. Creating a simple non-RAG agent.")

            llm = self.get_llm(config.get("llm", "gpt-4o-mini"))

            simple_prompt = ChatPromptTemplate.from_template(
                "User Question: {question}\nAnswer the user conversationally."
            )

            simple_chain = (
                {"question": lambda x: x} | simple_prompt | llm | StrOutputParser()
            )

            agent = RunnableParallel({"question": lambda x: x}).assign(
                response=simple_chain, contexts=[], source_urls=[]
            )

            return agent

        retriever = self.get_retriever(config)
        if not retriever:
            logger.error("Failed to create retriever for linear agent")
            return None

        llm = self.get_llm(config.get("llm", "gpt-4o-mini"))

        # Check if precise citation is enabled
        if config.get("precise_citation", False):
            logger.info("Using precise citation mode with structured outputs")

            parser = PydanticOutputParser(pydantic_object=CitedAnswer)

            rag_prompt_with_citation = """You are answering a question using provided context chunks.
Each chunk is numbered starting from 0. You must track which chunks you use.

Retrieved Context Chunks:
{context_with_indices}

User Question: {question}

Instructions:
1. Answer the question using ONLY the information from the chunks above
2. Track which chunk numbers you actually used to generate your answer
3. Only include chunk indices you directly referenced or paraphrased
4. If you didn't use a chunk, don't include its index

{format_instructions}

Be precise with chunk indices - only list chunks you actually used!"""

            context_prompt = ChatPromptTemplate.from_template(rag_prompt_with_citation)

            answer_chain = (
                {
                    "context_with_indices": lambda x: self.format_context_with_indices(
                        x["retrieved_docs"]
                    ),
                    "question": lambda x: x["question"],
                    "format_instructions": lambda x: parser.get_format_instructions(),
                }
                | context_prompt
                | llm
                | parser
            )

            def filter_by_cited_indices(result):
                """Filter chunks and sources based on cited indices"""
                retrieved_docs = result["retrieved_docs"]
                cited_answer = result["cited_response"]

                # Validate indices
                valid_indices = [
                    i
                    for i in cited_answer.used_chunk_indices
                    if 0 <= i < len(retrieved_docs)
                ]

                if len(valid_indices) != len(cited_answer.used_chunk_indices):
                    logger.warning(
                        f"Model hallucinated chunk indices. "
                        f"Requested: {cited_answer.used_chunk_indices}, "
                        f"Valid: {valid_indices}"
                    )

                # Filter to only used chunks
                used_docs = [retrieved_docs[i] for i in valid_indices]

                return {
                    "response": cited_answer.answer,
                    "contexts": [doc.page_content for doc in used_docs],
                    "source_urls": extract_sources_with_scores(used_docs),
                }

            agent = RunnableParallel(
                {
                    "retrieved_docs": lambda x: retriever.invoke(x),
                    "question": lambda x: x,
                }
            ).assign(cited_response=answer_chain) | RunnableLambda(
                filter_by_cited_indices
            )

        else:
            # Standard mode - use all retrieved chunks
            logger.info("Using standard citation mode (all retrieved chunks)")

            rag_prompt_template = config.get(
                "rag_prompt",
                "Answer the question using only the context"
                "\n\nRetrieved Context: {context}"
                "\n\nUser Question: {question}"
                "\nAnswer the user conversationally. User is not aware of context.",
            )

            context_prompt = ChatPromptTemplate.from_template(rag_prompt_template)

            answer_chain = (
                {
                    "context": lambda x: self.docs2str(x["retrieved_docs"]),
                    "question": lambda x: x["question"],
                }
                | context_prompt
                | llm
                | StrOutputParser()
            )

            agent = RunnableParallel(
                {
                    "retrieved_docs": lambda x: retriever.invoke(x),
                    "question": lambda x: x,
                }
            ).assign(
                response=answer_chain,
                contexts=lambda x: extract_page_contents(x["retrieved_docs"]),
                source_urls=lambda x: extract_sources_with_scores(x["retrieved_docs"]),
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
            model = self.get_litellm_model(config.get("llm", "gpt-4o-mini"))

            tools = []

            max_steps = config.get("max_steps", 4)
            agent = CodeAgent(
                tools=[DuckDuckGoSearchTool()],
                model=model,
                max_steps=max_steps,
                verbosity_level=1,
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
                filter={"_id": ObjectId(chatbot_id)}, collection_name="chatbots"
            )

            if not configs:
                logger.error(f"Chatbot with ID {chatbot_id} not found")
                return None

            config = configs[0]

            logger.info(f"Chatbot config: {config}")
            logger.info(f"Selected LLM: {config.get('llm')}")
            logger.info(f"Collections: {config.get('collections', [])}")
            logger.info(f"Precise Citation: {config.get('precise_citation', False)}")

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
            logger.info(f"=== Processing query: {query}")

            from bson.objectid import ObjectId

            configs = self.mongodb_client.get_docs(
                filter={"_id": ObjectId(chatbot_id)}, collection_name="chatbots"
            )

            if not configs:
                logger.error(f"Chatbot {chatbot_id} not found")
                return {
                    "response": "Chatbot configuration not found.",
                    "contexts": [],
                    "source_urls": [],
                }

            config = configs[0]
            workflow = config.get("workflow")
            logger.info(f"=== Using workflow: {workflow}")

            agent = self.get_agent(chatbot_id)

            if not agent:
                logger.error("Agent creation failed")
                return {
                    "response": "Sorry, I couldn't find the requested chatbot.",
                    "contexts": [],
                    "source_urls": [],
                }

            if workflow == "linear":
                logger.info("=== Invoking linear agent")
                result = agent.invoke(query)
                logger.info(f"=== Linear agent response: {result}")
                return result

            elif workflow == "agentic":
                if config.get("workflow_implementation", "smolagents") == "pydantic_ai":
                    logger.error("pydantic ai response generation not implemented")
                    return {
                        "response": "PydanticAI workflow not yet implemented.",
                        "contexts": [],
                        "source_urls": [],
                    }
                else:
                    logger.info(f"=== Running smolagents with query: {query}")

                    loop = asyncio.get_event_loop()

                    try:
                        response = await asyncio.wait_for(
                            loop.run_in_executor(None, agent.run, query),
                            timeout=120.0,
                        )
                        logger.info(f"=== Smolagents response: {response}")
                        return {"response": response, "contexts": [], "source_urls": []}

                    except asyncio.TimeoutError:
                        logger.error("Agent execution timed out after 120 seconds")
                        return {
                            "response": "Sorry, the request timed out. Please try a simpler query.",
                            "contexts": [],
                            "source_urls": [],
                        }
                    except Exception as agent_error:
                        logger.error(
                            f"Error in agent execution: {str(agent_error)}",
                            exc_info=True,
                        )
                        return {
                            "response": f"Agent error: {str(agent_error)}",
                            "contexts": [],
                            "source_urls": [],
                        }

        except Exception as e:
            logger.error(f"=== Error processing query: {str(e)}", exc_info=True)
            return {
                "response": f"Sorry, an error occurred: {str(e)}",
                "contexts": [],
                "source_urls": [],
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
