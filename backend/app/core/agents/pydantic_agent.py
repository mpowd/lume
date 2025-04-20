from typing import Dict, List, Any, Optional, Union
import logging
from pydantic import BaseModel
from dataclasses import dataclass

from pydantic_ai import Agent as PydanticAgent
from pydantic_ai import RunContext, ModelRetry
import os

from backend.app.core.tools.retriever import RetrieverTool
from backend.db.mongodb import MongoDBClient
from langchain_qdrant import QdrantVectorStore, RetrievalMode
from langchain_core.documents import Document

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class AgentDependencies:
    """Dependencies for the PydanticAI agent"""
    mongodb_client: Any
    collections: List[str]
    retriever_tool: Any = None
    search_enabled: bool = False
    calculator_enabled: bool = False

class ChatResponse(BaseModel):
    """Structured output for the PydanticAI agent"""
    response: Union[str, List[str]]
    source_documents: List[str] = []

class PydanticAgentFactory:
    """Factory for creating PydanticAI agents"""
    
    @staticmethod
    def create_agent(config: Dict[str, Any], chatbot_service):
        """Create a PydanticAI agent based on configuration"""
        model_name = config.get("llm", "gpt-4o-mini")
        
        if model_name in ["mistral", "qwen", "llama3"]:
            model_id = f"ollama_chat/{model_name}"
            api_base = "http://ollama:11434"
        else:
            model_id = model_name
            api_base = None
        
        collections = config.get("collections", [])
        logger.info(f"PydanticAgentFactory creating agent with collections: {collections}")
        
        tools_config = config.get("tools", [])
        
        deps = AgentDependencies(
            mongodb_client=MongoDBClient.get_instance(),
            collections=collections,
            search_enabled="Web Search" in tools_config,
            calculator_enabled="Calculator" in tools_config
        )
        
        system_prompt = config.get("pydantic_prompt", 
                                "You are a helpful AI assistant. Answer the user's question concisely and accurately.")
        
        agent = PydanticAgent(
            model_id,
            deps_type=AgentDependencies,
            output_type=ChatResponse,
            system_prompt=system_prompt,
            retries=config.get("max_retries", 2)
        )
        
        if collections:
            @agent.tool
            async def retrieve_documents(ctx: RunContext[AgentDependencies], query: str) -> List[str]:
                """Retrieve relevant documents from the knowledge base."""
                try:
                    logger.info(f"PydanticAI retrieve_documents using collections: {ctx.deps.collections}")
                    
                    retriever = chatbot_service.get_retriever({"collections": ctx.deps.collections})
                    
                    if not retriever:
                        logger.warning(f"No retriever created for collections: {ctx.deps.collections}")
                        return ["No documents found in the knowledge base."]
                    
                    docs = retriever.invoke(query)
                    
                    results = []
                    for doc in docs:
                        doc_content = getattr(doc, 'page_content', str(doc))
                        doc_name = getattr(doc, 'metadata', {}).get('Title', 'Document')
                        results.append(f"[From {doc_name}] {doc_content}")
                    
                    if not results:
                        logger.warning(f"No documents found for query: {query}")
                        return ["No relevant documents found."]
                    
                    logger.info(f"Retrieved {len(results)} documents from collections: {ctx.deps.collections}")
                    return results
                except Exception as e:
                    logger.error(f"Error retrieving documents: {str(e)}", exc_info=True)
                    return [f"Error retrieving documents: {str(e)}"]
        
        if deps.search_enabled:
            @agent.tool
            async def web_search(ctx: RunContext[AgentDependencies], query: str) -> str:
                """Search the web for information."""
                try:
                    from smolagents import DuckDuckGoSearchTool
                    search_tool = DuckDuckGoSearchTool()
                    results = search_tool(query)
                    return results
                except Exception as e:
                    logger.error(f"Error searching the web: {str(e)}")
                    return f"Error searching the web: {str(e)}"
        
        if deps.calculator_enabled:
            @agent.tool
            def calculate(ctx: RunContext[AgentDependencies], expression: str) -> str:
                """Evaluate a mathematical expression."""
                try:
                    import re
                    if not re.match(r'^[0-9\+\-\*\/\(\)\.\s]*$', expression):
                        raise ValueError("Invalid characters in expression")
                    
                    result = eval(expression)
                    return f"The result of {expression} is {result}"
                except Exception as e:
                    logger.error(f"Error calculating expression: {str(e)}")
                    return f"Error calculating: {str(e)}"
        
        @agent.output_validator
        def validate_output(ctx: RunContext[AgentDependencies], output: ChatResponse) -> ChatResponse:
            """Validate and clean up the structured output."""
            if isinstance(output.response, str) and output.response.strip() == "":
                raise ModelRetry("Please provide a proper response to the user's query.")
            
            if isinstance(output.response, list) and (len(output.response) == 0 or all(not item for item in output.response)):
                raise ModelRetry("Please provide a proper response to the user's query.")
            
            return output
        
        return agent

async def process_with_pydantic_agent(agent, config: Dict[str, Any], query: str):
    """Process a query using a PydanticAI agent"""
    try:
        collections = config.get("collections", [])
        logger.info(f"process_with_pydantic_agent using collections: {collections}")
        
        deps = AgentDependencies(
            mongodb_client=MongoDBClient.get_instance(),
            collections=collections,
            search_enabled="Web Search" in config.get("tools", []),
            calculator_enabled="Calculator" in config.get("tools", [])
        )
        
        result = await agent.run(query, deps=deps)
        
        response = result.output.response
        
        if isinstance(response, list):
            response = "\n".join(response) if all(isinstance(item, str) for item in response) else str(response)
            
        return {
            "response": response,
            "contexts": result.output.source_documents,
            "source_urls": []
        }
    except Exception as e:
        logger.error(f"Error processing query with PydanticAI agent: {str(e)}", exc_info=True)
        return {
            "response": f"Sorry, an error occurred while processing your query: {str(e)}",
            "contexts": [],
            "source_urls": []
        }