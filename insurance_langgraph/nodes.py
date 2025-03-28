from abc import ABC, abstractmethod
from langchain_core.documents import Document
from state import GraphState
from retriever import init_retriever
from chain import create_rag_chain, create_ai_rag_chain, create_question_router
from langchain_teddynote.tools.tavily import TavilySearch
import pandas as pd
import re

sample_data, faiss_cases_db, faiss_kcd_db, pdf_retriever = init_retriever()


class BaseNode(ABC):
    def __init__(self, **kwargs):
        self.name = kwargs.get("name", "BaseNode")

    @abstractmethod
    def execute(self, state: GraphState) -> GraphState:
        pass

    def __call__(self, state: GraphState):
        return self.execute(state)


class RetrieveNode(BaseNode):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = "RetrieveNode"

    def extract_contract_number(self, text: str) -> str:
        match = re.search(r"L\d{7}", text)
        return match.group() if match else "L99999999"

    def execute(self, state: GraphState) -> GraphState:
        print("==== [보험계약건 탐색] ====")
        question = state["question"]
        contract_number = self.extract_contract_number(question)

        print(f"🔍 보험계약번호 {contract_number} 검색 중...")

        # 계약번호로 원본 데이터 조회
        records = sample_data[sample_data["보험계약번호"] == contract_number]
        if records.empty:
            return {
                "context": {
                    "question": question,
                    "contract_number": contract_number,
                    "original_data": [],
                    "similar_cases": [],
                    "kcd_statistics": [],
                    "error": f"No data found for contract number {contract_number}.",
                }
            }

        # 유사사례 조회 (FAISS)
        results = []
        for _, case in records.iterrows():
            query_kcd_code = case["KCD코드"]
            query_text = (
                f"KCD Code: {query_kcd_code}, "
                f"Hospitalization Payment: {case['입통원지급보험금']}, "
                f"Surgery: {case['수술여부']}, "
                f"Treatment Duration: {case['치료기간']}, "
                f"Hospitalization Type: {case['입통원구분코드']}"
            )

            similar_docs = faiss_cases_db.similarity_search(query_text, k=10)
            filtered = [
                doc.metadata
                for doc in similar_docs
                if doc.metadata["KCD코드"] == query_kcd_code
            ]
            if filtered:
                results.append(filtered[0])

        # KCD 코드 통계 조회
        kcd_results = []
        for kcd in records["KCD코드"].unique():
            query_text = f"KCD Code: {kcd}"
            result = faiss_kcd_db.similarity_search(query_text, k=1)
            if result:
                kcd_results.append(result[0].metadata)

        # context 구성
        context = {
            "question": question,
            "contract_number": contract_number,
            "original_data": records.to_dict("records"),
            "similar_cases": pd.DataFrame(results).to_dict("records"),
            "kcd_statistics": pd.DataFrame(kcd_results).to_dict("records"),
        }

        return {"context": context}


class QuestionRouterNode(BaseNode):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = "QuestionRouterNode"
        self.router_chain = create_question_router()

    def execute(self, state: GraphState) -> str:
        question = state["question"]
        source = self.router_chain.invoke({"question": question})

        if source["datasource"] == "web_search":
            print("==== [ROUTE QUESTION TO WEB SEARCH] ====")
            return "web_search"
        elif source["datasource"] == "disclosure_vectorstore":
            print("==== [ROUTE QUESTION TO VECTORSTORE] ====")
            return "retrieve"
        elif source["datasource"] == "insurance_policy_retrieve":
            print("==== [ROUTE QUESTION TO INSURANCE POLICY RETRIEVE] ====")
            return "insurance_policy_retrieve"


class WebSearchNode(BaseNode):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = "WebSearchNode"
        self.web_search_tool = TavilySearch(max_results=3)

    def execute(self, state: GraphState) -> GraphState:
        question = state["question"]
        web_results = self.web_search_tool.invoke({"query": question})
        context = [
            Document(page_content=result["content"], metadata={"source": result["url"]})
            for result in web_results
        ]

        return {"question": question, "context": context}


class InsurancePolicyRetrieveNode(BaseNode):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = "InsurancePolicyRetrieveNode"

    def execute(self, state: GraphState) -> GraphState:
        question = state["question"]
        context = pdf_retriever.invoke(question)
        return {"context": context, "question": question}


class LLMAiAnswerNode(BaseNode):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = "LLMAiAnswerNode"
        self.llm_ai_notice = create_ai_rag_chain()

    def execute(self, state: GraphState) -> GraphState:
        context = state["context"]
        answer = self.llm_ai_notice.invoke(context)
        return {"answer": answer}


class LLMRagAnswerNode(BaseNode):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = "LLMRagAnswerNode"
        self.rag_chain = create_rag_chain()

    def execute(self, state: GraphState) -> GraphState:
        question = state["question"]
        context = state["context"]
        answer = self.rag_chain.invoke({"context": context, "question": question})
        return {"answer": answer}


class LLMRagPdfAnswerNode(BaseNode):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = "LLMRagPdfAnswerNode"
        self.rag_chain = create_rag_chain()

    def format_docs(self, docs):
        return "\n\n".join(
            [
                f'<document><content>{doc.page_content}</content><source>{doc.metadata["source"]}</source><page>{doc.metadata["page"]+1}</page></document>'
                for doc in docs
            ]
        )

    def execute(self, state: GraphState) -> GraphState:
        question = state["question"]
        context = state["context"]
        answer = self.rag_chain.invoke(
            {"context": self.format_docs(context), "question": question}
        )
        return {"answer": answer}
