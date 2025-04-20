from smolagents import ToolCallingAgent, LiteLLMModel, DuckDuckGoSearchTool
import os
import logging

logger = logging.getLogger(__name__)

class SearchAgent:
    def __init__(self):
        try:
            if "OPENAI_API_KEY" not in os.environ:
                raise ValueError("OPENAI_API_KEY environment variable is not set")
            
            self.model = LiteLLMModel(
                model_id="gpt-4o-mini",
                api_key=os.environ["OPENAI_API_KEY"],
            )
            
            self.agent = ToolCallingAgent(
                tools=[DuckDuckGoSearchTool()],
                model=self.model,
                max_steps=3
            )
            logger.info("SearchAgent initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize SearchAgent: {str(e)}", exc_info=True)
            raise

    def respond(self, query: str) -> str:
        try:
            response = self.agent.run(query)
            return response
        except Exception as e:
            logger.error(f"Error in respond: {str(e)}", exc_info=True)
            raise


