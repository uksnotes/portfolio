# 올바로 챗봇 💬

검증된 내부 데이터를 기반으로 신뢰할 수 있는 답변을 제공하는 AI 챗봇입니다.

## 🚀 배포 방법

### Streamlit Cloud 배포 (추천)

1. 이 저장소를 GitHub에 푸시합니다
2. [Streamlit Cloud](https://share.streamlit.io/)에 접속합니다
3. GitHub 계정으로 로그인합니다
4. "New app" 버튼을 클릭합니다
5. 저장소를 선택하고 `main.py`를 메인 파일로 설정합니다
6. "Deploy" 버튼을 클릭합니다

### 로컬 실행

```bash
pip install -r requirements.txt
streamlit run main.py
```

## 📁 프로젝트 구조

```
insurance_langgraph/
├── main.py              # 메인 Streamlit 앱
├── streamlit_wrapper.py # Streamlit 래퍼
├── nodes.py            # LangGraph 노드들
├── chain.py            # 체인 구성
├── state.py            # 상태 관리
├── retriever.py        # 검색기
├── rag/                # RAG 관련 파일들
└── requirements.txt    # 의존성 패키지
```

## 🔧 환경 변수

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```
OPENAI_API_KEY=your_openai_api_key
LANGCHAIN_API_KEY=your_langchain_api_key
LANGCHAIN_PROJECT=Insurance_RAG
```

## 📝 라이선스

MIT License 