
export const OPENAI_MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo']

export const COHERE_RERANKERS = [
  'rerank-v3.5',
  'rerank-english-v3.0',
  'rerank-multilingual-v3.0'
]

export const HUGGINGFACE_RERANKERS = [
  'BAAI/bge-reranker-v2-m3',
  'BAAI/bge-reranker-base',
  'BAAI/bge-reranker-large'
]

export const EMBEDDING_MODELS = [
  { value: 'jina/jina-embeddings-v2-base-de', label: 'Jina Embeddings v2 Base (768d)' }
]

export const DISTANCE_METRICS = [
  { value: 'Cosine similarity', label: 'Cosine Similarity' },
  { value: 'Dot product', label: 'Dot Product' },
  { value: 'Euclidean distance', label: 'Euclidean Distance' },
  { value: 'Manhattan distance', label: 'Manhattan Distance' }
]