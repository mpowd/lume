"""
LLM Generator for answer generation with RAG
"""

from typing import List, Dict, Any
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, PydanticOutputParser
from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama
from pydantic import BaseModel, Field
import logging
import os

logger = logging.getLogger(__name__)


class CitedAnswer(BaseModel):
    """Answer with citation information"""

    answer: str = Field(description="The answer to the user's question")
    used_chunk_indices: List[int] = Field(
        description="List of chunk indices (0-based) used to generate the answer"
    )


class LLMGenerator:
    """LLM-based answer generator"""

    def _get_llm(self, model_name: str, provider: str):
        """Get LLM instance"""
        if provider == "openai":
            return ChatOpenAI(
                model=model_name,
                api_key=os.environ.get("OPENAI_API_KEY"),
                temperature=0,
            )
        else:  # ollama
            return ChatOllama(
                model=model_name,
                temperature=0,
                base_url="http://host.docker.internal:11434",
            )

    def _format_context(self, documents: List[Document]) -> str:
        """Format documents as context string"""
        context_parts = []
        for doc in documents:
            doc_name = doc.metadata.get("Title", "Document")
            content = doc.page_content
            context_parts.append(f"[Quote from {doc_name}] {content}")
        return "\n\n".join(context_parts)

    def _format_context_with_indices(self, documents: List[Document]) -> str:
        """Format documents with chunk indices for precise citation"""
        return "\n\n".join(
            [f"[Chunk {i}]\n{doc.page_content}" for i, doc in enumerate(documents)]
        )

    def _extract_sources(
        self, documents: List[Document], include_without_scores: bool = False
    ) -> List[Dict[str, Any]]:
        """Extract source URLs and scores from documents"""
        sources = []

        for doc in documents:
            source = (
                doc.metadata.get("source")
                or doc.metadata.get("url")
                or doc.metadata.get("source_url")
            )

            score = doc.metadata.get("relevance_score")

            if score is not None:
                sources.append(
                    {
                        "url": source if source else "Unknown source",
                        "score": float(score),
                    }
                )
            elif include_without_scores:
                sources.append({"url": source if source else "Unknown source"})

        return sources

    async def generate(
        self, query: str, documents: List[Document], config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate answer from query and documents"""

        if not documents:
            return {
                "answer": "I couldn't find any relevant information to answer your question.",
                "sources": [],
                "contexts": [],
            }

        llm = self._get_llm(
            config.get("llm_model", "gpt-4o-mini"), config.get("llm_provider", "openai")
        )

        # Check if precise citation is enabled
        if config.get("precise_citation", False):
            logger.info("Using precise citation mode")

            parser = PydanticOutputParser(pydantic_object=CitedAnswer)

            prompt_template = """You are answering a question using provided context chunks.
Each chunk is numbered starting from 0. Track which chunks you use.

Retrieved Context Chunks:
{context_with_indices}

User Question: {question}

Instructions:
1. Answer using ONLY information from the chunks above
2. Track which chunk numbers you actually used
3. Only include chunk indices you directly referenced
4. If you didn't use a chunk, don't include its index

{format_instructions}

Be precise with chunk indices!"""

            prompt = ChatPromptTemplate.from_template(prompt_template)

            chain = (
                {
                    "context_with_indices": lambda x: self._format_context_with_indices(
                        x["documents"]
                    ),
                    "question": lambda x: x["question"],
                    "format_instructions": lambda x: parser.get_format_instructions(),
                }
                | prompt
                | llm
                | parser
            )

            result = chain.invoke({"documents": documents, "question": query})

            # Filter documents by cited indices
            valid_indices = [
                i for i in result.used_chunk_indices if 0 <= i < len(documents)
            ]

            if len(valid_indices) != len(result.used_chunk_indices):
                logger.warning("Model hallucinated some chunk indices")

            used_docs = [documents[i] for i in valid_indices]

            return {
                "answer": result.answer,
                "sources": self._extract_sources(
                    used_docs, include_without_scores=not config.get("reranking", False)
                ),
                "contexts": [doc.page_content for doc in used_docs],
            }

        else:
            logger.info("Using standard citation mode")

            rag_prompt = config.get(
                "rag_prompt",
                "Answer the question using only the context provided.\n\n"
                "Retrieved Context: {context}\n\n"
                "User Question: {question}\n\n"
                "Answer conversationally. User is not aware of context.",
            )

            prompt = ChatPromptTemplate.from_template(rag_prompt)

            chain = (
                {
                    "context": lambda x: self._format_context(x["documents"]),
                    "question": lambda x: x["question"],
                }
                | prompt
                | llm
                | StrOutputParser()
            )

            answer = chain.invoke({"documents": documents, "question": query})

            return {
                "answer": answer,
                "sources": self._extract_sources(
                    documents, include_without_scores=not config.get("reranking", False)
                ),
                "contexts": [doc.page_content for doc in documents],
            }
