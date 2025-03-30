import streamlit as st
import httpx
import pandas as pd

st.title("Settings")

# Initialize settings sections in a more compact way
settings_tabs = st.tabs(["General", "Models", "API", "Advanced", "Pipeline"])

# General Settings Tab
with settings_tabs[0]:
    st.write("To be implemented")
    # st.write("### General Settings")
    # st.selectbox("Theme", ["System default", "Light", "Dark"])
    # st.slider("Chat history limit", min_value=10, max_value=100, value=50)
    # st.checkbox("Show timestamps in chat", value=True)
    
    # if st.button("Save General Settings"):
    #     st.success("Settings saved")

# Models Tab - collapsed by default
with settings_tabs[1]:
    # models_tabs = st.tabs(["Large Language Model", "Embedding Model", "Reranking Model"])
    # with models_tabs[0]:
        # st.write("LLM")
    st.write("To be implemented")
    # # st.write("### Model Settings")
    
    # # Expandable model selection section
    # with st.expander("Ollama Models", expanded=False):
    #     # Function to fetch models from Ollama API
    #     @st.cache_data(ttl=60)  # Cache the results for 1 minute
    #     def fetch_ollama_models(endpoint="http://ollama:11434"):
    #         try:
    #             with httpx.Client(timeout=5.0) as client:
    #                 response = client.get(f"{endpoint}/api/tags")
    #                 response.raise_for_status()
    #                 installed_models = response.json().get("models", [])
                    
    #                 # Example available models (would come from Ollama library in production)
    #                 available_models = ["llama3", "mistral", "gemma", "phi3"]
    #                 installed_names = {model["name"] for model in installed_models}
    #                 not_installed = [m for m in available_models if m not in installed_names]
                    
    #                 return installed_models, not_installed
    #         except Exception as e:
    #             st.error(f"Error connecting to Ollama: {str(e)}")
    #             return [], []
        
    #     # Create a compact display
    #     installed_models, available_models = fetch_ollama_models()
        
    #     # Use columns for a more compact layout
    #     col1, col2 = st.columns(2)
        
    #     with col1:
    #         st.write("**Installed Models**")
    #         if installed_models:
    #             for model in installed_models:
    #                 size_gb = round(model.get("size", 0) / 1_000_000_000, 1)
    #                 st.write(f"• {model['name']} ({size_gb} GB)")
    #         else:
    #             st.info("No models installed")
        
    #     with col2:
    #         st.write("**Available Models**")
    #         if available_models:
    #             model_to_install = st.selectbox("Install model:", available_models)
    #             if st.button("Install", key="install_btn"):
    #                 st.info(f"Starting installation of {model_to_install}...")
    #         else:
    #             st.info("No additional models available")
    
    # # Default model selection (always visible)
    # st.write("**Default Model**")
    # if installed_models:
    #     st.selectbox("Select default model:", [model["name"] for model in installed_models])
    # else:
    #     st.info("No models available to select")
    
    # # Model parameters (always visible)
    # st.write("**Model Parameters**")
    # st.slider("Temperature", min_value=0.0, max_value=1.0, value=0.7, step=0.1)
    # st.slider("Top P", min_value=0.0, max_value=1.0, value=0.9, step=0.1)
    
    # if st.button("Save Model Settings"):
    #     st.success("Model settings saved")

# API Settings Tab
with settings_tabs[2]:
    st.write("To be implemented")
    # st.write("### API Settings")
    # st.text_input("API Endpoint", value="http://api:8000")
    # st.number_input("Timeout (seconds)", min_value=5, max_value=60, value=30)
    # st.checkbox("Enable debug mode", value=False)
    
    # if st.button("Save API Settings"):
    #     st.success("API settings saved")

# Advanced Settings Tab
with settings_tabs[3]:
    st.write("To be implemented")
    # st.write("### Advanced Settings")
    # st.checkbox("Enable experimental features", value=False)
    # st.number_input("Max tokens per response", min_value=100, max_value=4096, value=1024)
    # st.selectbox("Log level", ["INFO", "DEBUG", "WARNING", "ERROR"])
    
    # with st.expander("System Maintenance", expanded=False):
    #     st.write("**Warning**: These actions may affect your data")
    #     col1, col2 = st.columns(2)
    #     with col1:
    #         if st.button("Clear Cache"):
    #             st.info("Cache cleared")
    #     with col2:
    #         if st.button("Reset All Settings"):
    #             st.info("All settings reset to defaults")
    
    # if st.button("Save Advanced Settings"):
    #     st.success("Advanced settings saved")