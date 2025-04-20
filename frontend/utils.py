import streamlit as st
import pandas as pd
import requests

def url_selection(urls_data):
    """
    A flexible URL selection interface that works with either a list of strings
    or a list of dictionaries.
    
    Args:
        urls_data: List of URL strings or list of dictionaries with 'url' key
    
    Returns:
        List of selected URLs or None if not submitted
    """
    if not urls_data:
        st.warning("No URLs found to save.")
        return None

    is_list_of_strings = all(isinstance(item, str) for item in urls_data)
    
    if is_list_of_strings:
        df = pd.DataFrame({
            'url': urls_data,
            'selected': [True] * len(urls_data)
        })
    else:
        try:
            df = pd.DataFrame(urls_data)
            if 'selected' not in df.columns:
                df['selected'] = True
        except Exception as e:
            st.error(f"Error processing URL data: {str(e)}")
            st.write("Data type:", type(urls_data))
            if urls_data and len(urls_data) > 0:
                st.write("First item:", urls_data[0])
            return None
    
    total_urls = len(df)
    selected_count = df['selected'].sum()
    
    col1, col2 = st.columns([3, 1])
    
    with col1:
        st.write(f"**{selected_count}** of **{total_urls}** URLs ready to save. Press 'Review URLs' to review the URLs that should be persisted.")
    
    with col2:
        if st.button("Save URLs", type="primary", use_container_width=True):
            if is_list_of_strings:
                selected_urls = df[df['selected']]['url'].tolist()
            else:
                selected_urls = df[df['selected']].to_dict('records')
            
            try:
                url_strings = selected_urls if is_list_of_strings else [item['url'] for item in selected_urls]
                
                response = requests.post(
                    "http://api:8000/save_urls",
                    json={"urls": url_strings, "collection_name": st.session_state.get('current_collection', '')},
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    st.success(f"Saved {len(selected_urls)} URLs to the database.")
                else:
                    st.error(f"Error saving URLs: {response.text}")
            except Exception as e:
                st.error(f"Error connecting to API: {str(e)}")
            
            return selected_urls
    
    with st.expander("Review URLs", expanded=False):
        search_term = st.text_input("Filter URLs", "", key="compact_search")
        
        if search_term:
            filtered_df = df[df['url'].str.contains(search_term, case=False)]
        else:
            filtered_df = df
        
        filtered_count = filtered_df['selected'].sum()
        st.write(f"Showing {len(filtered_df)} URLs ({filtered_count} selected)")
        
        select_col1, select_col2 = st.columns(2)
        with select_col1:
            if st.button("Select All Visible", key="select_compact"):
                filtered_df['selected'] = True
                for idx in filtered_df.index:
                    df.loc[idx, 'selected'] = True
        
        with select_col2:
            if st.button("Deselect All Visible", key="deselect_compact"):
                filtered_df['selected'] = False
                for idx in filtered_df.index:
                    df.loc[idx, 'selected'] = False
        
        for i, row in filtered_df.iterrows():
            col1, col2 = st.columns([5, 1])
            with col1:
                display_url = row['url']
                if len(display_url) > 70:
                    display_url = display_url[:70] + "..."
                st.text(display_url)
            with col2:
                selected = st.checkbox("", value=row['selected'], key=f"url_{i}", 
                                     label_visibility="collapsed")
                filtered_df.loc[i, 'selected'] = selected
                df.loc[i, 'selected'] = selected
    
    return None