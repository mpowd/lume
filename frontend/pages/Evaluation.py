import streamlit as st
import httpx
import pandas as pd
import plotly.express as px
import json
from datetime import datetime
from uuid import uuid4
from pages.Chat import fetch_chatbots


if "dataset_name" not in st.session_state:
    st.session_state.dataset_name = str(uuid4())[:8]

if "available_chatbots" not in st.session_state:
    st.session_state.available_chatbots = []

if "current_chatbot" not in st.session_state:
    st.session_state.current_chatbot = None

if "evaluations" not in st.session_state:
    st.session_state.evaluations = []

def fetch_collections():
    """Holt verfügbare Sammlungen vom API-Server"""
    collection_names = []
    with httpx.Client(timeout=10.0) as client:
        try:
            response = client.get("http://api:8000/knowledge_base/collections")
            response.raise_for_status()
            collection_names = response.json()["collection_names"]
        except httpx.TimeoutException:
            st.error("Request timed out. The server took too long to respond.")
        except Exception as e:
            st.error(f"Error: {str(e)}")
    return collection_names

def fetch_datasets():
    """Holt alle Evaluations-Datasets vom API-Server"""
    with httpx.Client(timeout=300.0) as client:
        try:
            response = client.get("http://api:8000/evaluation/")
            if response.status_code == 200:
                return response.json()["datasets"]
            else:
                st.error(f"Error loading datasets: {response.text}")
                return []
        except Exception as e:
            st.error(f"Error loading datasets: {str(e)}")
            return []

def fetch_evaluations():
    """Holt alle Evaluierungsergebnisse vom API-Server"""
    with httpx.Client(timeout=300.0) as client:
        try:
            response = client.get("http://api:8000/evaluation/evaluations")
            if response.status_code == 200:
                return response.json()["evaluations"]
            else:
                st.error(f"Error loading evaluations: {response.text}")
                return []
        except Exception as e:
            st.error(f"Error loading evaluations: {str(e)}")
            return []

def save_dataset_changes(dataset_id, updated_qa_pairs):
    """Speichert Änderungen an einem Dataset"""
    with httpx.Client(timeout=30.0) as client:
        try:
            response = client.put(
                f"http://api:8000/evaluation/{dataset_id}",
                json={"qa_pairs": updated_qa_pairs}
            )
            
            if response.status_code == 200:
                updated_dataset = response.json()["dataset"]
                
                if "all_datasets" in st.session_state:
                    for i, ds in enumerate(st.session_state.all_datasets):
                        if ds["_id"] == dataset_id:
                            st.session_state.all_datasets[i]["qa_pairs"] = updated_qa_pairs
                            break
                
                if "current_dataset" in st.session_state and st.session_state.current_dataset.get("_id") == dataset_id:
                    st.session_state.current_dataset = updated_dataset
                    st.session_state.current_qa_pairs = updated_qa_pairs
                
                return True, "Changes saved successfully!"
            else:
                return False, f"Error saving changes: {response.text}"
        except Exception as e:
            return False, f"Error saving changes: {str(e)}"

collection_names = fetch_collections()

fetch_chatbots()

tab1, tab2, tab3, tab4, tab5 = st.tabs(["Create Evaluation Dataset Manually", "Generate Evaluation Dataset Automatically", "View Datasets", "Evaluate Your Agent", "View Evaluation Results"])

