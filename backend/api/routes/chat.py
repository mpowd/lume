from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.app.core.agents.smolagents_agent import SearchAgent
from backend.app.core.tools.retriever import RetrieverTool
import logging
from smolagents import ToolCallingAgent, LiteLLMModel, DuckDuckGoSearchTool, CodeAgent
import os
from langchain_ollama import ChatOllama

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
search_agent = None
retriever_tool = None

class SearchQuery(BaseModel):
    query: str

@router.post("/search")
async def search_query(query: SearchQuery):
    try:
        logger.info(f"Received query: {query.query}")
        # global retriever_tool
        # if retriever_tool is None:
        #     retriever_tool = RetrieverTool()
        # response = search_agent.respond(query.query) 
        # response = CodeAgent(tools=[retriever_tool], model=LiteLLMModel(model_id="gpt-4o-mini", api_key=os.environ["OPENAI_API_KEY"]), max_steps=4, add_base_tools=True, verbosity_level=2).run(query.query)
        # response = CodeAgent(tools=[retriever_tool], model=ChatOllama(model="qwen", base_url="http://ollama:11434"), max_steps=4, verbosity_level=2).run(query.query)
        llm = "ollama_chat/qwen2.5-coder:7b"
        model = LiteLLMModel(
            model_id=llm, # This model is a bit weak for agentic behaviours though
            api_base="http://ollama:11434", # replace with 127.0.0.1:11434 or remote open-ai compatible server if necessary
            num_ctx=8192*2, # ollama default is 2048 which will fail horribly. 8192 works for easy tasks, more is better. Check https://huggingface.co/spaces/NyxKrage/LLM-Model-VRAM-Calculator to calculate how much VRAM this will need for the selected model.
        )
        # response = CodeAgent(
        #     # tools=[retriever_tool], 
        #     # model=LiteLLMModel(model_id="ollama/qwen", api_base="http://ollama:11434"), 
        #     model=model,
        #     max_steps=4, 
        #     verbosity_level=2,
        #     add_base_tools=True,
        # ).run(query.query)
        response = CodeAgent(tools=[], model=LiteLLMModel(model_id="gpt-4o-mini", api_key=os.environ["OPENAI_API_KEY"]), max_steps=4, add_base_tools=True, verbosity_level=2).run(query.query)
        # return {"response": response}
        return {"response": response}
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))