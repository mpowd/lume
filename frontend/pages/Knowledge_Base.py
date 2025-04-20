import streamlit as st
import httpx
import time
import json
import pandas as pd
from utils import url_selection


st.title("Collections")


collection_names = []
crawled_urls = []
embedding_models=['jina/jina-embeddings-v2-base-de']

with httpx.Client(timeout=10.0) as client:
    try:
        response = client.get(
            "http://api:8000/knowledge_base/collections"
        )
        response.raise_for_status()
        collection_names = response.json()["collection_names"]
    except httpx.TimeoutException:
        st.error("Request timed out. The server took too long to respond.")
    except Exception as e:
        st.error(f"Error: {str(e)}")


collection_tabs = st.tabs(collection_names + ["Create New collection"])

for i in range(len(collection_tabs)):
    with collection_tabs[i]:
        if i == len(collection_tabs) - 1:
            st.divider()
            col1, col2, col3, col4 = st.columns([1,1,1,1])
            with col1:
                collection_name = st.text_input("Give your collection a name:")
            with col2:
                embedding_model = st.selectbox(
                    label="Choose an embedding model",
                    options=embedding_models,
                    index=0)
            with col3:
                chunk_size = st.number_input('Chunk size (in characters)', min_value=200, max_value=10000, value=1000, step=100, key=f"{collection_name}_chunk_size")
                chunk_overlap = st.number_input('Chunk overlap (in characters)', min_value=0, max_value=int(chunk_size / 2), value=100, step=10, key=f"{collection_name}_chunk_overlap")

            with col4:
                distance_metric = st.selectbox(
                    label="Choose a distance metric",
                    options=['Cosine similarity', 'Dot product', 'Euclidean distance', 'Manhattan distance'],
                    index=0
                )

            st.divider()


            if st.button("Create collection", type="primary"):
                if collection_name:
                    with httpx.Client(timeout=10.0) as client:
                        try:
                            response = client.post(
                                "http://api:8000/knowledge_base/collections",
                                json={
                                    "collection_name": collection_name,
                                    "embedding_model": embedding_model,
                                    "chunk_size": int(chunk_size),
                                    "chunk_overlap": int(chunk_overlap),
                                    "distance_metric": distance_metric
                                }
                            )
                            if response.status_code == 200:
                                st.success(f"Collection '{collection_name}' created successfully")
                                time.sleep(1)
                                st.rerun()
                        except Exception as e:
                            st.error(f"There was an error while creating {collection_name}: {str(e)}")
                    
                else: 
                    st.warning("Collection name required")
        else:
            collection_name = collection_names[i]
            
            collection_key = f"{collection_name}_urls"
            editor_key = f"{collection_name}_url_editor"
            
            if collection_key not in st.session_state:
                st.session_state[collection_key] = pd.DataFrame(columns=["url", "selected", "payload"])
            
            with st.expander("Information about this collection", expanded=False):
                col1, col2, col3 = st.columns([1,1,1])
                with httpx.Client(timeout=20.0, follow_redirects=True) as client:
                    try:
                        response = client.get(
                            "http://api:8000/knowledge_base/collection_info", 
                            params={"collection_name": collection_name}
                        )
                        if response.status_code == 200:
                            collection_info = response.json()
                            
                            with col1:
                                st.subheader("Basic Info")
                                st.write(f"**Name:** {collection_info.get('collection_name', 'N/A')}")
                                st.write(f"**Embedding Model:** {collection_info.get('dense_embedding_model', 'N/A')}")
                            
                            with col2:
                                st.subheader("Chunking Settings")
                                st.write(f"**Chunk Size:** {collection_info.get('chunk_size', 'N/A')}")
                                st.write(f"**Chunk Overlap:** {collection_info.get('chunk_overlap', 'N/A')}")
                            
                            with col3:
                                st.subheader("Distance Metric")
                                st.write(f"**Metric:** {collection_info.get('distance_metric', 'Cosine similarity')}")
                        else:
                            st.error(f"Error: {response.text}")
                    except Exception as e:
                        st.error(f"Failed to fetch collection info: {str(e)}")
                    

            with st.expander("Upload knowledge from web pages", expanded=False):
                          
                col1, col2, col3 = st.columns([3, 1, 1])
                with col1:
                    base_url = st.text_input("Website URL to crawl:", "https://de.wikipedia.org/wiki/Tiefsee", key=f"{collection_name}_base_url")
                with col2:
                    crawl_depth = st.number_input('Depth', min_value=0, max_value=4, value=2, step=1, key=f"{collection_name}_crawl_depth")
                with col3:
                    crawl_max_pages = st.number_input('Max pages', min_value=1, max_value=10000, value=50, step=1, key=f"{collection_name}_crawl_max_pages")
                
                if st.button("Parse knowledge", key=f"{collection_name}_preview", type="primary"):
                    if base_url:
                        with st.spinner("Collecting knowledge. This can take a few minutes..."):
                            with httpx.Client(timeout=600000.0, follow_redirects=True) as client:
                                try:
                                    response = client.get(
                                        f"http://api:8000/crawl",
                                        params={
                                            "base_url": base_url,
                                            "depth": int(crawl_depth),
                                            "max_pages": int(crawl_max_pages),
                                            "include_external_domains": False,
                                            "collection_name": collection_name
                                        }
                                    )

                                    response_json = json.loads(response.text)
                                    crawled_urls = response_json['response']['urls']
                                    
                                    urls_df = pd.DataFrame({
                                        "url": crawled_urls,
                                        "selected": [True] * len(crawled_urls),
                                        "payload": [""] * len(crawled_urls)
                                    })
                                    
                                    st.session_state[collection_key] = urls_df
                                    st.success(f"Found {len(crawled_urls)} URLs")

                                except Exception as e:
                                    st.error(f"There was an error while crawling the URL {base_url}: {str(e)}")

                    else:
                        st.warning("Please enter a URL to crawl")

                st.divider()

                if len(st.session_state[collection_key]) > 0:
                    if f"{collection_name}_edited" not in st.session_state:
                        st.session_state[f"{collection_name}_edited"] = False
                    
                    filter_text = st.text_input("Filter URLs (contains):", key=f"{collection_name}_filter")
                    
                    filtered_df = st.session_state[collection_key]
                    if filter_text:
                        filtered_df = filtered_df[filtered_df.url.str.contains(filter_text, case=False)]
                    
                    col1, col2 = st.columns(2)
                    with col1:
                        if st.button("Select All", key=f"{collection_name}_select_all"):
                            filtered_indices = filtered_df.index
                            st.session_state[collection_key].loc[filtered_indices, "selected"] = True
                    
                    with col2:
                        if st.button("Deselect All", key=f"{collection_name}_deselect_all"):
                            filtered_indices = filtered_df.index
                            st.session_state[collection_key].loc[filtered_indices, "selected"] = False
                    
                    def on_data_change(updated_df):
                        st.session_state[f"{collection_name}_edited"] = True
                        
                        for index, row in updated_df.iterrows():
                            try:
                                full_index = st.session_state[collection_key].index[
                                    st.session_state[collection_key]['url'] == row['url']
                                ][0]
                                
                                st.session_state[collection_key].loc[full_index, "selected"] = row["selected"]
                                st.session_state[collection_key].loc[full_index, "payload"] = row["payload"]
                            except (IndexError, KeyError) as e:
                                pass
                    
                    edited_df = st.data_editor(
                        filtered_df,
                        column_config={
                            "url": st.column_config.TextColumn("URL", width="large"),
                            "selected": st.column_config.CheckboxColumn("Include", width="small"),
                            "payload": st.column_config.TextColumn("Custom Payload (keywords/summary)", width="medium")
                        },
                        disabled=["url"],
                        hide_index=True,
                        key=editor_key,
                        height=400,
                        on_change=on_data_change,
                        args=(filtered_df,)
                    )
                    
                    selected_count = st.session_state[collection_key]["selected"].sum()
                    st.info(f"Selected {selected_count} out of {len(st.session_state[collection_key])} URLs")
                    
                    st.divider()
                    if st.button("Upload Selected URLs to Database", key=f"{collection_name}_upload", type="primary"):
                        selected_urls = st.session_state[collection_key][st.session_state[collection_key]["selected"]].copy()
                        
                        if len(selected_urls) > 0:
                            with st.spinner("Uploading selected URLs to vector database..."):
                                try:
                                    with httpx.Client(timeout=20.0, follow_redirects=True) as client:
                                        collection_info_response = client.get(
                                            "http://api:8000/knowledge_base/collection_info", 
                                            params={"collection_name": collection_name}
                                        )
                                        collection_info = collection_info_response.json()
                                        chunk_size = collection_info.get('chunk_size', 1000)
                                        chunk_overlap = collection_info.get('chunk_overlap', 100)
                                    
                                    upload_data = {
                                        "collection_name": collection_name,
                                        "documents": [
                                            {
                                                "url": row["url"],
                                                "custom_payload": row["payload"] if row["payload"] else None
                                            } for _, row in selected_urls.iterrows()
                                        ]
                                    }
                                    
                                    with httpx.Client(timeout=600000.0) as client:
                                        response = client.post(
                                            "http://api:8000/knowledge_base/upload_documents",
                                            json=upload_data
                                        )
                                        response_json = json.loads(response.text)
                                        
                                        if response.status_code == 200:
                                            st.success(response_json["message"])
                                        else:
                                            st.error(f"Error uploading URLs: {response.text}")
                                
                                except Exception as e:
                                    st.error(f"Error during upload: {str(e)}")
                        else:
                            st.warning("No URLs selected for upload")
                else:
                    st.info("No URLs available. Use 'Fetch URLs' to crawl websites first.")

            with st.expander("Show contents"):
                col1, col2 = st.columns([1, 1])
                with col1:
                    st.link_button("Vector Database", f"http://localhost:6333/dashboard#/collections/{collection_names[i]}")
                with col2:
                    st.link_button("Document Database", f"http://localhost:8081/db/rag_chatbot/{collection_names[i]}")

            # Delete Collection
            if st.button("Delete Collection", key=f"delete_{collection_name}", type="secondary"):
                with httpx.Client(timeout=20.0) as client:
                    try:
                        response = client.delete(f"http://api:8000/knowledge_base/collections/{collection_name}")
                        if response.status_code == 200:
                            st.success(f"Collection '{collection_name}' deleted successfully")
                            time.sleep(1)
                            st.rerun()
                    except Exception as e:
                        st.error(f"There was an error deleting your collection {collection_name}: {str(e)}")