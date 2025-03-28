# 📁 Uks Portfolio


## ✅ 프로젝트 목록

### 1. Credit Card Fraud Detection  

### 2. Global Active Power Anomaly Detection  

### 3. Insurance LangGraph  
- 보험 도메인 특화 멀티소스 RAG 기반 QA 시스템  
- 고객정보 + 웹검색 + 문서 기반 통합 응답 생성

---

#  insurance langgraph  
### 보험 도메인에 특화된 LangGraph 기반 멀티소스 RAG QA 시스템

## 🔍 개요

`insurance_langgraph`는 보험업 고객의 자연어 질의에 대해 웹, 고객DB, 보험 문서 등 다양한 소스에서 정보를 추출해 자동으로 답변을 생성하는 QA 시스템입니다.

LangGraph를 기반으로 조건에 따라 경로가 분기되며, 각 노드는 독립적인 기능을 수행하여 멀티소스 RAG 구조를 구성합니다.

**주요 응답 방식:**
- 웹 검색 기반 LLM 응답  
- 고객 정보 기반 의사결정 지원
- 보험 문서(RAG PDF) 기반 응답

---

## 🧩 시스템 구조

LangGraph를 기반으로 다음과 같은 흐름으로 질문을 처리합니다:

graph TD
    A[사용자 질문] --> B[질문 라우팅]
    B --> C[웹 검색]
    B --> D[고객 정보 조회]
    B --> E[보험 문서 검색]
    C --> F[웹 기반 응답 생성]
    D --> G[KCD 코드 통계 조회<br>유사 심사 사례 확인<br>고객 데이터를 기반으로 보고서 생성]
    E --> H[문서 기반 응답 생성]
    F --> I[최종 응답]
    G --> I
    H --> I
