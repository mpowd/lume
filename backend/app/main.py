from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import chat, knowledge_base, crawl, evaluation, chatbot

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(knowledge_base.router, prefix="/knowledge_base", tags=["knowledge_base"])
app.include_router(crawl.router, prefix="/crawl", tags=["crawl"])
app.include_router(evaluation.router, prefix="/evaluation", tags=["evaluation"])
app.include_router(chatbot.router, prefix="/chatbot", tags=["chatbot"])

@app.get("/")
async def root():
    return {"message": "Backend is running"}

