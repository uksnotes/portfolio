import streamlit as st
from langgraph.graph import END, START, StateGraph
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.runnables import RunnableConfig

from state import GraphState
from nodes import (
    RetrieveNode,
    QuestionRouterNode,
    WebSearchNode,
    InsurancePolicyRetrieveNode,
    LLMAiAnswerNode,
    LLMRagAnswerNode,
    LLMRagPdfAnswerNode,
)


def create_graph():
    workflow = StateGraph(GraphState)

    # 노드 등록
    workflow.add_node("web_search", WebSearchNode())
    workflow.add_node("retrieve", RetrieveNode())
    workflow.add_node("insurance_policy_retrieve", InsurancePolicyRetrieveNode())
    workflow.add_node("llm_answer_rag", LLMRagAnswerNode())
    workflow.add_node("llm_answer_ai_model", LLMAiAnswerNode())
    workflow.add_node("llm_answer_rag_pdf", LLMRagPdfAnswerNode())

    # 조건부 라우팅
    workflow.add_conditional_edges(
        START,
        QuestionRouterNode(),
        {
            "web_search": "web_search",
            "retrieve": "retrieve",
            "insurance_policy_retrieve": "insurance_policy_retrieve",
        },
    )

    # 노드 간 연결
    workflow.add_edge("web_search", "llm_answer_rag")
    workflow.add_edge("insurance_policy_retrieve", "llm_answer_rag_pdf")
    workflow.add_edge("retrieve", "llm_answer_ai_model")

    # 종료 설정
    workflow.add_edge("llm_answer_rag", END)
    workflow.add_edge("llm_answer_ai_model", END)
    workflow.add_edge("llm_answer_rag_pdf", END)

    # 그래프 컴파일
    app = workflow.compile(checkpointer=MemorySaver())
    return app


def stream_graph(
    app,
    query: str,
    streamlit_container,
    thread_id: str,
):

    config = RunnableConfig(recursion_limit=5, configurable={"thread_id": thread_id})

    inputs = GraphState(question=query)

    actions = {
        "retrieve": "🔍 고객 정보를 조회하는 중입니다.",
        "llm_answer_ai_model": "👨🏻‍💻 고객 정보를 기반으로 답변을 생성하는 중입니다.",
        "insurance_policy_retrieve": "🔍 문서 정보를 조회하는 중입니다.",
        "llm_answer_rag_pdf": "👨🏻‍💻 문서를 기반으로 답변을 생성하는 중입니다.",
        "web_search": "🛜 웹 검색을 진행하는 중입니다.",
        "llm_answer_rag": "👨🏻‍💻 웹 검색을 기반으로 답변을 생성하는 중입니다.",
    }

    with streamlit_container.status(
        "열심히 분석중입니다..👨🏻‍💻", expanded=True
    ) as status:
        st.write("질문의 의도를 분석하는 중입니다..🧑‍💻 ")
        for output in app.stream(inputs, config=config):
            for key, value in output.items():
                if key in actions:
                    st.write(actions[key])
        status.update(label="답변 완료", state="complete", expanded=False)

    return app.get_state(config={"configurable": {"thread_id": thread_id}}).values
