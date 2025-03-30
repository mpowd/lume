from smolagents import Tool
# from langchain_community.retrievers import BM25Retriever
from langchain_qdrant import FastEmbedSparse, QdrantVectorStore, RetrievalMode
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Distance, SparseVectorParams, VectorParams
from langchain_ollama import OllamaEmbeddings


class RetrieverTool(Tool):
    name = "retriever"
    description = "Führt eine semantische Suche durch, um die Teile der hinterlegten Dokumente zu finden, die für die Beantwortung deiner Abfrage am relevantesten sein könnten."
    inputs = {
        "query": {
            "type": "string",
            "description": "Die durchzuführende Abfrage. Diese sollte semantisch nah an Ihren Zieldokumenten sein. Verwende eher eine affirmative Form als eine Frage.",
        }
    }
    output_type = "string"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")
        embeddings = OllamaEmbeddings(model="jina/jina-embeddings-v2-base-de", base_url="http://ollama:11434")
        qdrant = QdrantVectorStore.from_existing_collection(
            # client=client,
            url="http://qdrant:6333",
            collection_name="test",
            embedding=embeddings,
            sparse_embedding=sparse_embeddings,
            retrieval_mode=RetrievalMode.HYBRID,
            vector_name="dense",
            sparse_vector_name="sparse",
        )
        self.retriever = qdrant.as_retriever(search_type="mmr", search_kwargs={"k": 10})

    def forward(self, query: str) -> str:
        assert isinstance(query, str), "Your search query must be a string"

        docs = self.retriever.invoke(
            query,
        )
        return "\nRetrieved documents:\n" + "".join(
            [
                f"\n\n===== Document {str(i)} =====\n" + doc.page_content
                for i, doc in enumerate(docs)
            ]
        )

