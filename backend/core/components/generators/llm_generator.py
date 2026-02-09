from typing import List, Dict, Any
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, PydanticOutputParser
from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama
from pydantic import BaseModel, Field
import logging
import os
import time

logger = logging.getLogger(__name__)


class CitedAnswer(BaseModel):
    """Answer with citation information"""

    answer: str = Field(description="The answer to the user's question")
    used_chunk_indices: List[int] = Field(
        description="List of chunk indices (0-based) used to generate the answer"
    )


class LLMGenerator:
    """LLM-based answer generator"""

    DEFAULT_SYSTEM_PROMPT = """You are a helpful assistant that answers questions using only the provided context.
Answer conversationally without mentioning the context or chunks to the user."""

    DEFAULT_USER_PROMPT = """Context:
{context}

Question: {question}"""

    DEFAULT_PRECISE_CITATION_SYSTEM = """You are answering questions using provided context chunks.
Each chunk is numbered starting from 0. Track which chunks you use.

Instructions:
1. Answer using ONLY information from the chunks
2. Track which chunk numbers you actually used
3. Only include chunk indices you directly referenced
4. Do not include the used chunks in the answer

{format_instructions}"""

    DEFAULT_PRECISE_CITATION_USER = """Context Chunks:
{context_with_indices}

Question: {question}"""

    def _get_llm(self, model_name: str, provider: str):
        """Get LLM instance"""
        if provider == "openai":
            return ChatOpenAI(
                model=model_name,
                api_key=os.getenv("OPENAI_API_KEY"),
                # temperature=0,
            )
        else:  # ollama
            return ChatOllama(
                model=model_name,
                # temperature=0,
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
            collection_name = doc.metadata.get("collection_name")

            if score is not None:
                sources.append(
                    {
                        "url": source if source else "Unknown source",
                        "score": float(score),
                        "metadata": {"collection_name": collection_name},
                    }
                )
            elif include_without_scores:
                sources.append(
                    {
                        "url": source if source else "Unknown source",
                        "metadata": {"collection_name": collection_name},
                    }
                )

        return sources

    async def generate(
        self, query: str, documents: List[Document], config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate answer from query and documents"""

        llm = self._get_llm(config.get("llm_model"), config.get("llm_provider"))

        # Check if precise citation is enabled
        if config.get("precise_citation", False):
            logger.info("Using precise citation mode")

            parser = PydanticOutputParser(pydantic_object=CitedAnswer)

            system_prompt = config.get(
                "precise_citation_system_prompt", self.DEFAULT_PRECISE_CITATION_SYSTEM
            )
            user_prompt = config.get(
                "precise_citation_user_prompt", self.DEFAULT_PRECISE_CITATION_USER
            )

            prompt = ChatPromptTemplate.from_messages(
                [("system", system_prompt), ("user", user_prompt)]
            )

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

            system_prompt = config.get("system_prompt", self.DEFAULT_SYSTEM_PROMPT)
            user_prompt = config.get("user_prompt", self.DEFAULT_USER_PROMPT)

            prompt = ChatPromptTemplate.from_messages(
                [("system", system_prompt), ("user", user_prompt)]
            )

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

    async def generate_stream(
        self, query: str, documents: List[Document], config: Dict[str, Any]
    ):
        llm = self._get_llm(config.get("llm_model"), config.get("llm_provider"))

        if config.get("precise_citation", False):

            response_dict = await self.generate(query, documents, config)
            yield response_dict
        else:
            system_prompt = config.get("system_prompt", self.DEFAULT_SYSTEM_PROMPT)
            user_prompt = config.get("user_prompt", self.DEFAULT_USER_PROMPT)

            prompt = ChatPromptTemplate.from_messages(
                [("system", system_prompt), ("user", user_prompt)]
            )

            chain_input = {
                "context": lambda x: self._format_context(x["documents"]),
                "question": lambda x: x["question"],
            }

            references = config.get("references", [])
            if references:
                for ref in references:
                    ref_name = ref.get("name")
                    ref_text = ref.get("text")
                    if ref_name and ref_text:
                        chain_input[ref_name] = (lambda text: lambda x: text)(ref_text)

            chain = chain_input | prompt | llm | StrOutputParser()

            for token in chain.stream({"documents": documents, "question": query}):
                # logger.info(f"llm_generator token stream: {token}")
                yield (token)
