from langchain import hub
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_teddynote.tools.tavily import TavilySearch
from langchain_openai import ChatOpenAI
from langchain import hub
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from typing import Dict, List, Literal, Optional, Any


# 쿼리 라우터
class RouteQuery(BaseModel):
    """Route a user query to the most relevant datasource."""

    datasource: Literal[
        "disclosure_vectorstore", "web_search", "insurance_policy_retrieve"
    ] = Field(
        ...,
        description="Select the most appropriate knowledge source based on the user query.",
    )


# 일반적인 체인
def create_rag_chain():
    prompt_rag = hub.pull("teddynote/rag-prompt")
    llm = ChatOpenAI(model_name="gpt-4o", temperature=0)
    rag_chain = prompt_rag | llm | StrOutputParser()
    return rag_chain


# AI고지 모델용 체인
def create_ai_rag_chain():
    prompt = hub.pull("rag-small/ai_notice_prompt")
    llm = ChatOpenAI(model_name="gpt-4o", temperature=0)
    rag_chain = prompt | llm | StrOutputParser()
    return rag_chain


# 쿼리 라우터
def create_question_router():
    # Initialize the LLM-based structured output
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    structured_llm_router = llm.with_structured_output(RouteQuery)

    # Define the system message and prompt template
    system = """You are an expert in routing user questions to the appropriate knowledge source.
    There are three available tools for answering user queries.

    # disclosure_vectorstore
    ** If the query contains an insurance contract number in the format 'L' always use this tool. **
    Contains structured data related to insurance contracts.  
    Includes policyholder details, KCD codes, and disclosure status.  
    Use this source when the question is related to disclosure status.

    # insurance_policy_vectorstore
    Contains the policy document for the Hyundai Insurance "현대해상 두배 받는 암보험" policy.
    Use this source when the question is related to the terms, conditions, or coverage details of this insurance product.  

    # web_search
    Use this source when the question is not related to insurance disclosure or the Hyundai Insurance "현대해상 두배 받는 암보험" policy.
    This tool searches the web to provide the most relevant and up-to-date information.  

    """

    # Create the routing prompt template
    route_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system),
            ("human", "{question}"),
        ]
    )

    # Combine the prompt template with the structured output LLM router
    question_router = route_prompt | structured_llm_router
    return question_router
