# backend/api/routes/file_upload.py
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import json
import asyncio
import os
import logging
from datetime import datetime
from uuid import uuid4
from typing import Dict, Any, List, Optional
import tempfile
from llama_parse import LlamaParse
from fastapi.responses import FileResponse
import mimetypes


from langchain_text_splitters import (
    CharacterTextSplitter,
)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory storage for task progress
upload_tasks: Dict[str, Dict[str, Any]] = {}


class ProgressStage(BaseModel):
    """Represents a single stage in the upload process"""

    label: str
    current: Optional[int] = None
    total: Optional[int] = None
    unit: Optional[str] = "items"
    is_current: bool = False
    show_percentage: bool = True
    icon: Optional[str] = None
    current_item: Optional[str] = None


class CompletionStat(BaseModel):
    """Represents a completion statistic"""

    label: str
    value: int
    variant: str = "info"


class UploadProgress(BaseModel):
    status: str
    title: str
    message: str
    stages: List[ProgressStage]
    stats: List[CompletionStat] = []
    failed: List[str] = []


async def save_files_to_mongodb(
    task_id: str, file_data_list: List[dict], collection_name: str
):
    """
    Step 1: Save raw file content and metadata to MongoDB
    """
    from backend.db.mongodb import MongoDBClient

    total_files = len(file_data_list)
    saved_files = []
    failed_files = []

    upload_tasks[task_id]["status"] = "saving_to_mongodb"
    upload_tasks[task_id]["title"] = "Saving Files to MongoDB"
    upload_tasks[task_id]["message"] = "Storing file metadata and content..."

    # Set first stage as current
    upload_tasks[task_id]["stages"][0]["is_current"] = True
    upload_tasks[task_id]["stages"][0]["current"] = 0
    upload_tasks[task_id]["stages"][0]["total"] = total_files

    try:
        mongodb_client = MongoDBClient.get_instance()

        # Get collection configuration
        collection_info = mongodb_client.get_docs(
            filter={"collection_name": collection_name},
            collection_name="configurations",
        )

        if not collection_info:
            upload_tasks[task_id]["status"] = "completed"
            upload_tasks[task_id][
                "title"
            ] = f"Error: No collection configuration document found for collection {collection_name}"
            upload_tasks[task_id]["stages"][0]["is_current"] = True
            upload_tasks[task_id][
                "message"
            ] = f"Error: No collection configuration document found for collection {collection_name}"
            return

        config_doc = collection_info[0]
        mongodb_documents = []

        data_dir = "/data"
        collection_dir = os.path.join(data_dir, "files", collection_name)
        os.makedirs(collection_dir, exist_ok=True)

        for idx, file_data in enumerate(file_data_list):
            filename = file_data["filename"]

            try:
                upload_tasks[task_id]["stages"][0]["current"] = idx
                upload_tasks[task_id]["stages"][0]["current_item"] = filename
                upload_tasks[task_id]["message"] = f"Saving {filename} to MongoDB..."

                file_path = os.path.join(collection_dir, filename)
                with open(file_path, "wb") as f:
                    f.write(file_data["content"])

                parser = LlamaParse(
                    result_type="markdown",  # "markdown" and "text" are available
                    base_url="https://api.cloud.eu.llamaindex.ai",
                    split_by_page=False,
                )

                file_name = file_path
                logger.error(file_name)
                extra_info = {"file_name": file_name}

                with open(file_path, "rb") as f:
                    documents = parser.load_data(f, extra_info=extra_info)

                content = ""
                for doc in documents:
                    content += doc.text_resource.text

                # Prepare document for MongoDB
                document = {
                    "filename": filename,
                    "filepath": file_path,
                    "content": content,
                    "size": len(content),
                    "upload_date": datetime.now(),
                    "collection_name": collection_name,
                    "file_id": str(uuid4()),
                }

                mongodb_client.persist_docs(
                    docs=[document], collection_name=collection_name
                )
                mongodb_documents.append(document)
                await asyncio.sleep(0.1)

                saved_files.append(filename)
                logger.info(f"Saved {filename} to MongoDB")

            except Exception as e:
                logger.error(f"Error saving {filename} to MongoDB: {str(e)}")
                failed_files.append(filename)

        upload_tasks[task_id]["stages"][0]["current"] = total_files
        upload_tasks[task_id]["stages"][0]["is_current"] = False

        return saved_files, failed_files, config_doc, mongodb_documents

    except Exception as e:
        logger.error(f"Error in save_files_to_mongodb: {str(e)}")
        upload_tasks[task_id]["status"] = "error"
        upload_tasks[task_id]["title"] = "MongoDB Save Failed"
        upload_tasks[task_id]["message"] = str(e)
        raise


