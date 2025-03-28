import streamlit as st
from langchain_core.messages.chat import ChatMessage

from dotenv import load_dotenv
from streamlit_wrapper import create_graph, stream_graph
from langchain_teddynote import logging
from langsmith import Client
from langchain_core.messages import HumanMessage, AIMessage
from langchain_teddynote.messages import random_uuid

load_dotenv()

# 프로젝트 이름을 입력합니다.
LANGSMITH_PROJECT = "Insurance_RAG"

# LangSmith 추적을 설정합니다.
logging.langsmith(LANGSMITH_PROJECT)


NAMESPACE = "langchain"

# LangSmith 클라이언트를 세션 상태에 저장합니다.
if "langsmith_client" not in st.session_state:
    st.session_state["langsmith_client"] = Client()

st.set_page_config(
    page_title="올바로 챗봇 💬",
    page_icon="💬",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("올바로 챗봇 💬")
st.markdown("🧑‍💻 **검증된 내부 데이터를 기반으로 신뢰할 수 있는 답변을 드립니다.**")

with st.sidebar:
    st.markdown("저작자: [uksnotes..](https://github.com/uksnotes)")

# 대화기록을 저장하기 위한 용도로 생성
if "messages" not in st.session_state:
    st.session_state["messages"] = []

# 스레드 ID를 저장하기 위한 용도로 생성
if "thread_id" not in st.session_state:
    st.session_state["thread_id"] = random_uuid()

# 사이드바 생성
with st.sidebar:
    st.markdown("---\n**대화 초기화**")

    # 초기화 버튼 생성
    clear_btn = st.button("대화초기화", type="primary", use_container_width=True)


# 이전 대화를 출력
def print_messages():
    for chat_message in st.session_state["messages"]:
        if chat_message.role == "user":
            st.chat_message(chat_message.role).write(chat_message.content)
        else:
            st.chat_message(chat_message.role).write(chat_message.content)


# 새로운 메시지를 추가
def add_message(role, message):
    st.session_state["messages"].append(ChatMessage(role=role, content=message))


def get_message_history():
    ret = []
    for chat_message in st.session_state["messages"]:
        if chat_message.role == "user":
            ret.append(HumanMessage(content=chat_message.content))
        else:
            ret.append(AIMessage(content=chat_message.content))

    return ret


# 체인 생성
if "graph" not in st.session_state:
    st.session_state["graph"] = create_graph()


if clear_btn:
    st.session_state["messages"] = []
    st.session_state["thread_id"] = random_uuid()

# 이전 대화 기록 출력
print_messages()

# 사용자의 입력
user_input = st.chat_input("올바로 챗봇에 대해 궁금한 내용을 물어보세요!")

if user_input:
    # 사용자의 입력을 화면에 표시
    st.chat_message("user").write(user_input)
    # 세션 상태에서 그래프 객체를 가져옴
    graph = st.session_state["graph"]

    # AI 답변을 화면에 표시
    with st.chat_message("assistant"):
        streamlit_container = st.empty()
        # 그래프를 호출하여 응답 생성
        response = stream_graph(
            graph,
            user_input,
            streamlit_container,
            thread_id=st.session_state["thread_id"],
        )

        # 응답에서 AI 답변 추출
        ai_answer = response["answer"]

        st.write(ai_answer)

    # 대화기록을 저장한다
    add_message("user", user_input)
    add_message("assistant", ai_answer)
