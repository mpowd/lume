import streamlit as st
import httpx
import time


st.title("Chat")

if "messages" not in st.session_state:
    st.session_state.messages = []

if "current_chatbot" not in st.session_state:
    st.session_state.current_chatbot = None

if "available_chatbots" not in st.session_state:
    st.session_state.available_chatbots = []

def fetch_chatbots():
    with httpx.Client(timeout=10.0) as client:
        try:
            response = client.get("http://api:8000/chat/chatbots")
            response.raise_for_status()
            st.session_state.available_chatbots = response.json().get("chatbots", [])
        except Exception as e:
            st.error(f"Error fetching available chatbots: {str(e)}")
            st.session_state.available_chatbots = []

if not st.session_state.available_chatbots:
    fetch_chatbots()

with st.sidebar:
    st.header("Select a Chatbot")
    
    if st.button("Refresh Chatbots"):
        fetch_chatbots()
    
    if st.session_state.available_chatbots:
        chatbot_options = ["Select a chatbot..."] + [f"{chatbot['name']} ({chatbot['llm']})" for chatbot in st.session_state.available_chatbots]
        selected_index = 0
        
        if st.session_state.current_chatbot:
            for i, chatbot in enumerate(st.session_state.available_chatbots):
                if chatbot["id"] == st.session_state.current_chatbot["id"]:
                    selected_index = i + 1
                    break
        
        selection = st.selectbox(
            "Choose a chatbot to chat with:",
            chatbot_options,
            index=selected_index
        )
        
        if selection != "Select a chatbot...":
            selected_index = chatbot_options.index(selection) - 1
            st.session_state.current_chatbot = st.session_state.available_chatbots[selected_index]
            
            st.subheader("Chatbot Details")
            st.write(f"**Name:** {st.session_state.current_chatbot['name']}")
            st.write(f"**Model:** {st.session_state.current_chatbot['llm']}")
            st.write(f"**Type:** {st.session_state.current_chatbot['workflow'].capitalize()}")
            
            if st.button("Clear Chat History"):
                st.session_state.messages = []
                st.rerun()
    else:
        st.warning("No chatbots available. Please create a chatbot first.")
        
        if st.button("Create a New Chatbot"):
            st.switch_page("Manage_Chatbots.py")

if st.session_state.current_chatbot:
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
            
            if "sources" in message and message["sources"]:
                with st.expander("Sources"):
                    for i, source in enumerate(message["sources"]):
                        st.write(f"{i+1}. {source}")
    
    if prompt := st.chat_input("Ask me anything..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        
        with st.chat_message("user"):
            st.markdown(prompt)
        
        response_container = st.chat_message("assistant")
        with response_container:
            with st.spinner("Thinking..."):
                with httpx.Client(timeout=600.0) as client:
                    try:
                        response = client.post(
                            "http://api:8000/chat/", 
                            json={
                                "query": prompt,
                                "chatbot_id": st.session_state.current_chatbot["id"]
                            }
                        )
                        response.raise_for_status()
                        result = response.json()
                        
                        answer = result.get("response", "Sorry, I couldn't generate a response.")
                        contexts = result.get("contexts", [])
                        source_urls = result.get("source_urls", [])
                        
                        st.session_state.messages.append({
                            "role": "assistant", 
                            "content": answer,
                            "sources": source_urls
                        })
                        
                        st.markdown(answer)
                        
                        if source_urls:
                            with st.expander("Sources"):
                                for i, source in enumerate(source_urls):
                                    st.write(f"{i+1}. {source}")
                                    
                    except httpx.TimeoutException:
                        st.error("Request timed out. The server took too long to respond.")
                    except Exception as e:
                        st.error(f"Error: {str(e)}")
else:
    st.info("👈 Please select a chatbot from the sidebar to start chatting.")
    
    st.write("Don't see a chatbot you want to use?")
    if st.button("Create New Chatbot"):
        st.switch_page("Manage_Chatbots.py")