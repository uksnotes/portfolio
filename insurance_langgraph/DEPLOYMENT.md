# 🚀 Streamlit 앱 배포 가이드

## 방법 1: Streamlit Cloud (추천 - 무료)

### 1단계: GitHub에 코드 업로드
```bash
# 현재 디렉토리에서
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/your-repo-name.git
git push -u origin main
```

### 2단계: Streamlit Cloud 배포
1. [Streamlit Cloud](https://share.streamlit.io/) 접속
2. GitHub 계정으로 로그인
3. "New app" 클릭
4. 저장소 선택
5. 메인 파일 경로: `main.py`
6. "Deploy" 클릭

### 3단계: 환경 변수 설정
Streamlit Cloud 대시보드에서:
1. 앱 선택 → Settings → Secrets
2. 다음 내용 추가:
```toml
OPENAI_API_KEY = "your-openai-api-key"
LANGCHAIN_API_KEY = "your-langchain-api-key"
LANGCHAIN_PROJECT = "Insurance_RAG"
```

## 방법 2: Railway (무료 티어 있음)

### 1단계: Railway 계정 생성
1. [Railway](https://railway.app/) 접속
2. GitHub 계정으로 로그인

### 2단계: 프로젝트 배포
1. "New Project" → "Deploy from GitHub repo"
2. 저장소 선택
3. 환경 변수 설정

### 3단계: Procfile 생성
```bash
echo "web: streamlit run main.py --server.port=\$PORT --server.address=0.0.0.0" > Procfile
```

## 방법 3: Heroku (유료)

### 1단계: Heroku CLI 설치
```bash
# macOS
brew install heroku/brew/heroku

# 로그인
heroku login
```

### 2단계: 앱 생성 및 배포
```bash
heroku create your-app-name
git push heroku main
```

### 3단계: 환경 변수 설정
```bash
heroku config:set OPENAI_API_KEY=your-api-key
heroku config:set LANGCHAIN_API_KEY=your-langchain-key
heroku config:set LANGCHAIN_PROJECT=Insurance_RAG
```

## 방법 4: Vercel (무료)

### 1단계: vercel.json 생성
```json
{
  "builds": [
    {
      "src": "main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "main.py"
    }
  ]
}
```

### 2단계: Vercel 배포
1. [Vercel](https://vercel.com/) 접속
2. GitHub 저장소 연결
3. 자동 배포

## 🔧 문제 해결

### 일반적인 오류들

1. **모듈을 찾을 수 없음**
   - `requirements.txt`에 모든 의존성 추가 확인
   - 로컬에서 `pip install -r requirements.txt` 테스트

2. **환경 변수 오류**
   - Streamlit Cloud: Settings → Secrets 확인
   - 로컬: `.env` 파일 확인

3. **메모리 부족**
   - `requirements.txt`에서 불필요한 패키지 제거
   - 더 가벼운 패키지 사용 고려

### 성능 최적화

1. **캐싱 사용**
```python
@st.cache_data
def load_data():
    # 데이터 로딩 로직
    pass
```

2. **세션 상태 관리**
```python
if "data" not in st.session_state:
    st.session_state.data = load_data()
```

## 📊 모니터링

- Streamlit Cloud: 대시보드에서 앱 상태 확인
- 로그 확인: 배포 플랫폼의 로그 섹션 활용
- 성능 모니터링: Streamlit의 내장 메트릭 활용 