"""
Hybrid retriever combining vector and keyword search
"""

from typing import List, Dict, Any
from langchain_core.documents import Document
from langchain_qdrant import QdrantVectorStore, RetrievalMode, FastEmbedSparse
from langchain_ollama import OllamaEmbeddings
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_ollama import ChatOllama
from langchain_core.runnables import RunnableLambda
from langchain_community.document_transformers import LongContextReorder


from qdrant_client import QdrantClient
import logging
import os

logger = logging.getLogger(__name__)


class HybridRetriever:
    """Hybrid retriever with support for HyDE and reranking"""

    def __init__(self):
        self.sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")
        self.embeddings = OllamaEmbeddings(
            model="jina/jina-embeddings-v2-base-de",
            base_url="http://host.docker.internal:11434",
        )
        # self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        # logger.info(f"Retriever uses OpenAI Embedding Model")

        self.client = QdrantClient(url="http://qdrant:6333", timeout=10.0)

    def _get_llm(self, model_name: str, provider: str):
        """Get LLM for HyDE"""
        if provider == "openai":
            return ChatOpenAI(
                model=model_name,
                api_key=os.environ.get("OPENAI_API_KEY"),
                # temperature=0,
            )
        else:  # ollama
            return ChatOllama(
                model=model_name,
                # temperature=0,
                base_url="http://host.docker.internal:11434",
            )

    def _generate_hypothetical_document(self, query: str, hyde_prompt: str, llm) -> str:
        """Generate hypothetical document for HyDE"""
        try:
            formatted_prompt = hyde_prompt.format(question=query)
            response = llm.invoke(formatted_prompt)

            if hasattr(response, "content"):
                return response.content
            return str(response)

        except Exception as e:
            logger.error(f"Error generating hypothetical document: {str(e)}")
            return query

    def _get_base_retriever(
        self, collection_name: str, hybrid_search: bool, top_k: int
    ):
        """Create base vector store retriever"""
        retrieval_mode = RetrievalMode.HYBRID if hybrid_search else RetrievalMode.DENSE

        vector_store = QdrantVectorStore(
            client=self.client,
            collection_name=collection_name,
            embedding=self.embeddings,
            sparse_embedding=self.sparse_embeddings,
            retrieval_mode=retrieval_mode,
            vector_name="dense",
            sparse_vector_name="sparse",
        )

        return vector_store.as_retriever(
            # search_kwargs={"k": top_k, "score_threshold": 0.1}
            search_kwargs={"k": top_k}
        )

    def _apply_reranking(
        self, retriever, reranker_provider: str, reranker_model: str, top_n: int
    ):
        """Apply reranking to retriever"""
        from langchain.retrievers import ContextualCompressionRetriever

        if reranker_provider == "cohere":
            from langchain_cohere import CohereRerank

            if not os.environ.get("COHERE_API_KEY"):
                logger.warning("COHERE_API_KEY not set, skipping reranking")
                return retriever

            reranker = CohereRerank(
                cohere_api_key=os.environ.get("COHERE_API_KEY"),
                model=reranker_model,
                top_n=top_n,
            )

            return ContextualCompressionRetriever(
                base_compressor=reranker,
                base_retriever=retriever,
            )

        elif reranker_provider == "huggingface":
            from backend.core.components.retrievers.hf_reranker import (
                HuggingFaceReranker,
            )

            reranker = HuggingFaceReranker(model_name=reranker_model, top_n=top_n)

            return ContextualCompressionRetriever(
                base_compressor=reranker,
                base_retriever=retriever,
            )

        return retriever

    async def retrieve(
        self, query: str, knowledge_base_ids: List[str], config: Dict[str, Any]
    ) -> List[Document]:
        """Retrieve relevant documents"""

        if not knowledge_base_ids:
            logger.warning("No knowledge bases specified")
            return []

        # Use first collection for now
        collection_name = knowledge_base_ids[0]
        logger.info(f"Retrieving from collection: {collection_name}")

        # Get base retriever
        retriever = self._get_base_retriever(
            collection_name=collection_name,
            hybrid_search=config.get("hybrid_search"),
            top_k=config.get("top_k"),
        )

        # Apply HyDE if enabled
        if config.get("use_hyde", False):
            hyde_prompt = config.get(
                "hyde_prompt",
                "Given a question, generate a paragraph that answers it.\n\nQuestion: {question}\n\nParagraph: ",
            )

            llm = self._get_llm(
                config.get("llm_model", "gpt-4o-mini"),
                config.get("llm_provider", "openai"),
            )

            hypothetical_doc = self._generate_hypothetical_document(
                query, hyde_prompt, llm
            )
            logger.info(f"Generated hypothetical doc: {hypothetical_doc[:100]}...")

            # Use hypothetical doc for retrieval
            query_to_use = hypothetical_doc
        else:
            query_to_use = query

        # Apply reranking if enabled
        if config.get("reranking", False):
            top_n = config.get("top_n") or max(1, int(config.get("top_k", 10) / 2))
            retriever = self._apply_reranking(
                retriever,
                config.get("reranker_provider", "cohere"),
                config.get("reranker_model", "rerank-v3.5"),
                top_n,
            )
            logger.info(f"Applied reranking with top_n={top_n}")
        # else:
        #     # Apply long context reorder only if not reranking
        #     retriever = retriever | RunnableLambda(
        #         LongContextReorder().transform_documents
        #     )

        # Execute retrieval
        logger.info(f"Using query {query_to_use} to find similar chunks.")
        documents = retriever.invoke(query_to_use)
        logger.info(f"Retrieved {len(documents)} documents")

        return documents
