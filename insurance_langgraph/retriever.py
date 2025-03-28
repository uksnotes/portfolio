import pandas as pd
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from rag.pdf import PDFRetrievalChain
from dotenv import load_dotenv
import streamlit as st

load_dotenv()


# 데이터 로드
def init_retriever():

    sample_data = pd.read_csv("./data/sample_data.csv")
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    faiss_cases_db = FAISS.load_local(
        "faiss_insurance_cases_db", embeddings, allow_dangerous_deserialization=True
    )
    faiss_kcd_db = FAISS.load_local(
        "faiss_kcd_db", embeddings, allow_dangerous_deserialization=True
    )

    pdf_retriever = PDFRetrievalChain(["data/약관.pdf"]).create_chain().retriever

    return sample_data, faiss_cases_db, faiss_kcd_db, pdf_retriever
