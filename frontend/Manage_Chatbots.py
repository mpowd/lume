import streamlit as st
import httpx


st.title("Manage Chatbots")

if 'editing_chatbot' not in st.session_state:
    st.session_state.editing_chatbot = False
if 'chatbot_id' not in st.session_state:
    st.session_state.chatbot_id = None
if 'collection_names' not in st.session_state:
    st.session_state.collection_names = []
if 'chatbots' not in st.session_state:
    st.session_state.chatbots = []

llms = ["gpt-4o-mini", "mistral", "qwen", "llama3"]

rerankers = ["Cohere"]

def load_chatbot_for_editing(chatbot_id):
    with httpx.Client(timeout=10.0) as client:
        try:
            response = client.get(
                f"http://api:8000/chatbot/{chatbot_id}"
            )
            response.raise_for_status()
            return response.json()["chatbot"]
        except Exception as e:
            st.error(f"Error loading chatbot: {str(e)}")
            return None

def fetch_collections():
    with httpx.Client(timeout=10.0) as client:
        try:
            response = client.get(
                "http://api:8000/knowledge_base/collections"
            )
            response.raise_for_status()
            st.session_state.collection_names = response.json()["collection_names"]
        except httpx.TimeoutException:
            st.error("Request timed out. The server took too long to respond.")
        except Exception as e:
            st.error(f"Error: {str(e)}")

def fetch_chatbots():
    with httpx.Client(timeout=10.0) as client:
        try:
            response = client.get(
                "http://api:8000/chatbot/list"
            )
            response.raise_for_status()
            st.session_state.chatbots = response.json()["chatbots"]
        except httpx.TimeoutException:
            st.error("Request timed out. The server took too long to respond.")
        except Exception as e:
            st.error(f"Error: {str(e)}")

def reset_to_create_mode():
    st.session_state.editing_chatbot = False
    st.session_state.chatbot_id = None
    st.rerun()

def edit_chatbot(chatbot_id):
    st.session_state.editing_chatbot = True
    st.session_state.chatbot_id = chatbot_id
    st.info("Please switch to tab 'Create/Edit Chatbot' to edit this chatbot.")

def delete_chatbot(chatbot_id, chatbot_name):
    if st.session_state.get('confirm_delete') == chatbot_id:
        with httpx.Client(timeout=10.0) as client:
            try:
                response = client.delete(
                    f"http://api:8000/chatbot/{chatbot_id}"
                )
                response.raise_for_status()
                st.success(f"Chatbot '{chatbot_name}' deleted successfully!")
                fetch_chatbots()
                st.session_state.pop('confirm_delete', None)
            except Exception as e:
                st.error(f"Error deleting chatbot: {str(e)}")
    else:
        st.session_state.confirm_delete = chatbot_id
        st.rerun()

fetch_collections()
fetch_chatbots()

tab1, tab2 = st.tabs(["Available Chatbots", "Create/Edit Chatbot"])

with tab1:
    st.subheader("Your Chatbots")
    
    if not st.session_state.chatbots:
        st.info("No chatbots found. Create one using the 'Create/Edit Chatbot' tab.")
    else:
        for i, chatbot in enumerate(st.session_state.chatbots):
            col1, col2, col3, col4 = st.columns([3, 2, 2, 3])
            
            with col1:
                st.write(f"**{chatbot['name']}**")
            
            with col2:
                st.write(f"Type: {chatbot['workflow']}")
            
            with col3:
                st.write(f"LLM: {chatbot['llm']}")
            
            with col4:
                edit_col, delete_col = st.columns(2)
                
                with edit_col:
                    if st.button("Edit", key=f"edit_{i}"):
                        edit_chatbot(chatbot['id'])
                
                with delete_col:
                    if st.session_state.get('confirm_delete') == chatbot['id']:
                        if st.button("Confirm Delete", key=f"confirm_{i}", type="primary"):
                            delete_chatbot(chatbot['id'], chatbot['name'])
                        if st.button("Cancel", key=f"cancel_{i}"):
                            st.session_state.pop('confirm_delete', None)
                            st.rerun()
                    else:
                        if st.button("Delete", key=f"delete_{i}"):
                            delete_chatbot(chatbot['id'], chatbot['name'])
            
            st.divider()