with tab1:
    col1, col2 = st.columns([1,2])
    with col1:
        dataset_name = st.text_input("Give your dataset a name")
    df = pd.DataFrame(columns=["question", "ground_truth", "source_doc"])
    edited_df = st.data_editor(
        df,
        column_config={
            "question": st.column_config.TextColumn("Question", width="large"),
            "ground_truth": st.column_config.TextColumn("Ground Truth", width="large"),
            "source_doc": st.column_config.TextColumn("Source", width="medium")
        },
        num_rows="dynamic",
        use_container_width=True,
        hide_index=True,
        key=f"editor_3"
    )


    if st.button("Create Dataset"):
        with st.spinner("Creating dataset..."):
            qa_pairs = edited_df.to_dict(orient='records')
            
            if not qa_pairs or (len(qa_pairs) == 1 and all(v == "" for v in qa_pairs[0].values())):
                st.error("Please add at least one question-answer pair before saving.")
            else:
                if not dataset_name:
                    dataset_name = f"manual_dataset_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                
                try:
                    with httpx.Client(timeout=30.0) as client:
                        response = client.post(
                            "http://api:8000/evaluation/",
                            json={
                                "dataset_name": dataset_name,
                                "qa_pairs": qa_pairs
                            })
                        
                        response_data = response.json()

                        if response.status_code == 200:
                            if response_data.get("status") == "error":
                                st.error(response_data.get("message"))
                            else:
                                st.success(f"Dataset '{dataset_name}' with {len(qa_pairs)} QA pairs successfully saved!")
                                
                                if "all_datasets" not in st.session_state:
                                    st.session_state.all_datasets = []
                                
                                if "response" in response_data:
                                    st.session_state.all_datasets.append(response_data["response"])
                                    st.session_state.dataset_name = str(uuid4())[:8]
                        else:
                            st.error(f"Error saving dataset: {response.text}")
                except Exception as e:
                    st.error(f"Error saving dataset: {str(e)}")


