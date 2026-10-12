# Changuk Lee (이창욱)

**Data Scientist & Data Analyst** | [About Me](https://uksnotes.github.io/uksnote.github.io/)

[![GitHub](https://img.shields.io/badge/GitHub-uksnotes-181717?style=flat&logo=github)](https://github.com/uksnotes)
[![Email](https://img.shields.io/badge/Email-leeccuu@gmail.com-D14836?style=flat&logo=gmail&logoColor=white)](mailto:leeccuu@gmail.com)

데이터 기반 문제 정의부터 모델 설계, 서비스 연동까지 전 과정을 수행하는 데이터 분석가입니다.  
자동화와 효율화 관점에서 복잡한 문제를 구조화하고 실무에서 바로 활용 가능한 형태로 구현합니다.

---

## Projects

### 1. HI OFFICE — 3D 개인 업무 오피스

> 투자 분석·뉴스·일정·AI 팀을 하나로 묶은 로컬 3D 워크스페이스

3D 오피스 공간에서 캐릭터를 움직여 각 업무실로 들어가는 개인 업무 대시보드입니다. 코스피200 단기 매매 후보 랭킹(추세·모멘텀·거래량·가격 위치·변동성 5-Factor)과 5년 인터랙티브 차트, 뉴스 수집·핵심 요약, 월간 일정·TO-DO, 역할별 AI 분석가 팀(GPT / Claude), 아파트 실거래·매물 비교 기능을 제공합니다. Cloudflare D1 기반 웹 서비스 코드를 그대로 두고 로컬 Node 서버 + SQLite 어댑터로 감싸 `python app.py` 하나로 실행됩니다.

**Tech Stack:** `React` `TypeScript` `Three.js` `Lightweight Charts` `Node.js` `SQLite` `Python` `OpenAI / Claude API`

```
python app.py → Node 로컬 서버 → [3D 오피스 | 분석실 | 뉴스룸 | 일정 보드 | AI 팀 | 부동산] → SQLite 저장
```

<details open>
<summary>📸 시스템 스크린샷</summary>

| 3D 오피스 | AI 팀 오피스 |
|:---:|:---:|
| ![Office](https://github.com/uksnotes/portfolio/raw/main/uksnote_office/examples/example1.png) | ![AITeam](https://github.com/uksnotes/portfolio/raw/main/uksnote_office/examples/example2.png) |

| 코스피200 랭킹 | 뉴스룸 |
|:---:|:---:|
| ![Ranking](https://github.com/uksnotes/portfolio/raw/main/uksnote_office/examples/example3.png) | ![News](https://github.com/uksnotes/portfolio/raw/main/uksnote_office/examples/example4.png) |

</details>

📂 [`uksnote_office/`](./uksnote_office)

---

### 2. Insurance LangGraph — 보험 도메인 AI 챗봇

> LangGraph 기반 멀티소스 RAG QA 시스템

보험 약관, 고객 DB, 웹 검색 등 다양한 소스에서 정보를 추출해 자동 응답을 생성하는 챗봇입니다. LangGraph의 조건 분기 구조를 활용하여 질문 유형에 따라 최적의 데이터 소스를 선택합니다.

**Tech Stack:** `Python` `LangGraph` `LangChain` `FAISS` `Streamlit` `OpenAI API`

```
질문 입력 → 라우팅 → [웹 검색 | 고객정보 조회 | 보험문서 RAG] → LLM 응답 생성
```

<details open>
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

### 3. Stock Analyzer — 국내 주식 팩터 분석기

> 10-Factor 모델 기반 KOSPI TOP 200 종목 스코어링 시스템

단기 기술적 분석(이평선, RSI, MACD, 볼린저 등)과 중장기 가치 분석(PER, PBR, 배당 등)을 결합한 10-Factor 스코어링 모델로, 종목별 점수를 산출하고 차트·방어 라인까지 자동 생성합니다.

**Tech Stack:** `Python` `NumPy` `Pandas` `Lightweight Charts` `Naver Finance API`

**주요 기능:**
- 단기 / 중장기 모드 전환
- 섹터별 필터링 및 종목 검색
- 캔들 차트(일봉/월봉) + 이동평균선
- 팩터별 분석 코멘트 및 매매 레벨 자동 산출

<details open>
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

### 4. Credit Card Fraud Detection

> 불균형 데이터 환경에서의 이상 거래 탐지 모델

Kaggle 신용카드 거래 데이터(284K건)를 활용한 사기 탐지 분류 모델입니다. 극심한 클래스 불균형(0.17%) 환경에서 SMOTE 리샘플링과 다양한 ML 알고리즘(Logistic Regression, SVM, Random Forest 등)을 비교 분석했습니다.

**Tech Stack:** `Python` `scikit-learn` `Pandas` `Seaborn` `t-SNE`

📂 [`credit_card_fraud_detection/`](./credit_card_fraud_detection)

---

### 5. Global Active Power — 시계열 이상 탐지

> PySpark + Prophet 기반 전력 소비 이상 탐지

UCI 가정용 전력 소비 데이터를 PySpark로 전처리하고, Facebook Prophet으로 시계열 예측 및 이상치를 탐지합니다. 분산 처리 환경에서의 대용량 시계열 분석 파이프라인 구현 사례입니다.

**Tech Stack:** `PySpark` `Prophet` `Pandas` `Matplotlib`

📂 [`pyspark_prophet/`](./pyspark_prophet)

---

### 6. LunchChat — AI 점심 메이트 매칭

> Gemini API 기반 이미지 생성 웹 서비스

음식 키워드를 입력하면 AI가 점심 메이트 이미지와 추천 메시지를 생성하는 웹 앱입니다. Supabase 인증 및 생성 이력 관리, Gemini API를 활용한 이미지 생성 기능을 포함합니다.

**Tech Stack:** `React` `Tailwind CSS` `Supabase` `Google Gemini API`

<details open>
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