async def chunk_files(
    task_id: str,
    mongodb_files: List[dict],
    collection_name: str,
    collection_config: dict,
):
    """
    Step 2: Chunk each file into smaller pieces
    """

    total_files = len(mongodb_files)
    all_chunks = []
    processed_files = []
    failed_files = []

    upload_tasks[task_id]["status"] = "chunking"
    upload_tasks[task_id]["title"] = "Chunking Files"
    upload_tasks[task_id]["stages"][1]["is_current"] = True
    upload_tasks[task_id]["message"] = "Breaking files into chunks..."

    chunk_size = collection_config.get("chunk_size", 1000)
    chunk_overlap = collection_config.get("chunk_overlap", 100)
    embedding_model = collection_config.get("dense_embedding_model")

    try:
        text_splitter = CharacterTextSplitter.from_tiktoken_encoder(
            encoding_name="cl100k_base",
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

        all_chunks = []

        for idx, file_data in enumerate(mongodb_files):
            filename = file_data["filename"]

            try:
                upload_tasks[task_id]["stages"][1]["current"] = idx
                upload_tasks[task_id]["stages"][1]["current_item"] = filename
                upload_tasks[task_id]["message"] = f"Chunking {filename}..."

                chunks = text_splitter.create_documents([file_data["content"]])

                # Add metadata to each chunk
                for chunk_idx, chunk in enumerate(chunks):
                    chunk.metadata.update(
                        {
                            "source_url": filename,
                            "chunk_index": chunk_idx,
                            "total_chunks": len(chunks),
                            "collection_name": collection_name,
                            "source_category": "file",
                            "chunk_id": str(uuid4()),
                        }
                    )

                all_chunks.extend(chunks)
                processed_files.append(filename)

                logger.info(f"Chunked {filename} into {len(chunks)} pieces")

                await asyncio.sleep(0.1)

            except Exception as e:
                logger.error(f"Error chunking {filename}: {str(e)}")
                failed_files.append(filename)

        upload_tasks[task_id]["stages"][1]["current"] = total_files
        upload_tasks[task_id]["stages"][1]["is_current"] = False
        upload_tasks[task_id]["stages"][2]["total"] = len(all_chunks)

        return all_chunks, processed_files, failed_files

    except Exception as e:
        logger.error(f"Error in chunk_files: {str(e)}")
        upload_tasks[task_id]["status"] = "error"
        upload_tasks[task_id]["title"] = "Chunking Failed"
        upload_tasks[task_id]["message"] = str(e)
        raise


async def save_chunks_to_qdrant(task_id: str, chunks: List[Any], collection_name: str):
    """
    Step 3: Save chunks to Qdrant vector database
    """
    from langchain_ollama import OllamaEmbeddings
    from qdrant_client import QdrantClient
    from langchain_qdrant import QdrantVectorStore, RetrievalMode, FastEmbedSparse

    total_chunks = len(chunks)
    saved_chunks = 0

    upload_tasks[task_id]["status"] = "saving_to_qdrant"
    upload_tasks[task_id]["title"] = "Saving to Qdrant"
    upload_tasks[task_id]["stages"][2]["is_current"] = True
    upload_tasks[task_id][
        "message"
    ] = "Creating embeddings and storing in vector database..."

    try:
        qdrant_client = QdrantClient(url="http://qdrant:6333")

        qdrant = QdrantVectorStore(
            client=qdrant_client,
            collection_name=collection_name,
            embedding=OllamaEmbeddings(
                model="jina/jina-embeddings-v2-base-de",
                base_url="http://host.docker.internal:11434",
            ),
            sparse_embedding=FastEmbedSparse(model_name="Qdrant/bm25"),
            retrieval_mode=RetrievalMode.HYBRID,
            vector_name="dense",
            sparse_vector_name="sparse",
        )

        batch_size = 10
        for i in range(0, total_chunks, batch_size):
            batch = chunks[i : i + batch_size]

            current = min(i + batch_size, total_chunks)
            upload_tasks[task_id]["stages"][2]["current"] = current
            upload_tasks[task_id][
                "message"
            ] = f"Saving chunks {current}/{total_chunks} to Qdrant..."

            batch_uuids = [chunk.metadata["chunk_id"] for chunk in batch]
            qdrant.add_documents(documents=batch, ids=batch_uuids)

            await asyncio.sleep(0.1)

            saved_chunks = current
            logger.info(
                f"Saved batch {i//batch_size + 1}: {current}/{total_chunks} chunks"
            )

        upload_tasks[task_id]["stages"][2]["current"] = total_chunks
        upload_tasks[task_id]["stages"][2]["is_current"] = False

        return saved_chunks

    except Exception as e:
        logger.error(f"Error in save_chunks_to_qdrant: {str(e)}")
        upload_tasks[task_id]["status"] = "error"
        upload_tasks[task_id]["title"] = "Qdrant Save Failed"
        upload_tasks[task_id]["message"] = str(e)
        raise


async def upload_files_background(
    task_id: str, collection_name: str, file_data_list: List[dict]
):
    """
    Main background processing function that orchestrates all steps
    """
    try:
        # Step 1: Save to MongoDB
        saved_files, mongodb_failed, collection_config, mongodb_files = (
            await save_files_to_mongodb(task_id, file_data_list, collection_name)
        )

        if upload_tasks[task_id]["status"] == "error":
            return

        # Step 2: Chunk files
        chunks, processed_files, chunking_failed = await chunk_files(
            task_id, mongodb_files, collection_name, collection_config
        )

        if upload_tasks[task_id]["status"] == "error":
            return

        # Step 3: Save chunks to Qdrant
        saved_chunks = await save_chunks_to_qdrant(task_id, chunks, collection_name)

        if upload_tasks[task_id]["status"] == "error":
            return

        # All steps complete - update to completion status
        all_failed = list(set(mongodb_failed + chunking_failed))

        upload_tasks[task_id]["status"] = "complete"
        upload_tasks[task_id]["title"] = "Upload Complete!"
        upload_tasks[task_id][
            "message"
        ] = f"Successfully processed {len(processed_files)} files"

        # Only show 3 stats: Files Processed, Chunks Created, Failed
        upload_tasks[task_id]["stats"] = [
            {
                "label": "Files Processed",
                "value": len(processed_files),
                "variant": "success",
            },
            {"label": "Chunks Created", "value": len(chunks), "variant": "info"},
            {
                "label": "Failed",
                "value": len(all_failed),
                "variant": "danger" if all_failed else "success",
            },
        ]
        upload_tasks[task_id]["failed"] = all_failed

        logger.info(f"Upload complete for task {task_id}")

    except Exception as e:
        logger.error(f"Error in background processing: {str(e)}")
        upload_tasks[task_id]["status"] = "error"
        upload_tasks[task_id]["title"] = "Processing Failed"
        upload_tasks[task_id]["message"] = str(e)


@router.post("/upload-files")
async def upload_files(
    collection_name: str = Form(...), files: List[UploadFile] = File(...)
):
    """
    Start file upload task and return task ID
    """
    task_id = str(uuid4())

    file_data_list = []
    for file in files:
        content = await file.read()
        file_data_list.append({"content": content, "filename": file.filename})

    # Initialize task with 3 stages
    upload_tasks[task_id] = {
        "status": "starting",
        "title": "Starting Upload",
        "message": f"Preparing to process {len(files)} files...",
        "stages": [
            {
                "label": "Stage 1: Saving to MongoDB",
                "current": 0,
                "total": len(files),
                "unit": "files",
                "is_current": False,
                "show_percentage": True,
                "icon": "",
                "current_item": None,
            },
            {
                "label": "Stage 2: Chunking Files",
                "current": 0,
                "total": len(files),
                "unit": "files",
                "is_current": False,
                "show_percentage": True,
                "icon": "",
                "current_item": None,
            },
            {
                "label": "Stage 3: Saving vector embeddings to Qdrant",
                "current": 0,
                "total": 0,
                "unit": "chunks",
                "is_current": False,
                "show_percentage": True,
                "icon": "",
                "current_item": None,
            },
        ],
        "stats": [],
        "failed": [],
        "collection_name": collection_name,
        "start_time": datetime.now(),
    }

    asyncio.create_task(
        upload_files_background(task_id, collection_name, file_data_list)
    )

    return JSONResponse(
        content={"task_id": task_id, "message": "Upload started successfully"}
    )


@router.get("/upload-progress/{task_id}")
async def get_upload_progress(task_id: str):
    """
    Get upload progress for a specific task
    """
    if task_id not in upload_tasks:
        return JSONResponse(content={"error": "Task not found"}, status_code=404)

    task = upload_tasks[task_id]

    return JSONResponse(
        content={
            "status": task["status"],
            "title": task["title"],
            "message": task["message"],
            "stages": task["stages"],
            "stats": task.get("stats", []),
            "failed": task.get("failed", []),
        }
    )


@router.get("/files/{collection_name}/{filename}")
async def get_file(collection_name: str, filename: str):
    """
    Serve uploaded files from the data directory
    """
    file_path = os.path.join("/data", "files", collection_name, filename)

    logger.info(f"Frontend asked for file {filename} from collection {collection_name}")

    if not os.path.exists(file_path):
        return JSONResponse(content={"error": "File not found"}, status_code=404)

    mime_type, _ = mimetypes.guess_type(filename)

    if mime_type is None:
        if filename.lower().endswith(".pdf"):
            mime_type = "application/pdf"
        elif filename.lower().endswith((".doc", ".docx")):
            mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif filename.lower().endswith(".txt"):
            mime_type = "text/plain"
        else:
            mime_type = "application/octet-stream"

    return FileResponse(
        file_path,
        media_type=mime_type,
        filename=filename,
        headers={
            "Content-Disposition": f"inline; filename={filename}",
        },
    )