with tab2:
    col1, col2 = st.columns([1, 2])
    with col1:
        collection_name = st.selectbox(
            "Choose a collection",
            collection_names,
        )
    with col1:
        dataset_name = st.text_input("Give your dataset a name", value=st.session_state.dataset_name, key="ragas_dataset_name")
    with col1:
        num_questions = st.number_input(
            'Number of question-answer pairs to generate', 
            min_value=1, 
            max_value=100, 
            value=10, 
            step=1, 
            key=f"evaluation_num_questions"
        )

    if st.button("Generate data set", type="primary", key=f"save_generated_dataset"):
        with st.spinner("Generating dataset..."):
            with httpx.Client(timeout=6000.0, follow_redirects=True) as client:
                try:
                    response = client.post(
                        "http://api:8000/evaluation/ragas",
                        json={
                            "collection_name": collection_name,
                            "dataset_name": dataset_name,
                            "testset_size": int(num_questions)
                        }
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        st.session_state.all_datasets = [data["response"]]
                        st.session_state.current_dataset = data["response"]
                        st.session_state.current_qa_pairs = data["response"]["qa_pairs"]
                        
                        st.success(f"Dataset with {len(data['response']['qa_pairs'])} QA pairs successfully generated!")
                    else:
                        st.error(f"Error: {response.text}")

                except Exception as e:
                    st.error(f"There was an error while generating an evaluation set: {str(e)}")

    if "current_qa_pairs" in st.session_state and st.session_state.current_qa_pairs:
        df = pd.DataFrame(st.session_state.current_qa_pairs)
        
        edited_df = st.data_editor(
            df,
            column_config={
                "question": st.column_config.TextColumn(
                    "Question",
                    width="large",
                ),
                "ground_truth": st.column_config.TextColumn(
                    "Ground Truth",
                    width="large",
                ),
                "source_doc": st.column_config.TextColumn(
                    "Source",
                    width="medium",
                )
            },
            num_rows="dynamic",
            use_container_width=True,
            hide_index=True
        )


with tab3:
    st.subheader("Available Evaluation Datasets")
    
    if "view_dataset_message" in st.session_state:
        if st.session_state.view_dataset_message_type == "success":
            st.success(st.session_state.view_dataset_message)
        else:
            st.error(st.session_state.view_dataset_message)
        del st.session_state.view_dataset_message
        del st.session_state.view_dataset_message_type
    
    if st.button("Load Evaluation Datasets"):
        with st.spinner("Loading datasets..."):
            datasets = fetch_datasets()
            if datasets:
                st.session_state.all_datasets = datasets
                st.success(f"Loaded {len(datasets)} datasets")
    
    if "all_datasets" in st.session_state and st.session_state.all_datasets:
        datasets = st.session_state.all_datasets
        
        datasets_overview = []
        for ds in datasets:
            datasets_overview.append({
                "id": ds["_id"],
                "name": ds.get("name", "Unnamed Dataset"),
                "collection": ds["source_collection"],
                "created": ds["generated_at"],
                "pairs": len(ds["qa_pairs"])
            })
        
        df_overview = pd.DataFrame(datasets_overview)
        
        st.dataframe(
            df_overview,
            column_config={
                "id": st.column_config.TextColumn("Dataset ID"),
                "name": st.column_config.TextColumn("Name"),
                "collection": st.column_config.TextColumn("Source Collection"),
                "created": st.column_config.DatetimeColumn("Created"),
                "pairs": st.column_config.NumberColumn("QA Pairs")
            },
            use_container_width=True,
            hide_index=True
        )
        
        selected_id = st.selectbox(
            "Select a dataset to view or edit", 
            options=[""] + [ds["id"] for ds in datasets_overview],
            format_func=lambda x: next((f"{ds['name']} ({ds['collection']}, {ds['pairs']} pairs)" 
                                    for ds in datasets_overview if ds["id"] == x), x)
        )
        
        if selected_id:
            selected_dataset = next((ds for ds in datasets if ds["_id"] == selected_id), None)
            
            if selected_dataset:
                qa_pairs = selected_dataset.get("qa_pairs", [])
                
                qa_df = pd.DataFrame(qa_pairs)
                
                st.subheader(f"Edit Question-Answer Pairs for {selected_dataset.get('name', 'Dataset')}")
                
                edited_qa_df = st.data_editor(
                    qa_df,
                    column_config={
                        "question": st.column_config.TextColumn("Question", width="large"),
                        "ground_truth": st.column_config.TextColumn("Ground Truth", width="large"),
                        "source_doc": st.column_config.TextColumn("Source", width="medium")
                    },
                    num_rows="dynamic",
                    use_container_width=True,
                    hide_index=True,
                    key=f"editor_{selected_id}"
                )
                
                if st.button("Save Changes", type="primary", key=f"save_{selected_id}"):
                    with st.spinner("Saving changes..."):
                        updated_qa_pairs = edited_qa_df.to_dict(orient="records")
                        
                        success, message = save_dataset_changes(selected_id, updated_qa_pairs)
                        
                        if success:
                            st.success(message)
                            for i, ds in enumerate(st.session_state.all_datasets):
                                if ds["_id"] == selected_id:
                                    st.session_state.all_datasets[i]["qa_pairs"] = updated_qa_pairs
                                    break
                        else:
                            st.error(message)
                
                st.download_button(
                    "Export Dataset as JSON",
                    data=json.dumps(selected_dataset, ensure_ascii=False, indent=2),
                    file_name=f"{selected_dataset.get('name', 'dataset')}.json",
                    mime="application/json"
                )


with tab4:
    st.subheader("Evaluate Your Chatbot")
    
    evaluation_mode = st.radio(
        "Evaluation Mode",
        ["Evaluate Single Chatbot", "Evaluate Multiple Chatbots"],
        index=0
    )
    
    if evaluation_mode == "Evaluate Single Chatbot":
        if st.session_state.available_chatbots:
            chatbot_options = ["Select a chatbot..."] + [f"{chatbot['name']} ({chatbot['llm']})" for chatbot in st.session_state.available_chatbots]
            selected_index = 0
            
            if st.session_state.current_chatbot:
                for i, chatbot in enumerate(st.session_state.available_chatbots):
                    if chatbot["id"] == st.session_state.current_chatbot["id"]:
                        selected_index = i + 1
                        break
            
            chatbot_selection = st.selectbox(
                "Choose a chatbot to evaluate:",
                chatbot_options,
                index=selected_index
            )
            
            if chatbot_selection != "Select a chatbot...":
                selected_index = chatbot_options.index(chatbot_selection) - 1
                st.session_state.current_chatbot = st.session_state.available_chatbots[selected_index]
                
                st.write(f"**Name:** {st.session_state.current_chatbot['name']}")
                st.write(f"**Model:** {st.session_state.current_chatbot['llm']}")
                st.write(f"**Type:** {st.session_state.current_chatbot['workflow'].capitalize()}")
        else:
            st.warning("No chatbots available. Please create a chatbot first.")
            
            if st.button("Create a New Chatbot"):
                st.switch_page("Manage_Chatbots.py")

        if st.session_state.current_chatbot:
            datasets = fetch_datasets()
            
            if datasets:
                selected_dataset_name = st.selectbox(
                    "Choose an evaluation dataset", 
                    options=[dataset['name'] for dataset in datasets]
                )
                
                if selected_dataset_name:
                    selected_dataset = next((ds for ds in datasets if ds["name"] == selected_dataset_name), None)
                    
                    if selected_dataset:
                        st.subheader("Evaluation Settings")
                        
                        col1, col2 = st.columns(2)
                        with col1:
                            use_all_questions = st.checkbox("Evaluate all questions", value=True)
                        
                        max_questions = len(selected_dataset['qa_pairs'])
                        if not use_all_questions:
                            with col2:
                                max_questions = st.number_input(
                                    "Maximum number of questions to evaluate", 
                                    min_value=1,
                                    max_value=len(selected_dataset['qa_pairs']),
                                    value=min(10, len(selected_dataset['qa_pairs'])),
                                    step=1
                                )
                        
                        if st.button("Start Evaluation", type="primary"):
                            qa_pairs = selected_dataset['qa_pairs'][:max_questions]
                            
                            progress_bar = st.progress(0)
                            status = st.empty()
                            
                            questions = []
                            ground_truths = []
                            answers = []
                            contexts_list = []
                            
                            for i, qa_pair in enumerate(qa_pairs):
                                question = qa_pair.get('question')
                                ground_truth = qa_pair.get('answer') or qa_pair.get('ground_truth')
                                
                                status.text(f"Processing question {i+1}/{len(qa_pairs)}: {question[:50]}...")
                                
                                try:
                                    with httpx.Client(timeout=600.0) as client:
                                        response = client.post(
                                            "http://api:8000/chat/", 
                                            json={
                                                "query": question,
                                                "chatbot_id": st.session_state.current_chatbot["id"]
                                            }
                                        )
                                        response.raise_for_status()
                                        result = response.json()
                                        
                                        answer = result.get("response", "")
                                        contexts = result.get("contexts", [])
                                        
                                        questions.append(question)
                                        ground_truths.append(ground_truth)
                                        answers.append(answer)
                                        contexts_list.append(contexts)
                                except Exception as e:
                                    st.error(f"Error processing question {i+1}: {str(e)}")
                                    questions.append(question)
                                    ground_truths.append(ground_truth)
                                    answers.append(f"Error: {str(e)}")
                                    contexts_list.append([])
                                
                                progress_bar.progress((i + 1) / len(qa_pairs))
                            
                            status.text("Calculating metrics and saving results...")
                            
                            try:
                                with httpx.Client(timeout=600.0) as client:
                                    eval_response = client.post(
                                        "http://api:8000/evaluation/evaluate-chatbot", 
                                        json={
                                            "dataset_name": selected_dataset_name,
                                            "chatbot_id": st.session_state.current_chatbot["id"],
                                            "questions": questions,
                                            "ground_truths": ground_truths,
                                            "answers": answers,
                                            "retrieved_contexts": contexts_list
                                        }
                                    )
                                    eval_response.raise_for_status()
                                    evaluation_result = eval_response.json()
                                    
                                    st.session_state.last_evaluation = evaluation_result
                                    
                                    metrics = evaluation_result.get("metrics_summary", {})
                                    
                                    if metrics:
                                        st.success("Evaluation completed successfully!")
                                        
                                        metrics_df = pd.DataFrame({
                                            "Metric": list(metrics.keys()),
                                            "Value": list(metrics.values())
                                        })
                                        
                                        fig = px.bar(
                                            metrics_df, 
                                            x="Metric", 
                                            y="Value", 
                                            text="Value",
                                            color="Metric",
                                            color_discrete_sequence=px.colors.qualitative.Set2,
                                            title="Evaluation Metrics"
                                        )
                                        fig.update_layout(yaxis_range=[0, 1])
                                        fig.update_traces(texttemplate='%{text:.2f}', textposition='outside')
                                        
                                        st.plotly_chart(fig, use_container_width=True)
                                        
                                        st.info("View detailed results in the 'View Evaluation Results' tab.")
                                        
                                        st.session_state.evaluations = fetch_evaluations()
                                    else:
                                        st.warning("No metrics returned from evaluation.")
                            except Exception as e:
                                st.error(f"Error during evaluation: {str(e)}")
                    else:
                        st.error("Selected dataset not found.")
            else:
                st.warning("No evaluation datasets available. Please create a dataset first.")
    
    else:
        st.subheader("Multiple Chatbots Evaluation")
        
        if not st.session_state.available_chatbots:
            st.warning("No chatbots available. Please create chatbots first.")
            
            if st.button("Create a New Chatbot"):
                st.switch_page("Manage_Chatbots.py")
        else:
            chatbot_options = {f"{chatbot['name']} ({chatbot['llm']})": chatbot for chatbot in st.session_state.available_chatbots}
            selected_chatbot_names = st.multiselect(
                "Select chatbots to evaluate:",
                options=list(chatbot_options.keys()),
                default=[]
            )
            
            selected_chatbots = [chatbot_options[name] for name in selected_chatbot_names]
            
            if selected_chatbots:
                st.write(f"Selected {len(selected_chatbots)} chatbots for evaluation.")
                
                datasets = fetch_datasets()
                
                if datasets:
                    selected_dataset_name = st.selectbox(
                        "Choose an evaluation dataset", 
                        options=[dataset['name'] for dataset in datasets],
                        key="multi_dataset_selector"
                    )
                    
                    if selected_dataset_name:
                        selected_dataset = next((ds for ds in datasets if ds["name"] == selected_dataset_name), None)
                        
                        if selected_dataset:
                            st.subheader("Evaluation Settings")
                            
                            col1, col2 = st.columns(2)
                            with col1:
                                use_all_questions = st.checkbox("Evaluate all questions", value=True, key="multi_eval_all_questions")
                            
                            max_questions = len(selected_dataset['qa_pairs'])
                            if not use_all_questions:
                                with col2:
                                    max_questions = st.number_input(
                                        "Maximum number of questions to evaluate", 
                                        min_value=1,
                                        max_value=len(selected_dataset['qa_pairs']),
                                        value=min(10, len(selected_dataset['qa_pairs'])),
                                        step=1,
                                        key="multi_max_questions"
                                    )
                            
                            if st.button("Start Multi-Chatbot Evaluation", type="primary"):
                                qa_pairs = selected_dataset['qa_pairs'][:max_questions]
                                
                                results_container = st.container()
                                with results_container:
                                    st.subheader("Evaluation Progress")
                                    overall_progress = st.progress(0)
                                    status = st.empty()
                                    chatbot_results = {}
                                
                                for chatbot_index, chatbot in enumerate(selected_chatbots):
                                    status.text(f"Evaluating chatbot {chatbot_index+1}/{len(selected_chatbots)}: {chatbot['name']}...")
                                    
                                    chatbot_progress = st.progress(0)
                                    chatbot_status = st.empty()
                                    
                                    questions = []
                                    ground_truths = []
                                    answers = []
                                    contexts_list = []
                                    
                                    for i, qa_pair in enumerate(qa_pairs):
                                        question = qa_pair.get('question')
                                        ground_truth = qa_pair.get('answer') or qa_pair.get('ground_truth')
                                        
                                        chatbot_status.text(f"Processing question {i+1}/{len(qa_pairs)}: {question[:50]}...")
                                        
                                        try:
                                            with httpx.Client(timeout=600.0) as client:
                                                response = client.post(
                                                    "http://api:8000/chat/", 
                                                    json={
                                                        "query": question,
                                                        "chatbot_id": chatbot["id"]
                                                    }
                                                )
                                                response.raise_for_status()
                                                result = response.json()
                                                
                                                answer = result.get("response", "")
                                                contexts = result.get("contexts", [])
                                                
                                                questions.append(question)
                                                ground_truths.append(ground_truth)
                                                answers.append(answer)
                                                contexts_list.append(contexts)
                                        except Exception as e:
                                            st.error(f"Error processing question {i+1} for chatbot {chatbot['name']}: {str(e)}")
                                            questions.append(question)
                                            ground_truths.append(ground_truth)
                                            answers.append(f"Error: {str(e)}")
                                            contexts_list.append([])
                                        
                                        chatbot_progress.progress((i + 1) / len(qa_pairs))
                                    
                                    chatbot_status.text(f"Calculating metrics for {chatbot['name']}...")
                                    
                                    try:
                                        with httpx.Client(timeout=600000.0) as client:
                                            eval_response = client.post(
                                                "http://api:8000/evaluation/evaluate-chatbot", 
                                                json={
                                                    "dataset_name": selected_dataset_name,
                                                    "chatbot_id": chatbot["id"],
                                                    "questions": questions,
                                                    "ground_truths": ground_truths,
                                                    "answers": answers,
                                                    "retrieved_contexts": contexts_list
                                                }
                                            )
                                            eval_response.raise_for_status()
                                            evaluation_result = eval_response.json()
                                            
                                            chatbot_results[chatbot['name']] = {
                                                "evaluation_id": evaluation_result.get("evaluation_id"),
                                                "metrics": evaluation_result.get("metrics_summary", {})
                                            }
                                            
                                            chatbot_status.success(f"Evaluation of {chatbot['name']} completed!")
                                    except Exception as e:
                                        st.error(f"Error during evaluation of {chatbot['name']}: {str(e)}")
                                        chatbot_status.error(f"Evaluation failed for {chatbot['name']}")
                                    
                                    overall_progress.progress((chatbot_index + 1) / len(selected_chatbots))
                                
                                status.success(f"Evaluation of {len(selected_chatbots)} chatbots completed!")
                                
                                if chatbot_results:
                                    st.subheader("Comparative Results")
                                    
                                    comparison_data = []
                                    for chatbot_name, result in chatbot_results.items():
                                        metrics = result.get("metrics", {})
                                        for metric_name, value in metrics.items():
                                            comparison_data.append({
                                                "Chatbot": chatbot_name,
                                                "Metric": metric_name,
                                                "Value": value
                                            })
                                    
                                    if comparison_data:
                                        comparison_df = pd.DataFrame(comparison_data)
                                        
                                        fig = px.bar(
                                            comparison_df,
                                            x="Metric",
                                            y="Value",
                                            color="Chatbot",
                                            barmode="group",
                                            text="Value",
                                            title="Comparative Evaluation Metrics",
                                            color_discrete_sequence=px.colors.qualitative.Set2
                                        )
                                        fig.update_layout(yaxis_range=[0, 1])
                                        fig.update_traces(texttemplate='%{text:.2f}', textposition='outside')
                                        
                                        st.plotly_chart(fig, use_container_width=True)
                                        
                                        pivot_df = comparison_df.pivot(index="Chatbot", columns="Metric", values="Value")
                                        pivot_df["Average"] = pivot_df.mean(axis=1)
                                        st.dataframe(
                                            pivot_df.style.format("{:.3f}").background_gradient(cmap="YlGn"),
                                            use_container_width=True
                                        )
                                        
                                        csv = pivot_df.to_csv().encode('utf-8')
                                        st.download_button(
                                            label="Download Comparison Results as CSV",
                                            data=csv,
                                            file_name=f"evaluation_comparison_{selected_dataset_name}.csv",
                                            mime="text/csv",
                                        )
                                    
                                    st.info("View detailed results for each chatbot in the 'View Evaluation Results' tab.")
                                    
                                    st.session_state.evaluations = fetch_evaluations()
                        else:
                            st.error("Selected dataset not found.")
                else:
                    st.warning("No evaluation datasets available. Please create a dataset first.")
with tab5:
    st.subheader("Evaluation Results")
    
    if st.button("Load Evaluation Results"):
        with st.spinner("Loading evaluation results..."):
            evaluations = fetch_evaluations()
            if evaluations:
                st.session_state.evaluations = evaluations
                st.success(f"Loaded {len(evaluations)} evaluation results")
            else:
                st.warning("No evaluation results found")
    
    if st.session_state.evaluations:
        evaluations = sorted(
            st.session_state.evaluations, 
            key=lambda x: x.get("timestamp", ""), 
            reverse=True
        )
        
        overview = []
        for eval in evaluations:
            metrics = eval.get("evaluation", {}).get("metrics_summary", {})
            overview.append({
                "id": eval.get("_id", ""),
                "name": eval.get("name", "Unknown"),
                "timestamp": eval.get("timestamp", ""),
                "chatbot": eval.get("chatbot", {}).get("name", "Unknown"),
                "dataset": eval.get("dataset", {}).get("name", "Unknown"),
                "questions": eval.get("dataset", {}).get("num_questions", 0),
                "faithfulness": metrics.get("faithfulness", 0),
                "context_recall": metrics.get("context_recall", 0),
                "answer_relevancy": metrics.get("answer_relevancy", 0),
                "context_precision": metrics.get("context_precision", 0),
                "avg_score": sum(metrics.values()) / len(metrics) if metrics else 0
            })
        
        overview_df = pd.DataFrame(overview)
        st.dataframe(
            overview_df,
            column_config={
                "id": st.column_config.TextColumn("ID", width="small"),
                "name": st.column_config.TextColumn("Name", width="medium"),
                "timestamp": st.column_config.DatetimeColumn("Date", width="medium"),
                "chatbot": st.column_config.TextColumn("Chatbot", width="medium"),
                "dataset": st.column_config.TextColumn("Dataset", width="medium"),
                "questions": st.column_config.NumberColumn("Questions", width="small"),
                "faithfulness": st.column_config.ProgressColumn("Faithfulness", width="medium", min_value=0, max_value=1, format="%.2f"),
                "context_recall": st.column_config.ProgressColumn("Context Recall", width="medium", min_value=0, max_value=1, format="%.2f"),
                "answer_relevancy": st.column_config.ProgressColumn("Answer Relevancy", width="medium", min_value=0, max_value=1, format="%.2f"),
                "context_precision": st.column_config.ProgressColumn("Context Precision", width="medium", min_value=0, max_value=1, format="%.2f"),
                "avg_score": st.column_config.ProgressColumn("Average", width="medium", min_value=0, max_value=1, format="%.2f")
            },
            use_container_width=True,
            hide_index=True
        )
        
        eval_options = [f"{e.get('name', 'Unknown')} ({e.get('chatbot', {}).get('name', 'Unknown')}, {e.get('timestamp', 'Unknown')})" for e in evaluations]
        selected_eval = st.selectbox("Select an evaluation to view details:", options=[""] + eval_options)
        
        if selected_eval != "":
            selected_index = eval_options.index(selected_eval)
            selected_evaluation = evaluations[selected_index]
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.subheader("Chatbot Information")
                chatbot_info = selected_evaluation.get("chatbot", {})
                if chatbot_info:
                    st.write(f"**Name:** {chatbot_info.get('name', 'Unknown')}")
                    st.write(f"**Workflow:** {chatbot_info.get('workflow', 'Unknown')}")
                    st.write(f"**LLM:** {chatbot_info.get('llm', 'Unknown')}")
                    st.write(f"**Collections:** {', '.join(chatbot_info.get('collections', []))}")
                    st.write(f"**HyDE:** {'Yes' if chatbot_info.get('hyde', False) else 'No'}")
                    st.write(f"**Hybrid Search:** {'Yes' if chatbot_info.get('hybrid_search', False) else 'No'}")
                    st.write(f"**Top-K:** {chatbot_info.get('top_k', 'Unknown')}")
                    
                    if chatbot_info.get('reranking', False):
                        st.write(f"**Reranking:** Yes ({chatbot_info.get('reranker', 'Unknown')})")
                    else:
                        st.write("**Reranking:** No")
            
            with col2:
                st.subheader("Dataset Information")
                dataset_info = selected_evaluation.get("dataset", {})
                if dataset_info:
                    st.write(f"**Name:** {dataset_info.get('name', 'Unknown')}")
                    st.write(f"**Source:** {dataset_info.get('source_collection', 'Unknown')}")
                    st.write(f"**Questions:** {dataset_info.get('num_questions', 'Unknown')}")
                    st.write(f"**Generator:** {dataset_info.get('generator', 'Unknown')}")
                    st.write(f"**Generated at:** {dataset_info.get('generated_at', 'Unknown')}")
            
            st.subheader("Evaluation Metrics")
            metrics = selected_evaluation.get("evaluation", {}).get("metrics_summary", {})
            
            if metrics:
                metrics_df = pd.DataFrame({
                    "Metric": list(metrics.keys()),
                    "Value": list(metrics.values())
                })
                
                fig = px.bar(
                    metrics_df, 
                    x="Metric", 
                    y="Value", 
                    text="Value",
                    color="Metric",
                    color_discrete_sequence=px.colors.qualitative.Set2,
                    title="Evaluation Metrics"
                )
                fig.update_layout(yaxis_range=[0, 1])
                fig.update_traces(texttemplate='%{text:.2f}', textposition='outside')
                
                st.plotly_chart(fig, use_container_width=True)
            
            st.subheader("Question-Answer Pairs")
            qa_pairs = selected_evaluation.get("evaluation", {}).get("question_answer_pairs", [])
            
            if qa_pairs:
                pair_index = st.slider("Select question:", 1, len(qa_pairs), 1) - 1
                current_pair = qa_pairs[pair_index]


import numpy as np

with tab5:
    
    st.markdown("---")
    
    st.subheader("Compare Evaluation Results")
    
    if "evaluations" in st.session_state and st.session_state.evaluations:
        dataset_groups = {}
        for eval in st.session_state.evaluations:
            dataset_name = eval.get("dataset", {}).get("name", "Unknown")
            if dataset_name not in dataset_groups:
                dataset_groups[dataset_name] = []
            dataset_groups[dataset_name].append(eval)
        
        datasets = list(dataset_groups.keys())
        selected_dataset = st.selectbox(
            "Select a dataset to compare evaluations:", 
            options=datasets,
            key="compare_dataset_selector"
        )
        
        if selected_dataset:
            dataset_evaluations = dataset_groups[selected_dataset]
            
            eval_options = {
                f"{e.get('chatbot', {}).get('name', 'Unknown')} ({e.get('timestamp', '').split('T')[0]})": e 
                for e in dataset_evaluations
            }
            
            selected_eval_names = st.multiselect(
                "Select evaluations to compare:",
                options=list(eval_options.keys()),
                default=[list(eval_options.keys())[0]] if eval_options else [],
                key="compare_evals_multiselect"
            )
            
            if len(selected_eval_names) > 0:
                selected_evals = [eval_options[name] for name in selected_eval_names]
                
                chart_data = []
                categories = ['faithfulness', 'answer_relevancy', 'context_recall', 'context_precision']
                
                for eval in selected_evals:
                    metrics = eval.get("evaluation", {}).get("metrics_summary", {})
                    chatbot_name = eval.get("chatbot", {}).get("name", "Unknown")
                    
                    eval_data = {}
                    for cat in categories:
                        value = metrics.get(cat, 0)
                        if isinstance(value, float) and (pd.isna(value) or np.isinf(value)):
                            value = 0
                        eval_data[cat] = value
                    
                    eval_data["Chatbot"] = chatbot_name
                    
                    chart_data.append(eval_data)
                
                df_chart = pd.DataFrame(chart_data)
                
                st.subheader("Metrics Comparison Table")
                
                df_display = df_chart.set_index('Chatbot').T.reset_index()
                df_display.rename(columns={'index': 'Metric'}, inplace=True)
                
                st.dataframe(
                    df_display.set_index('Metric').style.format("{:.3f}").background_gradient(cmap="YlGn", axis=1),
                    use_container_width=True
                )
                
                st.subheader("Metrics Comparison Spider Chart")
                
                import plotly.graph_objects as go
                
                fig = go.Figure()
                
                for i, row in df_chart.iterrows():
                    chatbot_name = row['Chatbot']
                    values = [row[cat] for cat in categories]
                    values.append(values[0])
                    
                    fig.add_trace(go.Scatterpolar(
                        r=values,
                        theta=categories + [categories[0]],
                        fill='toself',
                        name=chatbot_name
                    ))
                
                fig.update_layout(
                    polar=dict(
                        radialaxis=dict(
                            visible=True,
                            range=[0, 1]
                        )
                    ),
                    showlegend=True,
                    title="RAGAS Metrics Comparison"
                )
                
                st.plotly_chart(fig, use_container_width=True)
                
                csv_data = df_display.to_csv(index=False).encode('utf-8')
                st.download_button(
                    label="Download Comparison as CSV",
                    data=csv_data,
                    file_name=f"metrics_comparison_{selected_dataset}.csv",
                    mime="text/csv"
                )
            else:
                st.info("Please select at least one evaluation to display.")
    else:
        st.info("No evaluation results available. Please load evaluation results first.")