with tab2:
    chatbot_data = None
    if st.session_state.editing_chatbot and st.session_state.chatbot_id:
        chatbot_data = load_chatbot_for_editing(st.session_state.chatbot_id)
        if chatbot_data:
            st.subheader(f"Edit Chatbot: {chatbot_data.get('chatbot_name', '')}")
        else:
            st.error("Failed to load chatbot data")
            st.session_state.editing_chatbot = False
    else:
        st.subheader("Create New Chatbot")

    if st.session_state.editing_chatbot:
        if st.button("Create New Chatbot Instead"):
            reset_to_create_mode()

    with st.container():
        col1, col2 = st.columns([1, 1])
        
        with col1:
            st.subheader("Basic Configuration")
            chatbot_name = st.text_input(
                "Chatbot Name", 
                value=chatbot_data.get('chatbot_name', '') if chatbot_data else '',
                placeholder="Give your chatbot a name"
            )
            
            workflow = st.selectbox(
                "Workflow Type", 
                ["linear", "agentic"], 
                index=0 if not chatbot_data or chatbot_data.get('workflow') == 'linear' else 1,
                help="Linear flow simply queries and responds. Agentic can use tools and follow complex instructions."
            )
            
            selected_collections = st.multiselect(
                "Knowledge Sources", 
                st.session_state.collection_names,
                default=chatbot_data.get('collections', []) if chatbot_data else [],
                help="Choose collections your chatbot will access"
            )
        
        tab1, tab2, tab3 = st.tabs(["Retrieval Settings", "Generation Settings", "Advanced Options"])
        
        with tab1:
            col1, col2 = st.columns([1, 1])
            
            with col1:
                hybrid_search = st.checkbox(
                    "Use Hybrid Search", 
                    value=chatbot_data.get('hybrid_search', True) if chatbot_data else True,
                    help="Combines keyword and semantic search"
                )
                
                top_k = st.number_input(
                    'Number of chunks to retrieve', 
                    min_value=1, 
                    max_value=100, 
                    value=chatbot_data.get('top_k', 10) if chatbot_data else 10,
                    step=1
                )
            
            with col2:
                hyde = st.checkbox(
                    "Use HyDE (Hypothetical Document Embedding)", 
                    value=chatbot_data.get('hyde', False) if chatbot_data else True,
                    help="Improves retrieval by generating a hypothetical answer first"
                )
                
                if hyde:
                    default_hyde_prompt = "Given a question, generate a paragraph of text that answers the question.\n\nQuestion: {question}\n\nParagraph: "
                    hyde_prompt = st.text_area(
                        "HyDE Prompt",
                        value=chatbot_data.get('hyde_prompt', default_hyde_prompt) if chatbot_data else default_hyde_prompt,
                        height=150
                    )
            
            st.divider()
            col1, col2 = st.columns([1, 1])
            
            with col1:
                reranking = st.checkbox(
                    "Enable Reranking", 
                    value=chatbot_data.get('reranking', False) if chatbot_data else False,
                    help="Further refines search results after initial retrieval"
                )
            
            if reranking:
                with col2:
                    reranker = st.selectbox(
                        "Reranker Model", 
                        rerankers,
                        index=rerankers.index(chatbot_data.get('reranker', 'Cohere')) if chatbot_data and chatbot_data.get('reranker') in rerankers else 0,
                        help="Select the reranking model to use"
                    )
                    
                    if reranker == "Cohere":
                        st.info("Cohere reranker uses state-of-the-art neural models to improve search results by prioritizing the most relevant documents.")
                    
                    top_n = st.number_input(
                        'Final number of chunks after reranking', 
                        min_value=1, 
                        max_value=int(top_k) if top_k > 1 else 1, 
                        value=chatbot_data.get('top_n', int(top_k/2)) if chatbot_data and 'top_n' in chatbot_data else int(top_k/2) if top_k > 1 else 1,
                        step=1,
                        help="How many documents to keep after reranking"
                    )
        
        with tab2:
            col1, col2 = st.columns([1, 1])
            
            with col1:
                selected_llm = st.selectbox(
                    "Choose a Language Model", 
                    llms,
                    index=llms.index(chatbot_data.get('llm')) if chatbot_data and chatbot_data.get('llm') in llms else 0,
                    help="The AI model that will generate responses"
                )
            
            with col2:
                default_rag_prompt = "Answer the question using only the context\n\nRetrieved Context: {context}\n\nUser Question: {question}\nAnswer the user conversationally. User is not aware of context."
                rag_prompt = st.text_area(
                    "Response Generation Prompt",
                    value=chatbot_data.get('rag_prompt', default_rag_prompt) if chatbot_data else default_rag_prompt,
                    height=200
                )
        
        with tab3:
            if workflow == "agentic":
                st.info("Agentic workflow allows your chatbot to use tools and perform actions.")
                
                agent_implementation = st.selectbox(
                    "Agent Implementation", 
                    ["pydantic_ai"],
                    index=0 if not chatbot_data or chatbot_data.get('workflow_implementation') != 'pydantic_ai' else 1,
                    help="Select the agent implementation to use. SmolaAgents is the original implementation, PydanticAI is a new structured agent implementation."
                )
                
                default_tools = ["Document Retrieval"]
                tools_list = ["Web Search", "Document Retrieval"]
                
                tools = st.multiselect(
                    "Available Tools", 
                    tools_list,
                    default=chatbot_data.get('tools', default_tools) if chatbot_data else default_tools
                )
                
                max_steps = st.slider(
                    "Maximum Reasoning Steps", 
                    min_value=1, 
                    max_value=10, 
                    value=chatbot_data.get('max_steps', 4) if chatbot_data else 4
                )
                
                if agent_implementation == "pydantic_ai":
                    st.subheader("PydanticAI Agent Settings")
                    
                    max_retries = st.slider(
                        "Maximum Retries for Tool Calls", 
                        min_value=1, 
                        max_value=5, 
                        value=chatbot_data.get('max_retries', 2) if chatbot_data else 2,
                        help="Maximum number of times the agent will retry a tool call if it fails"
                    )
                    
                    pydantic_prompt = st.text_area(
                        "Agent System Prompt",
                        value=chatbot_data.get('pydantic_prompt', "You are a helpful AI assistant. Answer the user's question concisely and accurately.") if chatbot_data else "You are a helpful AI assistant. Answer the user's question concisely and accurately.",
                        height=150,
                        help="System prompt for the PydanticAI agent"
                    )
            else:
                st.info("No additional settings needed for linear workflow.")

        button_text = "Update Chatbot" if st.session_state.editing_chatbot else "Create Chatbot"
        
        if st.button(button_text, type="primary"):
            with st.spinner(f"{'Updating' if st.session_state.editing_chatbot else 'Creating'} your chatbot..."):
                with httpx.Client(timeout=15.0) as client:
                    try:
                        payload = {
                            "chatbot_name": chatbot_name,
                            "workflow": workflow,
                            "collections": selected_collections,
                            "hybrid_search": hybrid_search,
                            "hyde": hyde,
                            "hyde_prompt": hyde_prompt if hyde else "",
                            "top_k": top_k,
                            "reranking": reranking,
                            "reranker": reranker if reranking else "",
                            "top_n": top_n if reranking else None,
                            "llm": selected_llm,
                            "rag_prompt": rag_prompt
                        }
                        
                        if workflow == "agentic":
                            payload["tools"] = tools
                            payload["max_steps"] = max_steps
                            
                            if agent_implementation == "pydantic_ai":
                                payload["workflow_implementation"] = "pydantic_ai"
                                payload["max_retries"] = max_retries
                                payload["pydantic_prompt"] = pydantic_prompt
                            else:
                                payload["workflow_implementation"] = "smolagents"
                        
                        if st.session_state.editing_chatbot:
                            response = client.put(
                                f"http://api:8000/chatbot/{st.session_state.chatbot_id}",
                                json=payload
                            )
                        else:
                            response = client.post(
                                "http://api:8000/chatbot/save",
                                json=payload
                            )
                            
                        response.raise_for_status()
                        
                        action_type = "updated" if st.session_state.editing_chatbot else "created"
                        st.success(f"Chatbot '{chatbot_name}' {action_type} successfully!")
                        
                        fetch_chatbots()
                        
                        st.session_state.editing_chatbot = False
                        st.session_state.chatbot_id = None
                        
                        st.balloons()
                        
                    except httpx.TimeoutException:
                        st.error("Request timed out. The server took too long to respond.")
                    except Exception as e:
                        st.error(f"Failed to {'update' if st.session_state.editing_chatbot else 'create'} chatbot: {str(e)}")