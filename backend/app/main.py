from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import chat, knowledge_base, evaluation, chatbot, ollama
from backend.api.routes.sources import website


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(
    knowledge_base.router, prefix="/knowledge_base", tags=["knowledge_base"]
)
app.include_router(website.router, prefix="/website", tags=["website"])
app.include_router(evaluation.router, prefix="/evaluation", tags=["evaluation"])
app.include_router(chatbot.router, prefix="/chatbot", tags=["chatbot"])
app.include_router(ollama.router, prefix="/ollama", tags=["ollama"])


@app.get("/")
async def root():
    return {"message": "Backend is running"}
