# 📁 Uks Portfolio


## ✅ 프로젝트 목록

### 1. Credit Card Fraud Detection  

### 2. Global Active Power Anomaly Detection  

### 3. Insurance LangGraph  
- 보험 도메인 특화 멀티소스 RAG 기반 QA 시스템  
- 고객정보 + 웹검색 + 문서 기반 통합 응답 생성

---

### Insurance Langgraph  
- 보험 도메인에 특화된 LangGraph 기반 멀티소스 RAG QA 시스템

## 🔍 개요

`insurance_langgraph`는 보험업에서 고객의 질문에 대해 웹, 고객DB, 보험 문서 등 다양한 소스에서 정보를 추출해 자동으로 답변을 생성하는 QA 시스템입니다.

LangGraph를 기반으로 조건에 따라 경로가 분기되며, 각 노드는 독립적인 기능을 수행하여 멀티소스 RAG 구조를 구성합니다.

**주요 응답 방식:**
- 웹 검색 기반 LLM 응답  
- 고객 정보 기반 의사결정 지원
- 보험 문서(RAG PDF) 기반 응답

---

## 시스템 구조

LangGraph를 기반으로 다음과 같은 흐름으로 질문을 처리합니다:

```mermaid
graph TD
    A[로그인 페이지] --> B[관리자 승인]
    B --> C[질문 입력(사용자 질문)]
    C --> D[질문 라우팅]
    D --> E[웹 검색]
    D --> F[고객 정보 조회]
    D --> G[보험 문서 검색]
    E --> H[웹 기반 응답 생성]
    F --> I[KCD 코드 통계 조회<br>유사 심사 사례 확인<br>고객 데이터 기반 보고서 생성]
    G --> J[문서 기반 응답 생성]
    H --> K[최종 응답]
    I --> K
    J --> K
```

---

## 예시 화면

아래는 보험 문서 기반 응답 예시 화면들입니다.

#### 🖼️ Login Page
![ChatBot Image1](https://github.com/uksnotes/portfolio/raw/main/insurance_langgraph/example/main.png)

#### 🖼️ Registration Page
![ChatBot Image1](https://github.com/uksnotes/portfolio/raw/main/insurance_langgraph/example/user.png)

#### 🖼️ ChatBot Image1
![ChatBot Image1](https://github.com/uksnotes/portfolio/raw/main/insurance_langgraph/example/example1.png)

#### 🖼️ ChatBot Image2
![ChatBot Image2](https://github.com/uksnotes/portfolio/raw/main/insurance_langgraph/example/example2.png)

#### 🖼️ ChatBot Image3
![ChatBot Image3](https://github.com/uksnotes/portfolio/raw/main/insurance_langgraph/example/example3.png)

#### 🖼️ ChatBot Image4
![ChatBot Image4](https://github.com/uksnotes/portfolio/raw/main/insurance_langgraph/example/example4.png)

#### 🖼️ ChatBot Image5
![ChatBot Image5](https://github.com/uksnotes/portfolio/raw/main/insurance_langgraph/example/example5.png)

#### 🖼️ ChatBot Image6
![ChatBot Image6](https://github.com/uksnotes/portfolio/raw/main/insurance_langgraph/example/example6.png)

#### 🖼️ ChatBot Image7
![ChatBot Image7](https://github.com/uksnotes/portfolio/raw/main/insurance_langgraph/example/example7.png)

