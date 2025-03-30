# import streamlit as st
# import httpx
# import time

# st.set_page_config(page_title = "Knowledge Base", page_icon='./frontend/favicon.png', layout = "wide")

# st.title("Collections")

# collection_names=[]

# with httpx.Client(timeout=10.0) as client:
#     try:
#         # Use the correct endpoint
#         response = client.get(
#             "http://api:8000/knowledge_base/collections"  # Changed from /knowledge_base/collections
#         )
#         response.raise_for_status()
#         collection_names = response.json()["collection_names"]
#     except httpx.TimeoutException:
#         st.error("Request timed out. The server took too long to respond.")
#     except Exception as e:
#         st.error(f"Error: {str(e)}")


# collection_tabs = st.tabs(collection_names + ["New collection"])

# for i in range(len(collection_tabs)):
#     with collection_tabs[i]:
#         if i == len(collection_tabs) - 1:
#             # This is the "New Collection" tab
#             collection_name = st.text_input("Give your collection a name:")
#             if st.button("Save", type="primary"):
#                 if collection_name:
#                     with httpx.Client(timeout=10.0) as client:
#                         try:
#                             # Use the correct endpoint
#                             response = client.post(
#                                 "http://api:8000/knowledge_base/collections",  # Changed from /knowledge_base/collections
#                                 json={"name": collection_name}
#                             )
#                             if response.status_code == 200:
#                                 st.success(f"Collection '{collection_name}' created successfully")
#                         except Exception as e:
#                             st.error(f"There was an error while creating {collection_name}: {str(e)}")
                    
#                     st.rerun()
#                 else: 
#                     st.warning("Collection name required")
#         else:
#             with st.expander(f"Add knowledge"):
#                 collection_name = collection_names[i]

#                 base_url = st.text_input("Upload base URL:", "https://example.com/", key=f"{collection_name}_base_url")

#                 crawl_depth = st.number_input('Depth', min_value=0, max_value=5, value=2, step=1, key=f"{collection_name}_crawl_depth")

#                 if base_url and crawl_depth and st.button("Upload URLs", key=f"{collection_name}_upload_urls"):
#                     # Create a progress indicator
#                     progress_message = st.empty()
#                     progress_message.info(f"Starting crawl for {base_url} with depth {crawl_depth}")
                    
#                     try:
#                         # Call the API to start the crawl
#                         with httpx.Client(timeout=30.0) as client:
#                             # Keep this endpoint as is - it uses the /knowledge_base prefix
#                             # header = {"Authorization": "Bearer token123"}
#                             crawl_response = client.post(
#                                 f"http://api:8000/knowledge_base/collections/{collection_name}/crawl",
#                                 json={
#                                     "url": base_url,  # Ensure this matches the CrawlRequest model
#                                     "depth": crawl_depth
#                                 }
#                             )
                            
#                             if crawl_response.status_code == 200:
#                                 response_data = crawl_response.json()
#                                 if response_data.get("status") == "crawl_started":
#                                     progress_message.success(f"Crawl started in background: {response_data.get('message', '')}")
#                                     st.info("The crawling and indexing process will continue in the background. You don't need to keep this page open.")
#                                 else:
#                                     progress_message.warning(f"Unexpected response: {response_data}")
#                             else:
#                                 progress_message.error(f"Error starting crawl: {crawl_response.text}")
                                
#                     except Exception as e:
#                         progress_message.error(f"Error during crawling: {str(e)}")
#                         st.exception(e)  # This will show the full traceback

#             # This is outside the try/except block
#             with st.expander("Show contents"):
#                 st.link_button("Qdrant UI", f"http://localhost:6333/dashboard#/collections/{collection_names[i]}")

#             # Content for existing collection tabs
#             if st.button("Delete Collection", key=f"delete_{collection_name}", type="secondary"):
#                 with httpx.Client(timeout=20.0) as client:
#                     try:
#                         # Use the correct endpoint
#                         response = client.delete(f"http://api:8000/knowledge_base/collections/{collection_name}")  # Changed from /knowledge_base/collections
#                         if response.status_code == 200:
#                             st.success(f"Collection '{collection_name}' deleted successfully")
#                     except Exception as e:
#                         st.error(f"There was an error deleting your collection {collection_name}: {str(e)}")
#                 st.rerun()




import streamlit as st
import httpx
import time
import json

st.set_page_config(page_title="Knowledge Base", page_icon='./frontend/favicon.png', layout="wide")

st.title("Collections")

collection_names = []

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


collection_tabs = st.tabs(collection_names + ["New collection"])

for i in range(len(collection_tabs)):
    with collection_tabs[i]:
        if i == len(collection_tabs) - 1:
            # This is the "New Collection" tab
            collection_name = st.text_input("Give your collection a name:")
            if st.button("Save", type="primary"):
                if collection_name:
                    with httpx.Client(timeout=10.0) as client:
                        try:
                            response = client.post(
                                "http://api:8000/knowledge_base/collections",
                                json={"name": collection_name}
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
            # This is an existing collection tab
            collection_name = collection_names[i]
            
            # URL Crawler section
            with st.expander("Crawl Website", expanded=True):
                          
                col1, col2 = st.columns([3, 1])
                with col1:
                    base_url = st.text_input("Website URL to crawl:", "https://example.com/", key=f"{collection_name}_base_url")
                with col2:
                    crawl_depth = st.number_input('Depth', min_value=0, max_value=5, value=2, step=1, key=f"{collection_name}_crawl_depth")
                
                if st.button("Preview URLs", key=f"{collection_name}_preview", type="primary"):
                    if base_url:
                        with httpx.Client(timeout=500.0) as client:
                            try:
                                response = client.get(
                                    "http://api:8000/crawl",
                                    params={"base_url": base_url, "depth": crawl_depth, "max_pages": 50},
                                    follow_redirects=True
                                )
                                st.write(f"Status code: {response.status_code}")
                                st.write(f"Response headers: {response.headers}")
                                st.write(f"Response content: {response.text}")
                            

                                # st.success("Succesfully send a crawl request with url = {response.json}")
                                # st.rerun()
                            except Exception as e:
                                st.error(f"There was an error while crawling the URL {base_url}.")
                    else:
                        st.warning("Please enter a URL to crawl")

                    

            # Show contents
            with st.expander("Show contents"):
                st.link_button("Qdrant UI", f"http://localhost:6333/dashboard#/collections/{collection_names[i]}")

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