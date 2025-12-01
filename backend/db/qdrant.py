import logging
from typing import List, Dict, Any, Optional
from uuid import uuid4

from qdrant_client import QdrantClient as QdrantBaseClient
from qdrant_client.http.models import Distance, SparseVectorParams, VectorParams
from qdrant_client import models
from langchain_qdrant import QdrantVectorStore, RetrievalMode, FastEmbedSparse
from langchain_ollama import OllamaEmbeddings
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import (
    MarkdownHeaderTextSplitter,
    RecursiveCharacterTextSplitter,
)
from langchain_core.documents import Document

logger = logging.getLogger(__name__)


class QdrantClient:
    """Client for Qdrant vector store operations"""

    def __init__(self, url: str = "http://qdrant:6333"):
        self.client = QdrantBaseClient(url=url)
        self.url = url

    def get_embeddings(self, embedding_model: str):
        """
        Get embedding functions for dense and sparse embeddings.

        Args:
            embedding_model: Name of the embedding model

        Returns:
            Dict with dense_embeddings, sparse_embeddings, and embedding_dim
        """

        logger.info(f"get embedding model {embedding_model}")

        if embedding_model == "jina/jina-embeddings-v2-base-de":
            return {
                "dense_embeddings": OllamaEmbeddings(
                    model="jina/jina-embeddings-v2-base-de",
                    base_url="http://host.docker.internal:11434",
                ),
                "sparse_embeddings": FastEmbedSparse(model_name="Qdrant/bm25"),
                "embedding_dim": 768,
            }
        elif embedding_model == "text-embedding-3-small":
            logger.info(f"Fetsching OpenAI Embedding Model '{embedding_model}' from Qdrant Client")
            return {"dense_embeddings": OpenAIEmbeddings(model=embedding_model)}
        else:
            raise ValueError(f"Unsupported embedding model: {embedding_model}")

    def chunk_markdown_documents(
        self,
        documents: List[Dict[str, Any]],
        chunk_size: int = 1000,
        chunk_overlap: int = 100,
    ) -> List[Document]:
        """
        Chunk markdown documents into smaller pieces for embedding.

        Args:
            documents: List of documents with 'markdown', 'url', and 'title' keys
            chunk_size: Maximum size of each chunk
            chunk_overlap: Overlap between consecutive chunks

        Returns:
            List of LangChain Document objects with metadata
        """
        headers_to_split_on = [
            ("#", "Header 1"),
            ("##", "Header 2"),
        ]

        markdown_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=headers_to_split_on, strip_headers=True
        )

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ".", ";", ",", " "],
        )

        all_chunks = []

        for doc_data in documents:
            try:
                markdown_content = doc_data.get("markdown", "")
                if not markdown_content:
                    logger.warning(f"No markdown content for {doc_data.get('url')}")
                    continue

                # Split by markdown headers
                md_header_splits = markdown_splitter.split_text(markdown_content)

                # Further split into chunks
                chunks = text_splitter.split_documents(md_header_splits)

                # Add metadata to each chunk
                for chunk in chunks:
                    if not chunk.metadata:
                        chunk.metadata = {}

                    chunk.metadata["source_url"] = doc_data.get("url")
                    chunk.metadata["title"] = doc_data.get("title", "Untitled")

                    # Add custom payload if present
                    if "custom_payload" in doc_data:
                        chunk.metadata["custom_payload"] = doc_data["custom_payload"]

                    all_chunks.append(chunk)

                logger.info(f"Created {len(chunks)} chunks from {doc_data.get('url')}")

            except Exception as e:
                logger.error(f"Error chunking document {doc_data.get('url')}: {str(e)}")

        return all_chunks

    def store_embeddings(
        self,
        collection_name: str,
        chunks: List[Document],
        embedding_model: str,
    ) -> int:
        """
        Create embeddings and store in Qdrant.

        Args:
            collection_name: Name of the Qdrant collection
            chunks: List of LangChain Document objects to embed
            embedding_model: Name of the embedding model to use

        Returns:
            Number of chunks stored
        """
        if not chunks:
            logger.warning("No chunks to store")
            return 0

        embedder_info = self.get_embeddings(embedding_model)
        dense_embeddings = embedder_info["dense_embeddings"]
        sparse_embeddings = embedder_info["sparse_embeddings"]

        # Generate UUIDs for each chunk
        uuids = [str(uuid4()) for _ in chunks]

        # Create vector store instance
        qdrant = QdrantVectorStore(
            client=self.client,
            collection_name=collection_name,
            embedding=dense_embeddings,
            sparse_embedding=sparse_embeddings,
            retrieval_mode=RetrievalMode.HYBRID,
            vector_name="dense",
            sparse_vector_name="sparse",
        )

        # Add documents with embeddings
        qdrant.add_documents(documents=chunks, ids=uuids)

        logger.info(f"Successfully stored {len(chunks)} chunks in Qdrant")
        return len(chunks)

    def collection_exists(self, collection_name: str) -> bool:
        """Check if a collection exists in Qdrant."""
        try:
            collections = self.client.get_collections()
            return any(col.name == collection_name for col in collections.collections)
        except Exception as e:
            logger.error(f"Error checking collection existence: {str(e)}")
            return False

    def delete_collection(self, collection_name: str) -> bool:
        """Delete a collection from Qdrant."""
        try:
            self.client.delete_collection(collection_name=collection_name)
            logger.info(f"Deleted Qdrant collection: {collection_name}")
            return True
        except Exception as e:
            logger.error(f"Error deleting collection {collection_name}: {str(e)}")
            return False

    def get_collection_info(self, collection_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a collection."""
        try:
            return self.client.get_collection(collection_name=collection_name)
        except Exception as e:
            logger.error(f"Error getting collection info: {str(e)}")
            return None
