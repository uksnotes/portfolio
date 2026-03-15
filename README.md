# Changuk Lee (이창욱)

**Data Scientist & Data Analyst**

[![GitHub](https://img.shields.io/badge/GitHub-uksnotes-181717?style=flat&logo=github)](https://github.com/uksnotes)
[![Email](https://img.shields.io/badge/Email-leeccuu@gmail.com-D14836?style=flat&logo=gmail&logoColor=white)](mailto:leeccuu@gmail.com)

데이터 기반 문제 정의부터 모델 설계, 서비스 연동까지 전 과정을 수행하는 데이터 분석가입니다.  
자동화와 효율화 관점에서 복잡한 문제를 구조화하고 실무에서 바로 활용 가능한 형태로 구현합니다.

---

## Projects

### 1. Insurance LangGraph — 보험 도메인 AI 챗봇

> LangGraph 기반 멀티소스 RAG QA 시스템

보험 약관, 고객 DB, 웹 검색 등 다양한 소스에서 정보를 추출해 자동 응답을 생성하는 챗봇입니다. LangGraph의 조건 분기 구조를 활용하여 질문 유형에 따라 최적의 데이터 소스를 선택합니다.

**Tech Stack:** `Python` `LangGraph` `LangChain` `FAISS` `Streamlit` `OpenAI API`

```
질문 입력 → 라우팅 → [웹 검색 | 고객정보 조회 | 보험문서 RAG] → LLM 응답 생성
```

<details>
<summary>📸 시스템 스크린샷</summary>

| Login | ChatBot |
|:---:|:---:|
| ![Login](https://github.com/uksnotes/portfolio/raw/main/insurance_langgraph/example/main.png) | ![ChatBot](https://github.com/uksnotes/portfolio/raw/main/insurance_langgraph/example/example1.png) |

| 고객정보 기반 응답 | 보험문서 RAG 응답 |
|:---:|:---:|
| ![Example2](https://github.com/uksnotes/portfolio/raw/main/insurance_langgraph/example/example2.png) | ![Example3](https://github.com/uksnotes/portfolio/raw/main/insurance_langgraph/example/example3.png) |

</details>

📂 [`insurance_langgraph/`](./insurance_langgraph)

---

### 2. Stock Analyzer — 국내 주식 팩터 분석기

> 10-Factor 모델 기반 KOSPI TOP 200 종목 스코어링 시스템

단기 기술적 분석(이평선, RSI, MACD, 볼린저 등)과 중장기 가치 분석(PER, PBR, 배당 등)을 결합한 10-Factor 스코어링 모델로, 종목별 점수를 산출하고 차트·방어 라인까지 자동 생성합니다.

**Tech Stack:** `Python` `NumPy` `Pandas` `Lightweight Charts` `Naver Finance API`

**주요 기능:**
- 단기 / 중장기 모드 전환
- 섹터별 필터링 및 종목 검색
- 캔들 차트(일봉/월봉) + 이동평균선
- 팩터별 분석 코멘트 및 매매 레벨 자동 산출

<details>
<summary>📸 시스템 스크린샷</summary>

| 스코어 테이블 | 종목 상세 분석 |
|:---:|:---:|
| ![Table](https://github.com/uksnotes/portfolio/raw/main/stock/examples/example1.png) | ![Detail](https://github.com/uksnotes/portfolio/raw/main/stock/examples/example2.png) |

| 차트 분석 | 섹터 요약 |
|:---:|:---:|
| ![Chart](https://github.com/uksnotes/portfolio/raw/main/stock/examples/example3.png) | ![Sector](https://github.com/uksnotes/portfolio/raw/main/stock/examples/example4.png) |

</details>

📂 [`stock/`](./stock)

---

### 3. Credit Card Fraud Detection

> 불균형 데이터 환경에서의 이상 거래 탐지 모델

Kaggle 신용카드 거래 데이터(284K건)를 활용한 사기 탐지 분류 모델입니다. 극심한 클래스 불균형(0.17%) 환경에서 SMOTE 리샘플링과 다양한 ML 알고리즘(Logistic Regression, SVM, Random Forest 등)을 비교 분석했습니다.

**Tech Stack:** `Python` `scikit-learn` `Pandas` `Seaborn` `t-SNE`

📂 [`credit_card_fraud_detection/`](./credit_card_fraud_detection)

---

### 4. Global Active Power — 시계열 이상 탐지

> PySpark + Prophet 기반 전력 소비 이상 탐지

UCI 가정용 전력 소비 데이터를 PySpark로 전처리하고, Facebook Prophet으로 시계열 예측 및 이상치를 탐지합니다. 분산 처리 환경에서의 대용량 시계열 분석 파이프라인 구현 사례입니다.

**Tech Stack:** `PySpark` `Prophet` `Pandas` `Matplotlib`

📂 [`pyspark_prophet/`](./pyspark_prophet)

---

### 5. LunchChat — AI 점심 메이트 매칭

> Gemini API 기반 이미지 생성 웹 서비스

음식 키워드를 입력하면 AI가 점심 메이트 이미지와 추천 메시지를 생성하는 웹 앱입니다. Supabase 인증 및 생성 이력 관리, Gemini API를 활용한 이미지 생성 기능을 포함합니다.

**Tech Stack:** `React` `Tailwind CSS` `Supabase` `Google Gemini API`

<details>
<summary>📸 시스템 스크린샷</summary>

| 메인 화면 | 이미지 생성 |
|:---:|:---:|
| ![Main](https://github.com/uksnotes/portfolio/raw/main/lunch_chat/examples/example1.png) | ![Generate](https://github.com/uksnotes/portfolio/raw/main/lunch_chat/examples/example2.png) |

| 결과 화면 | 히스토리 |
|:---:|:---:|
| ![Result](https://github.com/uksnotes/portfolio/raw/main/lunch_chat/examples/example3.png) | ![History](https://github.com/uksnotes/portfolio/raw/main/lunch_chat/examples/example4.png) |

</details>

📂 [`lunch_chat/`](./lunch_chat)

---

## Education

| 학교 | 전공 | 기간 |
|---|---|---|
| **서울대학교** (석사) | 데이터사이언스학과 | 2022.03 ~ 2024.02 |
| **University of Illinois at Urbana-Champaign** (학사) | 통계학, 경제학 복수전공 | 2015.08 ~ 2021.05 |

---

## Skills

`Python` `SQL` `scikit-learn` `PySpark` `LangGraph` `LangChain` `RAG` `Streamlit` `Supabase`
