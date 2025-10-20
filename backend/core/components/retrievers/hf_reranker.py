"""
HuggingFace reranker using FlagEmbedding
"""

from typing import List
from langchain_core.documents import Document
from FlagEmbedding import FlagReranker
import logging

logger = logging.getLogger(__name__)


class HuggingFaceReranker:
    """HuggingFace reranker compatible with LangChain"""

    def __init__(
        self,
        model_name: str = "BAAI/bge-reranker-v2-m3",
        top_n: int = 5,
        use_fp16: bool = True,
    ):
        self.model_name = model_name
        self.top_n = top_n

        logger.info(f"Loading FlagEmbedding reranker: {model_name}")
        self.reranker = FlagReranker(model_name, use_fp16=use_fp16)
        logger.info("Reranker loaded successfully")

    def compress_documents(
        self,
        documents: List[Document],
        query: str,
    ) -> List[Document]:
        """Rerank documents (LangChain interface)"""

        if not documents:
            return []

        logger.info(f"Reranking {len(documents)} documents")

        # Prepare pairs
        pairs = [[query, doc.page_content] for doc in documents]

        # Compute scores
        scores = self.reranker.compute_score(pairs, normalize=True)

        # Handle single score
        if not isinstance(scores, list):
            scores = [scores]

        # Create scored pairs
        doc_score_pairs = list(zip(documents, scores))

        # Sort by score
        doc_score_pairs.sort(key=lambda x: x[1], reverse=True)

        # Take top_n
        top_docs = doc_score_pairs[: self.top_n]

        # Add scores to metadata
        reranked_docs = []
        for doc, score in top_docs:
            new_doc = Document(
                page_content=doc.page_content,
                metadata={**doc.metadata, "relevance_score": float(score)},
            )
            reranked_docs.append(new_doc)

        logger.info(f"Reranked to top {len(reranked_docs)} documents")

        return reranked_docs
