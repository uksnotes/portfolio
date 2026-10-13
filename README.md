# Changuk Lee (이창욱)

**Data Scientist & Data Analyst** | [About Me](https://uksnotes.github.io/uksnote.github.io/)

[![GitHub](https://img.shields.io/badge/GitHub-uksnotes-181717?style=flat&logo=github)](https://github.com/uksnotes)
[![Email](https://img.shields.io/badge/Email-leeccuu@gmail.com-D14836?style=flat&logo=gmail&logoColor=white)](mailto:leeccuu@gmail.com)

데이터 기반 문제 정의부터 모델 설계, 서비스 연동까지 전 과정을 수행하는 데이터 분석가입니다.  
자동화와 효율화 관점에서 복잡한 문제를 구조화하고 실무에서 바로 활용 가능한 형태로 구현합니다.

---

## Projects

### 1. UK'S OFFICE — 3D 개인 업무 오피스

> 투자 분석·뉴스·일정·여행·부동산·AI 팀을 하나로 묶은 3D 웹 워크스페이스 (Vercel + Supabase 배포)

3D 오피스 공간에서 캐릭터를 움직여 각 업무실로 들어가는 개인 업무 대시보드입니다. 주식 분석, 뉴스 확인, 일정 관리, 여행 계획, 부동산 조사, AI 리서치처럼 매일 반복하는 업무를 한 화면에서 처리할 수 있도록 구성했습니다. 이메일로 가입하면 바로 자기 오피스를 쓸 수 있는 웹 서비스로 배포했습니다.

**주요 기능:**
- **코스피200 단기 매매 후보 랭킹**: 코스피200 전 종목의 일봉 데이터를 수집해 추세(30%)·모멘텀(25%)·거래량(20%)·가격 위치(15%)·변동성(10%) 5개 팩터로 단기 점수를 산출하고 순위를 매깁니다. 종목별 5일 수익률, RSI, 거래량 배수와 함께 "매수 조건 관찰 / 과열·추격 보류 / 추세 회복 대기" 같은 상태를 표시합니다.
- **5년 인터랙티브 차트**: 랭킹에서 종목을 클릭하면 확대·축소가 가능한 5년 캔들 차트와 단기 지표를 보여주고, 매수 후보 구간·손절선·매도 목표 가격을 조건부 시나리오로 제시합니다.
- **보유 종목 분석**: 보유·관심종목을 등록하면 현재가를 조회해 평가금액·평가손익을 계산하고, 종목별 단기 점수와 1년/5년 시세 흐름을 함께 확인합니다.
- **뉴스 수집·핵심 요약**: 경제·사회·IT·세계·랭킹 5개 분야의 주요 기사를 최대 10건씩 가져와 본문에서 핵심 1~2문장과 주요 키워드를 자동으로 추립니다.
- **월간 일정·TO-DO**: 월간 캘린더에 일정을 등록하고, 오늘의 할 일을 추가·완료 처리하며 진행 현황을 메인 화면에서 바로 확인합니다.
- **역할별 AI 분석가 팀**: 업무를 지시하면 비서실장(업무 설계) → 리서치 분석가(자료 조사·웹 검색) → 데이터 분석가(수치 분석) → 검증 담당자(근거 검토) → 보고서 담당자(최종 보고) 순으로 5명의 AI가 단계별로 작업해 보고서를 만듭니다. 저장된 보유 종목·시세·뉴스를 함께 분석에 활용합니다.
- **여행 플래너**: Kiwi.com 실시간 운임으로 직항 왕복 최저가 TOP 3를 찾고, 한 항공사 왕복과 서로 다른 항공사 편도 2장 조합을 가격순으로 비교합니다. AI가 관광 명소·맛집·도보 동선을 묶은 날짜별 일정표와 지도를 만듭니다.
- **아파트 실거래·매물 비교**: 단지를 검색해 59㎡·84㎡ 실거래와 중개사 매물 TOP 3를 비교하고, 검색 근거로 로얄동 후보를 정리합니다.
- **공통 AI 키 관리**: ChatGPT·Claude·Gemini API 키를 계정별로 암호화(AES-GCM) 저장하고, 등록한 서비스만 골라 사용합니다.
- **회원·관리자**: 이메일 가입 즉시 이용, 관리자 화면에서 사용자 로그(가입·로그인·실패·요청) 확인과 문제 계정 차단. 서버 AI 키는 관리자만 쓰고 다른 사용자는 각자 키를 등록합니다.

**Tech Stack:** `Next.js` `React` `TypeScript` `Three.js` `Lightweight Charts` `Leaflet` `Supabase (Postgres·Auth)` `Vercel` `OpenAI / Claude / Gemini API`

```
3D 오피스 → 업무실 선택 → [분석실 | 투자실 | 뉴스룸 | 일정 보드 | AI 팀 오피스 | 여행 | 부동산 리서치]
브라우저 → Vercel (Next.js API) → Supabase (데이터·회원·사용자 로그 / 인증)
```

<details open>
<summary>📸 시스템 스크린샷</summary>

| 3D 오피스 | AI 팀 오피스 |
|:---:|:---:|
| ![Office](https://github.com/uksnotes/portfolio/raw/main/uksnote_office/examples/example1.png) | ![AITeam](https://github.com/uksnotes/portfolio/raw/main/uksnote_office/examples/example2.png) |

| 코스피200 랭킹 | 5년 인터랙티브 차트 |
|:---:|:---:|
| ![Ranking](https://github.com/uksnotes/portfolio/raw/main/uksnote_office/examples/example3.png) | ![Chart](https://github.com/uksnotes/portfolio/raw/main/uksnote_office/examples/example4.png) |

| 투자실 | 뉴스룸 |
|:---:|:---:|
| ![Portfolio](https://github.com/uksnotes/portfolio/raw/main/uksnote_office/examples/example5.png) | ![News](https://github.com/uksnotes/portfolio/raw/main/uksnote_office/examples/example6.png) |

| 여행 · 항공권 비교 | 부동산 리서치 |
|:---:|:---:|
| ![Travel](https://github.com/uksnotes/portfolio/raw/main/uksnote_office/examples/example7.png) | ![RealEstate](https://github.com/uksnotes/portfolio/raw/main/uksnote_office/examples/example8.png) |

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
