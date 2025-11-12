"""
HuggingFace reranker using FlagEmbedding
"""

from typing import List, Sequence, Any
from langchain_core.documents import Document
from langchain.retrievers.document_compressors.base import BaseDocumentCompressor
from langchain_core.callbacks import Callbacks
from pydantic import Field, PrivateAttr
from FlagEmbedding import FlagReranker
import logging

logger = logging.getLogger(__name__)


class HuggingFaceReranker(BaseDocumentCompressor):
    """HuggingFace reranker compatible with LangChain"""

    model_name: str = Field(
        default="BAAI/bge-reranker-v2-m3", description="HuggingFace model name"
    )
    top_n: int = Field(
        default=5, description="Number of documents to return after reranking"
    )
    use_fp16: bool = Field(default=True, description="Use FP16 for faster inference")

    # Private attribute for the reranker instance
    _reranker: Any = PrivateAttr()

    def __init__(
        self,
        model_name: str = "BAAI/bge-reranker-v2-m3",
        top_n: int = 5,
        use_fp16: bool = True,
        **kwargs,
    ):
        super().__init__(
            model_name=model_name, top_n=top_n, use_fp16=use_fp16, **kwargs
        )

        logger.info(f"Loading FlagEmbedding reranker: {model_name}")
        self._reranker = FlagReranker(model_name, use_fp16=use_fp16)
        logger.info("Reranker loaded successfully")

    def compress_documents(
        self,
        documents: Sequence[Document],
        query: str,
        callbacks: Callbacks = None,
    ) -> Sequence[Document]:
        """Rerank documents (LangChain interface)"""

        if not documents:
            return []

        logger.info(f"Reranking {len(documents)} documents")

        # Prepare pairs
        pairs = [[query, doc.page_content] for doc in documents]

        # Compute scores
        scores = self._reranker.compute_score(pairs, normalize=True)

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
