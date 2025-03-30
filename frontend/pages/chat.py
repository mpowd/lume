import streamlit as st
import httpx

st.set_page_config(page_title = "Chat", page_icon='./frontend/favicon.png', layout = "wide")


# st.title("Chat with Search Agent")

# Initialize session state for chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Chat input
if prompt := st.chat_input("Was möchtest du wissen?"):
    # Add user message to chat history
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Show thinking message
    response_container = st.chat_message("assistant")
    with response_container:
        with st.spinner("Ich suche nach Informationen..."):
            with httpx.Client(timeout=150.0) as client:  # Add 30 second timeout
                try:
                    response = client.post(
                        "http://api:8000/chat/search", 
                        json={"query": prompt}
                    )
                    response.raise_for_status()
                    answer = response.json()["response"]
                except httpx.TimeoutException:
                    st.error("Request timed out. The server took too long to respond.")
                    answer = "Sorry, the request timed out. Please try again."
                except Exception as e:
                    st.error(f"Error: {str(e)}")
                    answer = "Sorry, there was an error processing your request."

            # Add assistant response to chat history
            st.session_state.messages.append({"role": "assistant", "content": answer})
            
            # Display the response in the existing container instead of creating a new one
            st.markdown(answer)