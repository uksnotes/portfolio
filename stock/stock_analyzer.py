import pandas as pd
import numpy as np
import requests
import json
import os
import time
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

# ─────────────────────────────────────────────────────────────────────────────
#  단기 10-Factor 기술적 차트 분석 모델
#
#  F1  이평선 배열   14%   MA5/20/60 정배열·이격도
#  F2  RSI 모멘텀    12%   RSI 방향성·구간
#  F3  MACD 전환     11%   히스토그램·골든크로스
#  F4  볼린저 밴드   10%   스퀴즈·밴드 위치
#  F5  박스권 돌파   12%   20/60일 고가 돌파·52주 신고가
#  F6  거래량 에너지 11%   거래량 급증·상승일 비율
#  F7  OBV 추세       9%   OBV 방향·다이버전스
#  F8  캔들 패턴      8%   양봉 비율·장대양봉
#  F9  수급 흐름      8%   외인/기관 순매수
#  F10 시장 모멘텀    5%   섹터 수익률
# ─────────────────────────────────────────────────────────────────────────────
FACTOR_WEIGHTS = {
    'ma_alignment':    0.14,
    'rsi_momentum':    0.12,
    'macd_signal':     0.11,
    'bollinger':       0.10,
    'breakout':        0.12,
    'volume_energy':   0.11,
    'obv_trend':       0.09,
    'candle_pattern':  0.08,
    'supply_demand':   0.08,
    'sector_momentum': 0.05,
}

FACTOR_LABELS = {
    'ma_alignment':    '이평선 배열',
    'rsi_momentum':    'RSI 모멘텀',
    'macd_signal':     'MACD 전환',
    'bollinger':       '볼린저 밴드',
    'breakout':        '박스권 돌파',
    'volume_energy':   '거래량 에너지',
    'obv_trend':       'OBV 추세',
    'candle_pattern':  '캔들 패턴',
    'supply_demand':   '수급 흐름',
    'sector_momentum': '시장 모멘텀',
}

INDUSTRY_TO_SECTOR = {
    278: '반도체', 269: '디스플레이', 327: '디스플레이',
    273: '자동차', 270: '자동차부품',
    301: '금융', 321: '금융', 319: '금융', 337: '금융', 277: '금융',
    330: '보험', 315: '보험',
    305: '항공', 326: '항공/물류', 329: '운송',
    325: '에너지/전력', 306: '에너지/전력', 295: '에너지/전력',
    336: '통신', 333: '통신', 294: '통신장비', 292: '전자/IT',
    282: '전자/IT', 307: '전자/IT', 283: '전자/IT', 338: '전자/IT',
    263: '게임', 285: '엔터', 300: 'IT/플랫폼',
    267: 'IT서비스', 287: '소프트웨어', 293: 'IT/플랫폼',
    279: '건설', 289: '건설', 320: '건설', 280: '부동산',
    272: '화학', 311: '화학',
    304: '철강', 322: '비철금속',
    261: '바이오/제약', 286: '바이오/제약', 281: '바이오/제약',
    288: '바이오/제약', 316: '바이오/제약', 262: '바이오/제약',
    291: '조선', 284: '방산',
    313: '정유/에너지', 312: '유틸리티', 331: '유틸리티',
    268: '식품', 309: '식품', 275: '식품', 297: '소비재',
    266: '화장품', 274: '의류/패션', 303: '소비재', 298: '소비재',
    276: '지주', 299: '기계',
    323: '해운', 264: '유통', 328: '유통', 308: '유통',
    317: '레저/관광', 310: '미디어', 314: '미디어',
    271: '레저', 290: '교육', 318: '소재', 302: '유통',
    265: '유통', 332: '소비재', 339: '소비재', 334: '무역',
    324: '서비스',  25: '기타',
}

SECTOR_POPULARITY = {
    '인기': ['반도체', '방산', '조선', '에너지/전력', '바이오/제약', 'IT/플랫폼', '게임', '엔터', '디스플레이'],
    '비인기': ['건설', '유통', '화학', '유틸리티', '보험', '해운', '정유/에너지', '철강', '부동산'],
    '중립': ['금융', '자동차', '자동차부품', '통신', '통신장비', '전자/IT', 'IT서비스', '소프트웨어',
             '지주', '비철금속', '항공', '항공/물류', '운송', '화장품', '소비재', '식품',
             '의류/패션', '기계', '레저/관광', '레저', '미디어', '교육', '소재',
             '무역', '서비스', '기타'],
}

# ─── 중장기 10-Factor 저평가 모델 (1년+ 장기투자) ───
# [밸류에이션] F1 PER 12% · F2 PBR 11% · F3 배당 10%
# [안정성]     F4 시총 10% · F5 변동성 9% · F6 외인 9%
# [역발상]     F7 52주할인 12% · F8 섹터 9%
# [바닥전환]   F9 수급 9% · F10 기술적 9%
LONG_FACTOR_WEIGHTS = {
    'per_value':         0.12,
    'pbr_asset':         0.11,
    'dividend':          0.10,
    'market_cap':        0.10,
    'low_volatility':    0.09,
    'foreign_trust':     0.09,
    'discount_52w':      0.12,
    'sector_contrarian': 0.09,
    'bottom_supply':     0.09,
    'technical_bottom':  0.09,
}

LONG_FACTOR_LABELS = {
    'per_value':         'PER 밸류',
    'pbr_asset':         'PBR 자산가치',
    'dividend':          '배당 매력',
    'market_cap':        '시총 규모',
    'low_volatility':    '변동성 안정',
    'foreign_trust':     '외인 신뢰도',
    'discount_52w':      '52주 할인율',
    'sector_contrarian': '섹터 역발상',
    'bottom_supply':     '바닥 수급',
    'technical_bottom':  '기술적 바닥',
}

HEADERS = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'stock_cache.json')


def get_sector_from_industry_code(code):
    try:
        return INDUSTRY_TO_SECTOR.get(int(code), '기타')
    except (ValueError, TypeError):
        return '기타'


def get_sector_popularity(sector):
    for pop, sectors in SECTOR_POPULARITY.items():
        if sector in sectors:
            return pop
    return '중립'


# ───────────────────────────── Data Fetching ─────────────────────────────

def fetch_top200_kospi():
    """네이버 증권 API로 코스피 시가총액 TOP 200 조회"""
    all_stocks = []
    seen = set()
    for page in range(1, 4):
        url = f'https://m.stock.naver.com/api/stocks/marketValue/KOSPI?page={page}&pageSize=100'
        try:
            r = requests.get(url, headers=HEADERS, timeout=20)
            if r.status_code == 200:
                data = r.json()
                stocks = data.get('stocks', [])
                for s in stocks:
                    code = s.get('itemCode', '')
                    end_type = s.get('stockEndType', '')
                    is_stock = end_type == 'stock'
                    is_kospi = s.get('sosok') == '0'
                    not_preferred = not code.endswith('5') or code in ('005490',)
                    if is_stock and is_kospi and code not in seen and not_preferred:
                        seen.add(code)
                        all_stocks.append(s)
        except Exception:
            continue
        time.sleep(0.2)
    return all_stocks[:200]


def fetch_chart_data(ticker, days=80):
    """네이버 차트 API로 일봉 OHLCV 데이터 조회"""
    end_date = datetime.now().strftime('%Y%m%d')
    start_date = (datetime.now() - timedelta(days=days + 30)).strftime('%Y%m%d')
    url = f'https://api.stock.naver.com/chart/domestic/item/{ticker}/day?startDateTime={start_date}&endDateTime={end_date}'
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return []


def fetch_integration_data(ticker):
    """네이버 통합 API로 수급/52주 고저/업종 데이터 조회"""
    url = f'https://m.stock.naver.com/api/stock/{ticker}/integration'
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return {}


def fetch_stock_detail(ticker):
    """차트 + 통합 데이터 병합 조회"""
    chart = fetch_chart_data(ticker)
    time.sleep(0.05)
    integration = fetch_integration_data(ticker)
    return ticker, chart, integration


# ───────────────────────────── Technical Indicators ─────────────────────────────

def calc_rsi(closes, period=14):
    delta = np.diff(closes)
    gain = np.where(delta > 0, delta, 0.0)
    loss = np.where(delta < 0, -delta, 0.0)
    avg_gain = pd.Series(gain).rolling(period).mean().values
    avg_loss = pd.Series(loss).rolling(period).mean().values
    with np.errstate(divide='ignore', invalid='ignore'):
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
    return rsi


def calc_macd(closes, fast=12, slow=26, signal=9):
    s = pd.Series(closes)
    ema_fast = s.ewm(span=fast, adjust=False).mean()
    ema_slow = s.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return macd_line.values, signal_line.values, histogram.values


def calc_bollinger(closes, period=20, mult=2):
    s = pd.Series(closes)
    sma = s.rolling(period).mean()
    std = s.rolling(period).std()
    upper = sma + mult * std
    lower = sma - mult * std
    return upper.values, sma.values, lower.values


def calc_volatility(closes, period=20):
    if len(closes) < period + 1:
        return 0.3
    returns = np.diff(closes[-period - 1:]) / closes[-period - 1:-1]
    return float(np.std(returns) * np.sqrt(252))


# ───────────────────────── 10-Factor Scoring (단기) ─────────────────────────

def _clamp(score):
    return max(1.0, min(10.0, round(score, 1)))


def sf_ma_alignment(closes):
    if len(closes) < 60: return 5.0
    s = 5.0
    c, ma5, ma20, ma60 = closes[-1], np.mean(closes[-5:]), np.mean(closes[-20:]), np.mean(closes[-60:])
    if c > ma5 > ma20 > ma60: s += 3.0
    elif ma5 > ma20 > ma60: s += 2.0
    elif ma5 > ma20: s += 1.0
    elif ma60 > ma20 > ma5: s -= 2.0
    gap = (c - ma20) / ma20
    if 0 < gap < 0.05: s += 1.0
    elif gap > 0.10: s -= 1.0
    elif gap < -0.05: s -= 0.5
    return _clamp(s)


def sf_rsi_momentum(closes):
    rsi = calc_rsi(closes)
    if len(rsi) < 5: return 5.0
    s = 5.0
    cr = rsi[-1] if not np.isnan(rsi[-1]) else 50
    pr = rsi[-5] if not np.isnan(rsi[-5]) else 50
    if 50 <= cr <= 65: s += 2.0
    elif 40 <= cr < 50: s += 0.5
    elif cr > 70: s -= 1.0
    elif cr < 30: s -= 1.0
    if cr > pr + 5: s += 1.5
    elif cr < pr - 5: s -= 1.0
    return _clamp(s)


def sf_macd_signal(closes):
    _, _, hist = calc_macd(closes)
    valid = [h for h in hist[-10:] if not np.isnan(h)]
    if len(valid) < 2: return 5.0
    s, mh, mp = 5.0, valid[-1], valid[-2]
    if mp < 0 and mh > 0: s += 3.0
    elif mh > 0 and mh > mp: s += 2.0
    elif mh > 0: s += 1.0
    elif mh < 0 and mh > mp: s += 0.5
    elif mh < 0 and mh < mp: s -= 2.0
    return _clamp(s)


def sf_bollinger(closes):
    if len(closes) < 20: return 5.0
    upper, mid, lower = calc_bollinger(closes)
    u, m, l = upper[-1], mid[-1], lower[-1]
    if np.isnan(u) or np.isnan(l) or m == 0: return 5.0
    s = 5.0
    bw = (u - l) / m
    pos = (closes[-1] - l) / (u - l) if (u - l) > 0 else 0.5
    if bw < 0.08: s += 2.0
    elif bw < 0.12: s += 1.0
    if 0.5 < pos < 0.85: s += 1.5
    elif pos >= 0.85: s += 0.5
    elif pos < 0.2: s -= 1.0
    if closes[-1] > u: s += 1.0
    return _clamp(s)


def sf_breakout(closes, high52, low52):
    if len(closes) < 20: return 5.0
    s, c = 5.0, closes[-1]
    h20 = max(closes[-20:])
    h60 = max(closes[-60:]) if len(closes) >= 60 else h20
    if c >= h20 * 0.98: s += 2.5
    if c >= h60 * 0.98: s += 1.5
    if high52 and c >= high52 * 0.95: s += 1.5
    elif high52 and c >= high52 * 0.90: s += 0.5
    if low52 and high52 and high52 > low52:
        pos = (c - low52) / (high52 - low52)
        if pos > 0.7: s += 0.5
        elif pos < 0.3: s -= 1.5
    return _clamp(s)


def sf_volume_energy(closes, volumes):
    if len(volumes) < 20: return 5.0
    s = 5.0
    avg_vol = np.mean(volumes[-20:])
    recent = np.mean(volumes[-3:])
    ratio = recent / avg_vol if avg_vol > 0 else 1
    if ratio > 3.0: s += 2.5
    elif ratio > 2.0: s += 2.0
    elif ratio > 1.5: s += 1.0
    elif ratio < 0.5: s -= 1.0
    up_v, dn_v = 0, 0
    for i in range(-min(10, len(closes)), 0):
        if closes[i] > closes[i - 1]: up_v += volumes[i]
        else: dn_v += volumes[i]
    if up_v + dn_v > 0:
        ur = up_v / (up_v + dn_v)
        if ur > 0.65: s += 1.5
        elif ur > 0.55: s += 0.5
        elif ur < 0.35: s -= 1.5
    return _clamp(s)


def sf_obv_trend(closes, volumes):
    if len(closes) < 20: return 5.0
    s = 5.0
    obv = [0]
    for i in range(1, len(closes)):
        if closes[i] > closes[i - 1]: obv.append(obv[-1] + volumes[i])
        elif closes[i] < closes[i - 1]: obv.append(obv[-1] - volumes[i])
        else: obv.append(obv[-1])
    arr = np.array(obv)
    if len(arr) >= 20:
        ma = np.mean(arr[-20:])
        if arr[-1] > ma * 1.05: s += 2.0
        elif arr[-1] > ma: s += 1.0
        elif arr[-1] < ma * 0.95: s -= 1.5
    if len(closes) >= 10:
        p_up = closes[-1] > closes[-10]
        o_up = arr[-1] > arr[-10]
        if p_up and not o_up: s -= 1.0
        elif not p_up and o_up: s += 1.5
    return _clamp(s)


def sf_candle_pattern(closes):
    if len(closes) < 10: return 5.0
    s = 5.0
    up_days = sum(1 for i in range(-5, 0) if closes[i] > closes[i - 1])
    if up_days >= 4: s += 2.0
    elif up_days >= 3: s += 1.0
    elif up_days <= 1: s -= 1.5
    ret5 = (closes[-1] - closes[-5]) / closes[-5] * 100
    if ret5 > 5: s += 1.5
    elif ret5 > 2: s += 0.5
    elif ret5 < -5: s -= 1.5
    elif ret5 < -2: s -= 0.5
    for i in range(-3, 0):
        if (closes[i] - closes[i - 1]) / closes[i - 1] * 100 > 4:
            s += 1.0
            break
    return _clamp(s)


def sf_supply_demand(deal_trends):
    if not deal_trends: return 5.0
    s, fb, ib, consec = 5.0, 0, 0, 0
    for item in deal_trends[:5]:
        try:
            fq = int(item.get('foreignerPureBuyQuant', '0').replace(',', '').replace('+', ''))
            oq = int(item.get('organPureBuyQuant', '0').replace(',', '').replace('+', ''))
            fb += fq; ib += oq
            if fq > 0 and oq > 0: consec += 1
        except: continue
    if consec >= 3: s += 2.5
    elif consec >= 2: s += 1.5
    if fb > 500_000: s += 1.0
    elif fb < -500_000: s -= 1.0
    if ib > 0 and fb > 0: s += 0.5
    return _clamp(s)


def sf_sector_momentum(sector, sector_returns):
    ret = sector_returns.get(sector, 0)
    s = 5.0
    if ret > 3: s += 2.0
    elif ret > 1: s += 1.0
    elif ret < -3: s -= 2.0
    elif ret < -1: s -= 1.0
    pop = get_sector_popularity(sector)
    if pop == '인기': s += 1.0
    elif pop == '비인기': s -= 0.5
    return _clamp(s)


# ─────────── (Legacy — 하위호환용 유지, 단기 모델은 sf_* 사용) ───────────

def score_technical_momentum(closes):
    """
    F1: 기술적 모멘텀 (40%) — 3개월 추세 방향성과 강도
    ─────────────────────────────────────────────────────
    ■ RSI 구간별 중기 추세 판단
      - 50~65: +2.5  건강한 상승 추세 (과열 없이 오르는 구간)
      - 40~50: +1.5  상승 전환 초입 (에너지 축적 후 출발)
      - 65~75: +1.0  강한 상승 중 (단기 과열 주의)
      - 30~40: +0.0  하락 추세 바닥권 (중기엔 방향 불확실)
      - < 30:  -1.0  중기 하락 추세 중 (바닥 찾기가 길어짐)
      - > 75:  -1.5  중기 과매수 / 고점 신호
    ■ MACD 히스토그램 — 중기 모멘텀 전환 감지
      - 음→양 전환(골든크로스) + 3일 연속 확대: +3.0  가장 강력한 중기 매수 신호
      - 음→양 전환(골든크로스):                 +2.0  추세 전환 확인
      - 양수 유지 + 확대 중:                    +1.5  추세 지속
      - 양수 유지 (유지 중):                    +0.5  약한 추세
      - 음수 + 축소 중 (바닥 다지기):           +0.3  반전 가능성
      - 음수 + 확대 중 (강한 하락):             -2.0  하락 모멘텀 강함
    ■ 이동평균선 배열 — 5 · 20 · 60일 기준
      - 현재가 > MA5 > MA20 > MA60 (완전 정배열): +2.5  3개월 추세 완벽
      - 현재가 > MA20 > MA60 (부분 정배열):       +1.5  중기 추세 양호
      - 현재가 > MA60 (장기선 위):               +0.5  장기 지지 유효
      - 현재가 < MA20 < MA60 (완전 역배열):      -2.0  중기 하락 추세
    """
    if len(closes) < 60:
        return 5.0

    rsi = calc_rsi(closes)
    current_rsi = rsi[-1] if not np.isnan(rsi[-1]) else 50

    _, _, histogram = calc_macd(closes)
    valid_hist = [h for h in histogram[-5:] if not np.isnan(h)]
    macd_hist = valid_hist[-1] if valid_hist else 0
    macd_hist_prev = valid_hist[-2] if len(valid_hist) >= 2 else 0
    macd_hist_2 = valid_hist[-3] if len(valid_hist) >= 3 else macd_hist_prev
    macd_3d_expanding = (macd_hist > macd_hist_prev > macd_hist_2)
    macd_crossed_zero = (macd_hist_prev <= 0 < macd_hist)  # 음→양 골든크로스

    ma5  = np.mean(closes[-5:])
    ma20 = np.mean(closes[-20:])
    ma60 = np.mean(closes[-60:])
    current = closes[-1]

    score = 5.0

    # ── RSI ──
    if 50 <= current_rsi <= 65:
        score += 2.5
    elif 40 <= current_rsi < 50:
        score += 1.5
    elif 65 < current_rsi <= 75:
        score += 1.0
    elif current_rsi < 30:
        score -= 1.0
    elif current_rsi > 75:
        score -= 1.5

    # ── MACD ──
    if macd_crossed_zero and macd_3d_expanding:
        score += 3.0
    elif macd_crossed_zero:
        score += 2.0
    elif macd_hist > 0 and macd_hist > macd_hist_prev:
        score += 1.5
    elif macd_hist > 0:
        score += 0.5
    elif macd_hist < 0 and abs(macd_hist) < abs(macd_hist_prev):
        score += 0.3
    elif macd_hist < 0 and abs(macd_hist) > abs(macd_hist_prev):
        score -= 2.0

    # ── 이동평균선 배열 ──
    if current > ma5 > ma20 > ma60:
        score += 2.5
    elif current > ma20 > ma60:
        score += 1.5
    elif current > ma60:
        score += 0.5
    elif current < ma20 < ma60:
        score -= 2.0

    return max(1.0, min(10.0, round(score, 1)))


def score_volume_signal(closes, volumes):
    """
    F2: 거래량 신호 (20%) — 돌파의 신뢰도 확인 + OBV 개념
    ─────────────────────────────────────────────────────────
    ■ OBV 방향성 (On-Balance Volume): 상승일 vs 하락일 거래량 비율
      - 최근 15일 상승일 평균 거래량이 하락일 2배 이상: +3.0  진성 매수세 유입
      - 최근 15일 상승일 > 하락일 거래량:               +1.5  매수 우위
      - 하락일 > 상승일 거래량:                         -1.5  매도 압력
    ■ 거래량 추세 (5일 vs 20일 비율)
      - 5일 평균 거래량 1.5배+ 증가 + 가격 상승:  +2.0  추세 강화 신호
      - 5일 평균 거래량 1.2배+ 증가 + 가격 상승:  +1.0
      - 거래량 급감 (50% 미만): -1.0              관심 없는 종목
    ■ 당일 폭발 거래량 (돌파 확인)
      - 당일 거래량이 20일 평균 3배+ 이상 + 상승:  +2.5  돌파 거래량
      - 당일 거래량이 20일 평균 2배+ 이상 + 상승:  +1.0
    """
    if len(volumes) < 20:
        return 5.0

    vol_20 = np.mean(volumes[-20:])
    vol_5  = np.mean(volumes[-5:])
    vol_today = volumes[-1]
    vol_today_ratio = vol_today / vol_20 if vol_20 > 0 else 1
    vol_ratio_5 = vol_5 / vol_20 if vol_20 > 0 else 1

    n = min(len(closes), len(volumes), 15)
    up_vols, dn_vols = [], []
    for i in range(1, n):
        if closes[-i] >= closes[-i - 1]:
            up_vols.append(volumes[-i])
        else:
            dn_vols.append(volumes[-i])
    avg_up = np.mean(up_vols) if up_vols else 0
    avg_dn = np.mean(dn_vols) if dn_vols else 1

    price_change_5d = (closes[-1] - closes[-6]) / closes[-6] * 100 if len(closes) >= 6 else 0
    price_change_1d = (closes[-1] - closes[-2]) / closes[-2] * 100 if len(closes) >= 2 else 0

    score = 5.0

    # ── OBV 방향성 ──
    obv_ratio = avg_up / avg_dn if avg_dn > 0 else 1
    if obv_ratio >= 2.0:
        score += 3.0
    elif obv_ratio >= 1.2:
        score += 1.5
    elif obv_ratio < 0.8:
        score -= 1.5

    # ── 거래량 추세 ──
    if vol_ratio_5 >= 1.5 and price_change_5d > 0:
        score += 2.0
    elif vol_ratio_5 >= 1.2 and price_change_5d > 0:
        score += 1.0
    elif vol_ratio_5 < 0.5:
        score -= 1.0

    # ── 당일 폭발 거래량 ──
    if vol_today_ratio >= 3.0 and price_change_1d > 0:
        score += 2.5
    elif vol_today_ratio >= 2.0 and price_change_1d > 0:
        score += 1.0
    elif vol_today_ratio >= 2.0 and price_change_1d < -3:
        score -= 1.5

    return max(1.0, min(10.0, round(score, 1)))


def score_supply_demand(deal_trends):
    """
    F3: 수급 동향 (10%) — 외국인·기관 누적 스마트머니
    ────────────────────────────────────────────────────
    ■ 외국인 + 기관 동반 순매수: 가장 강력한 중기 수급 신호
    ■ 5거래일 누적 방향성으로 중기 수급 트렌드 판단
    """
    if not deal_trends:
        return 5.0

    score = 5.0
    foreign_total = 0
    inst_total = 0
    days_count = min(len(deal_trends), 5)
    both_buy_days = 0

    for item in deal_trends[:days_count]:
        try:
            fq = int(item.get('foreignerPureBuyQuant', '0').replace(',', '').replace('+', ''))
            oq = int(item.get('organPureBuyQuant', '0').replace(',', '').replace('+', ''))
            foreign_total += fq
            inst_total += oq
            if fq > 0 and oq > 0:
                both_buy_days += 1
        except (ValueError, AttributeError):
            continue

    # 외국인/기관 동반 순매수 연속성
    if both_buy_days >= 4:
        score += 3.0
    elif both_buy_days >= 2:
        score += 1.5
    elif both_buy_days >= 1:
        score += 0.5

    # 외국인 누적
    if foreign_total > 500_000:
        score += 1.5
    elif foreign_total > 100_000:
        score += 0.7
    elif foreign_total < -500_000:
        score -= 1.5
    elif foreign_total < -100_000:
        score -= 0.7

    # 기관 누적
    if inst_total > 500_000:
        score += 1.0
    elif inst_total > 100_000:
        score += 0.5
    elif inst_total < -500_000:
        score -= 1.0
    elif inst_total < -100_000:
        score -= 0.5

    return max(1.0, min(10.0, round(score, 1)))


def score_sector_momentum(sector, sector_returns):
    """
    F4: 섹터 모멘텀 (5%) — 시장 분위기 보조 지표
    ──────────────────────────────────────────────
    3개월은 종목 개별 모멘텀 알파가 섹터 테마 영향보다 크므로 최소화.
    섹터 인기도 + 최근 수익률 방향만 참고.
    """
    score = 5.0
    popularity = get_sector_popularity(sector)

    if popularity == '인기':
        score += 1.5
    elif popularity == '비인기':
        score -= 1.0

    if sector in sector_returns:
        ret = sector_returns[sector]
        if ret > 5:
            score += 2.0
        elif ret > 2:
            score += 1.0
        elif ret > 0:
            score += 0.3
        elif ret < -5:
            score -= 2.0
        elif ret < -2:
            score -= 1.0

    return max(1.0, min(10.0, round(score, 1)))


def score_price_position(closes, high52=None, low52=None):
    """
    F5: 가격 패턴 (25%) — 3개월 급등 트리거 포착
    ──────────────────────────────────────────────────────────────
    ■ 볼린저 밴드 스퀴즈 (Squeeze): 밴드 수축 → 폭발적 움직임 예고
      - 현재 밴드폭이 최근 20거래일 밴드폭 최저 70% 이내: +3.0  극도 압축, 폭발 임박
      - 현재 밴드폭이 최근 20거래일 밴드폭 평균 80% 이내:  +1.5  스퀴즈 진행 중
    ■ 박스권 돌파 (Breakout): 가장 신뢰도 높은 3개월 급등 신호
      - 현재가 > 최근 20일 최고가 (신고점 돌파):           +3.5  매우 강력!
      - 현재가 > 최근 10일 최고가 (단기 박스 돌파):        +1.5
      - 현재가가 최근 20일 고점의 95% 이상 (돌파 직전):    +1.0
    ■ 52주 위치 — 중기 모멘텀 확인
      - 52주 신고가 90% 이상 (모멘텀 가속 구간):          +2.5  추세 가속
      - 52주 고점 70~90% (중상단, 양호):                  +1.0
      - 52주 저점 30% 이하 (중기 하락 추세 중):           -1.5
    ■ MA20/MA60 지지 반등 (눌림목 매수 기회)
      - 현재가가 MA20 근처 ±2% + RSI 50 이상:             +1.5  눌림 후 재상승
      - 현재가가 MA60 근처 ±2% + 반등 신호:              +1.0  중기 지지
    """
    if len(closes) < 20:
        return 5.0

    upper, mid, lower = calc_bollinger(closes)
    current = closes[-1]
    bb_upper = upper[-1]
    bb_lower = lower[-1]
    bb_width = bb_upper - bb_lower

    score = 5.0

    # ── 볼린저 밴드 스퀴즈 감지 ──
    if not np.isnan(bb_width) and bb_width > 0:
        # 최근 20거래일 밴드폭 히스토리
        recent_widths = [(upper[i] - lower[i]) for i in range(-20, 0)
                         if not np.isnan(upper[i]) and not np.isnan(lower[i])
                         and (upper[i] - lower[i]) > 0]
        if recent_widths:
            min_width = min(recent_widths)
            avg_width = np.mean(recent_widths)
            # 극도 수축: 현재 밴드폭이 최근 20일 최솟값의 1.1배 이하
            if bb_width <= min_width * 1.1:
                score += 3.0
            elif bb_width <= avg_width * 0.8:
                score += 1.5

    # ── 박스권 돌파 ──
    if len(closes) >= 20:
        high_20d = np.max(closes[-21:-1])  # 오늘 제외 최근 20일 고점
        if current > high_20d:
            score += 3.5
        elif len(closes) >= 10:
            high_10d = np.max(closes[-11:-1])
            if current > high_10d:
                score += 1.5
            elif current >= high_20d * 0.95:
                score += 1.0

    # ── 52주 위치 ──
    if high52 and low52 and high52 > low52:
        range52 = high52 - low52
        pos52 = (current - low52) / range52
        if pos52 >= 0.9:
            score += 2.5
        elif pos52 >= 0.7:
            score += 1.0
        elif pos52 <= 0.3:
            score -= 1.5

    # ── MA 지지 반등 (눌림목) ──
    if len(closes) >= 60:
        ma20 = np.mean(closes[-20:])
        ma60 = np.mean(closes[-60:])
        # MA20 ±2% 지지 반등 (오늘 상승 + 어제 MA20 근처)
        prev_close = closes[-2] if len(closes) >= 2 else current
        near_ma20 = abs(prev_close - ma20) / ma20 < 0.02
        near_ma60 = abs(prev_close - ma60) / ma60 < 0.02
        price_up_today = current > prev_close
        if near_ma20 and price_up_today:
            score += 1.5
        elif near_ma60 and price_up_today:
            score += 1.0

    return max(1.0, min(10.0, round(score, 1)))


# ──────────────────── Long-Term 10-Factor Scoring ────────────────────

def lf_per_value(per, pos52):
    s = 5.0
    if per and per > 0:
        if per < 8: s += 3.0
        elif per < 12: s += 2.0
        elif per < 15: s += 0.5
        elif per > 30: s -= 2.5
        elif per > 20: s -= 1.0
    elif pos52 is not None:
        if pos52 < 0.3: s += 2.0
        elif pos52 < 0.5: s += 1.0
        elif pos52 > 0.8: s -= 1.5
    return _clamp(s)


def lf_pbr_asset(pbr):
    s = 5.0
    if pbr and pbr > 0:
        if pbr < 0.7: s += 3.5
        elif pbr < 1.0: s += 2.0
        elif pbr < 1.5: s += 0.5
        elif pbr > 3.0: s -= 2.0
        elif pbr > 2.0: s -= 1.0
    return _clamp(s)


def lf_dividend(dividend_yield):
    s = 5.0
    if dividend_yield and dividend_yield > 0:
        if dividend_yield > 6: s += 3.5
        elif dividend_yield > 4: s += 2.5
        elif dividend_yield > 2.5: s += 1.5
        elif dividend_yield > 1.5: s += 0.5
    return _clamp(s)


def lf_market_cap(market_cap_num):
    s = 5.0
    if market_cap_num > 500_000: s += 3.0
    elif market_cap_num > 100_000: s += 1.5
    elif market_cap_num > 50_000: s += 0.5
    elif market_cap_num < 10_000: s -= 1.5
    return _clamp(s)


def lf_low_volatility(volatility):
    s = 5.0
    if volatility < 0.20: s += 3.0
    elif volatility < 0.30: s += 2.0
    elif volatility < 0.40: s += 0.5
    elif volatility > 0.60: s -= 2.0
    elif volatility > 0.50: s -= 1.0
    return _clamp(s)


def lf_foreign_trust(foreign_rate_str):
    fr = parse_number(foreign_rate_str) if foreign_rate_str else 0
    s = 5.0
    if fr > 40: s += 3.0
    elif fr > 25: s += 2.0
    elif fr > 15: s += 1.0
    elif fr > 5: s += 0.5
    elif fr < 2: s -= 1.0
    return _clamp(s)


def lf_52w_discount(closes, high52, low52):
    s = 5.0
    if high52 and low52 and high52 > low52:
        pos = (closes[-1] - low52) / (high52 - low52)
        if pos < 0.25: s += 3.5
        elif pos < 0.40: s += 2.0
        elif pos < 0.55: s += 0.5
        elif pos > 0.85: s -= 2.5
        elif pos > 0.70: s -= 1.0
    return _clamp(s)


def lf_sector_contrarian(popularity):
    s = 5.0
    if popularity == '비인기': s += 3.0
    elif popularity == '중립': s += 0.5
    elif popularity == '인기': s -= 1.5
    return _clamp(s)


def lf_bottom_supply(deal_trends):
    if not deal_trends: return 5.0
    s, ft, it = 5.0, 0, 0
    for item in deal_trends[:5]:
        try:
            fq = int(item.get('foreignerPureBuyQuant', '0').replace(',', '').replace('+', ''))
            oq = int(item.get('organPureBuyQuant', '0').replace(',', '').replace('+', ''))
            ft += fq; it += oq
        except: continue
    if ft > 100_000 and it > 0: s += 2.5
    elif ft > 0 and it > 0: s += 1.5
    elif ft > 100_000: s += 1.0
    elif ft < -500_000: s -= 1.5
    return _clamp(s)


def lf_technical_bottom(closes):
    if len(closes) < 60: return 5.0
    s = 5.0
    rsi = calc_rsi(closes)
    cr = rsi[-1] if not np.isnan(rsi[-1]) else 50
    _, _, hist = calc_macd(closes)
    ma60 = np.mean(closes[-60:])
    if 35 <= cr <= 50: s += 2.0
    elif cr < 30: s += 1.5
    elif cr > 65: s -= 1.0
    vh = [h for h in hist[-5:] if not np.isnan(h)]
    if len(vh) >= 2:
        if vh[-2] < 0 and vh[-1] > vh[-2]: s += 2.0
        elif vh[-1] < 0 and abs(vh[-1]) > abs(vh[-2]): s -= 1.0
    d = (closes[-1] - ma60) / ma60
    if -0.05 < d < 0.05: s += 1.5
    elif d < -0.10: s -= 1.0
    return _clamp(s)


# ───────────────────────────── Main Analysis ─────────────────────────────

def format_market_cap(cap_str):
    try:
        val = int(cap_str.replace(',', ''))
        if val >= 1_000_000:
            return f"{val / 1_000_000:.1f}조"
        elif val >= 1_000:
            return f"{val / 1_000:.1f}조"
        return f"{val}억"
    except Exception:
        return cap_str


def parse_number(s):
    if not s:
        return 0
    try:
        return float(str(s).replace(',', '').replace('+', ''))
    except (ValueError, TypeError):
        return 0


def analyze_all_stocks(progress_callback=None):
    """KOSPI TOP 200 전체 분석 실행"""

    if progress_callback:
        progress_callback("코스피 시가총액 TOP 200 종목 조회 중...")

    top200_raw = fetch_top200_kospi()
    if not top200_raw:
        raise Exception("종목 리스트를 가져올 수 없습니다. 네트워크를 확인해주세요.")

    tickers = [s['itemCode'] for s in top200_raw]
    stock_info = {s['itemCode']: s for s in top200_raw}

    if progress_callback:
        progress_callback(f"{len(tickers)}개 종목 상세 데이터 수집 중 (약 1~2분 소요)...")

    detail_data = {}
    completed = 0

    def fetch_and_store(ticker):
        nonlocal completed
        result = fetch_stock_detail(ticker)
        completed += 1
        return result

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(fetch_and_store, t): t for t in tickers}
        for future in as_completed(futures):
            try:
                ticker, chart, integration = future.result()
                detail_data[ticker] = {'chart': chart, 'integration': integration}
            except Exception:
                continue
            if progress_callback and completed % 30 == 0:
                progress_callback(f"데이터 수집 진행: {completed}/{len(tickers)}...")

    if progress_callback:
        progress_callback("스코어 계산 중...")

    sector_returns_raw = {}
    results = []

    for ticker in tickers:
        try:
            info = stock_info.get(ticker, {})
            detail = detail_data.get(ticker, {})
            chart = detail.get('chart', [])
            integration = detail.get('integration', {})

            if not chart or len(chart) < 15:
                continue

            name = info.get('stockName', '')
            industry_code = integration.get('industryCode')
            sector = get_sector_from_industry_code(industry_code) if industry_code else '기타'
            market_cap_str = info.get('marketValue', '0')
            market_cap_display = info.get('marketValueHangeul', format_market_cap(market_cap_str))

            closes = np.array([c['closePrice'] for c in chart], dtype=float)
            volumes = np.array([c.get('accumulatedTradingVolume', 0) for c in chart], dtype=float)

            last_close = closes[-1]
            prev_close = closes[-2] if len(closes) >= 2 else last_close
            change_pct = round((last_close - prev_close) / prev_close * 100, 2) if prev_close > 0 else 0

            if len(closes) >= 6:
                ret_5d = (closes[-1] - closes[-6]) / closes[-6] * 100
                if sector not in sector_returns_raw:
                    sector_returns_raw[sector] = []
                sector_returns_raw[sector].append(ret_5d)

            deal_trends = integration.get('dealTrendInfos', [])

            total_infos = integration.get('totalInfos', [])
            high52 = low52 = per = pbr = dividend_yield = None
            foreign_rate = None
            for ti in total_infos:
                code = ti.get('code', '')
                if code == 'highPriceOf52Weeks':
                    high52 = parse_number(ti.get('value'))
                elif code == 'lowPriceOf52Weeks':
                    low52 = parse_number(ti.get('value'))
                elif code == 'foreignRate':
                    foreign_rate = ti.get('value', '')
                elif code in ('per', 'PER', 'starPer'):
                    per = parse_number(ti.get('value'))
                elif code in ('pbr', 'PBR', 'starPbr'):
                    pbr = parse_number(ti.get('value'))
                elif code in ('dividendYield', 'dividendRate'):
                    dividend_yield = parse_number(ti.get('value'))

            per = per or parse_number(info.get('per', ''))
            pbr = pbr or parse_number(info.get('pbr', ''))

            results.append({
                'ticker': ticker,
                'name': name,
                'sector': sector,
                'closes': closes,
                'volumes': volumes,
                'deal_trends': deal_trends,
                'market_cap_str': market_cap_display,
                'market_cap_num': parse_number(market_cap_str),
                'last_close': int(last_close),
                'change_pct': change_pct,
                'high52': high52,
                'low52': low52,
                'foreign_rate': foreign_rate,
                'per': per, 'pbr': pbr, 'dividend_yield': dividend_yield,
                'today_volume': int(parse_number(info.get('accumulatedTradingVolume', '0'))),
            })

        except Exception:
            continue

    sector_returns = {s: round(np.mean(r), 2) for s, r in sector_returns_raw.items() if r}

    if progress_callback:
        progress_callback("최종 스코어링 및 랭킹 산출 중...")

    scored_short = []
    scored_long = []

    for item in results:
        try:
            pop = get_sector_popularity(item['sector'])
            vol = calc_volatility(item['closes'])
            pos52 = None
            if item['high52'] and item['low52'] and item['high52'] > item['low52']:
                pos52 = (item['closes'][-1] - item['low52']) / (item['high52'] - item['low52'])

            base = {
                'ticker': item['ticker'], 'name': item['name'],
                'sector': item['sector'], 'popularity': pop,
                'market_cap_str': item['market_cap_str'],
                'market_cap_num': item['market_cap_num'],
                'last_close': item['last_close'], 'change_pct': item['change_pct'],
                'foreign_rate': item['foreign_rate'],
                'high52': item['high52'], 'low52': item['low52'],
            }

            # ── 단기 10-Factor 모델 ──
            cl, vl = item['closes'], item['volumes']
            sf = [
                sf_ma_alignment(cl),
                sf_rsi_momentum(cl),
                sf_macd_signal(cl),
                sf_bollinger(cl),
                sf_breakout(cl, item['high52'], item['low52']),
                sf_volume_energy(cl, vl),
                sf_obv_trend(cl, vl),
                sf_candle_pattern(cl),
                sf_supply_demand(item['deal_trends']),
                sf_sector_momentum(item['sector'], sector_returns),
            ]
            wk = list(FACTOR_WEIGHTS.keys())
            total_s = sum(sf[i] * FACTOR_WEIGHTS[wk[i]] for i in range(10))
            if vol > 0.80: total_s *= 0.93
            elif vol > 0.60: total_s *= 0.97
            scored_short.append({**base,
                'sf1_ma': sf[0], 'sf2_rsi': sf[1], 'sf3_macd': sf[2],
                'sf4_bb': sf[3], 'sf5_brk': sf[4], 'sf6_vol': sf[5],
                'sf7_obv': sf[6], 'sf8_cdl': sf[7], 'sf9_sup': sf[8],
                'sf10_sec': sf[9],
                'total_score': round(total_s, 2), 'volatility': round(vol, 2),
            })

            # ── 중장기 10-Factor 모델 ──
            lf = [
                lf_per_value(item['per'], pos52),
                lf_pbr_asset(item['pbr']),
                lf_dividend(item['dividend_yield']),
                lf_market_cap(item['market_cap_num']),
                lf_low_volatility(vol),
                lf_foreign_trust(item['foreign_rate']),
                lf_52w_discount(item['closes'], item['high52'], item['low52']),
                lf_sector_contrarian(pop),
                lf_bottom_supply(item['deal_trends']),
                lf_technical_bottom(item['closes']),
            ]
            lwk = list(LONG_FACTOR_WEIGHTS.keys())
            total_l = round(sum(lf[i] * LONG_FACTOR_WEIGHTS[lwk[i]] for i in range(10)), 2)
            scored_long.append({**base,
                'lf1_per': lf[0], 'lf2_pbr': lf[1], 'lf3_div': lf[2],
                'lf4_cap': lf[3], 'lf5_vol': lf[4], 'lf6_for': lf[5],
                'lf7_disc': lf[6], 'lf8_sec': lf[7], 'lf9_sup': lf[8],
                'lf10_bot': lf[9],
                'total_score': total_l,
                'per': item['per'], 'pbr': item['pbr'],
                'dividend_yield': item['dividend_yield'],
            })
        except Exception:
            continue

    def rank_and_summary(scored, sector_returns):
        scored.sort(key=lambda x: x['total_score'], reverse=True)
        for i, item in enumerate(scored):
            item['rank'] = i + 1
        summary = []
        for sec, ret in sorted(sector_returns.items(), key=lambda x: x[1], reverse=True):
            cnt = sum(1 for r in scored if r['sector'] == sec)
            avg = round(np.mean([r['total_score'] for r in scored if r['sector'] == sec]), 2) if cnt else 0
            summary.append({'sector': sec, 'popularity': get_sector_popularity(sec),
                            'return_5d': ret, 'count': cnt, 'avg_score': avg})
        return summary

    ss_short = rank_and_summary(scored_short, sector_returns)
    ss_long = rank_and_summary(scored_long, sector_returns)

    today = datetime.now()
    output = {
        'analysis_date': today.strftime('%Y-%m-%d'),
        'analysis_time': today.strftime('%Y-%m-%d %H:%M:%S'),
        'total_stocks': len(scored_short),
        'short': {
            'stocks': scored_short, 'sector_summary': ss_short,
            'factor_weights': FACTOR_WEIGHTS, 'factor_labels': FACTOR_LABELS,
        },
        'long': {
            'stocks': scored_long, 'sector_summary': ss_long,
            'factor_weights': LONG_FACTOR_WEIGHTS, 'factor_labels': LONG_FACTOR_LABELS,
        },
    }

    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    if progress_callback:
        progress_callback("분석 완료!")

    return output


def load_cached_data():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None


# ───────────────────────────── Analysis Commentary & Stop-Loss ─────────────────────────────

def generate_analysis(closes, volumes, stock_info):
    """10-Factor 분석 코멘트 + 투자 의견 + 매매 레벨"""
    c = closes[-1]
    comments = {}

    # ── F1 이평선 배열 ──
    if len(closes) >= 60:
        ma5, ma20, ma60 = np.mean(closes[-5:]), np.mean(closes[-20:]), np.mean(closes[-60:])
        gap = (c - ma20) / ma20 * 100
        if c > ma5 > ma20 > ma60:
            comments['f1'] = f'MA5>{">"}MA20>{">"}MA60 완전 정배열 · 이격도 {gap:+.1f}%'
        elif ma5 > ma20 > ma60:
            comments['f1'] = f'정배열 유지 · 이격도 {gap:+.1f}%'
        elif ma60 > ma20 > ma5:
            comments['f1'] = f'완전 역배열, 하락 추세 · 이격도 {gap:+.1f}%'
        else:
            comments['f1'] = f'이평선 혼조 · 이격도 {gap:+.1f}%'
    else:
        comments['f1'] = '데이터 부족'

    # ── F2 RSI ──
    rsi = calc_rsi(closes)
    cr = rsi[-1] if len(rsi) > 0 and not np.isnan(rsi[-1]) else 50
    pr = rsi[-5] if len(rsi) >= 5 and not np.isnan(rsi[-5]) else cr
    d = cr - pr
    tag = '건강한 상승' if 50 <= cr <= 65 else '과열 주의' if cr > 70 else '과매도 반등 기대' if cr < 30 else '전환 초입' if 40 <= cr < 50 else '중립'
    comments['f2'] = f'RSI {cr:.0f} ({tag}) · 5일 전 대비 {d:+.0f}pt'

    # ── F3 MACD ──
    _, _, hist = calc_macd(closes)
    vh = [h for h in hist[-10:] if not np.isnan(h)]
    if len(vh) >= 2:
        mh, mp = vh[-1], vh[-2]
        if mp < 0 and mh > 0: comments['f3'] = 'MACD 골든크로스 발생 — 강한 상승 전환'
        elif mh > 0 and mh > mp: comments['f3'] = 'MACD 양수 확대 — 모멘텀 강화'
        elif mh > 0: comments['f3'] = 'MACD 양수 유지'
        elif mh < 0 and mh > mp: comments['f3'] = 'MACD 음수 축소 — 하락세 둔화'
        else: comments['f3'] = 'MACD 음수 확대 — 하락 모멘텀'
    else:
        comments['f3'] = 'MACD 데이터 부족'

    # ── F4 볼린저 ──
    if len(closes) >= 20:
        upper, mid, lower = calc_bollinger(closes)
        u, m, l = upper[-1], mid[-1], lower[-1]
        if not np.isnan(u) and not np.isnan(l) and (u - l) > 0:
            bw = (u - l) / m * 100
            pos = (c - l) / (u - l) * 100
            sq = '극도 수축(폭발 임박)' if bw < 8 else '스퀴즈 진행' if bw < 12 else '정상'
            comments['f4'] = f'밴드폭 {bw:.1f}% {sq} · 밴드 내 {pos:.0f}% 위치'
        else:
            comments['f4'] = '볼린저 계산 불가'
    else:
        comments['f4'] = '데이터 부족'

    # ── F5 돌파 ──
    if len(closes) >= 20:
        h20 = max(closes[-20:])
        h52 = stock_info.get('high52')
        l52 = stock_info.get('low52')
        parts = []
        if c >= h20 * 0.98: parts.append('20일 고가 돌파/근접')
        if h52 and c >= h52 * 0.95: parts.append(f'52주 고점 {c/h52*100:.0f}% 도달')
        elif h52 and l52 and h52 > l52:
            pos = (c - l52) / (h52 - l52)
            parts.append(f'52주 범위 {pos*100:.0f}% 위치')
        comments['f5'] = ' · '.join(parts) if parts else '돌파 시그널 없음'
    else:
        comments['f5'] = '데이터 부족'

    # ── F6 거래량 ──
    if len(volumes) >= 20:
        avg20 = np.mean(volumes[-20:])
        r3 = np.mean(volumes[-3:]) / avg20 if avg20 > 0 else 1
        up_v, dn_v = 0, 0
        for i in range(-min(10, len(closes)), 0):
            if closes[i] > closes[i - 1]: up_v += volumes[i]
            else: dn_v += volumes[i]
        ur = up_v / (up_v + dn_v) * 100 if up_v + dn_v > 0 else 50
        comments['f6'] = f'3일 평균 거래량 {r3:.1f}배 · 상승일 비율 {ur:.0f}%'
    else:
        comments['f6'] = '거래량 데이터 부족'

    # ── F7 OBV ──
    obv = [0]
    for i in range(1, len(closes)):
        if closes[i] > closes[i - 1]: obv.append(obv[-1] + volumes[i])
        elif closes[i] < closes[i - 1]: obv.append(obv[-1] - volumes[i])
        else: obv.append(obv[-1])
    arr = np.array(obv)
    if len(arr) >= 20:
        above = arr[-1] > np.mean(arr[-20:])
        if len(closes) >= 10:
            p_up, o_up = closes[-1] > closes[-10], arr[-1] > arr[-10]
            if not p_up and o_up: comments['f7'] = 'OBV 상승 (가격↓) — 강세 다이버전스'
            elif p_up and not o_up: comments['f7'] = 'OBV 하락 (가격↑) — 약세 다이버전스'
            else: comments['f7'] = f'OBV {"상승" if above else "하락"} 추세'
        else:
            comments['f7'] = f'OBV {"MA 상회" if above else "MA 하회"}'
    else:
        comments['f7'] = 'OBV 데이터 부족'

    # ── F8 캔들 ──
    if len(closes) >= 10:
        up = sum(1 for i in range(-5, 0) if closes[i] > closes[i - 1])
        ret5 = (closes[-1] - closes[-5]) / closes[-5] * 100
        big = any((closes[i] - closes[i - 1]) / closes[i - 1] * 100 > 4 for i in range(-3, 0))
        comments['f8'] = f'최근 5일 {up}양{5-up}음 · 수익률 {ret5:+.1f}%' + (' · 장대양봉 출현' if big else '')
    else:
        comments['f8'] = '캔들 데이터 부족'

    # ── F9 수급 ──
    sf9 = stock_info.get('sf9_sup', 5)
    if sf9 >= 8: comments['f9'] = '외인+기관 동반 순매수 지속 — 강한 수급'
    elif sf9 >= 6: comments['f9'] = '외인 또는 기관 순매수 확인'
    elif sf9 <= 3: comments['f9'] = '외인/기관 매도 우위 — 수급 약세'
    else: comments['f9'] = '수급 중립'

    # ── F10 섹터 ──
    sector = stock_info.get('sector', '기타')
    pop = stock_info.get('popularity', '중립')
    comments['f10'] = f'{sector} — {"시장 관심 테마" if pop == "인기" else "시장 소외 구간" if pop == "비인기" else "중립적 관심도"}'

    # ── 투자 의견 ──
    total = stock_info.get('total_score', 5)
    vol = calc_volatility(closes)
    opinion = {}
    if total >= 7.5:
        opinion = {'grade': '적극 매수', 'color': '#00e676',
                   'text': '다수 기술적 지표가 강한 상승 시그널을 보이고 있습니다. 적극 진입을 고려하세요.'}
    elif total >= 6.5:
        opinion = {'grade': '매수 관심', 'color': '#66bb6a',
                   'text': '긍정적 시그널이 우세합니다. 눌림목 대기 매수가 유효합니다.'}
    elif total >= 5.5:
        opinion = {'grade': '관망', 'color': '#ffee58',
                   'text': '혼재된 시그널입니다. 추가 확인 후 진입을 검토하세요.'}
    elif total >= 4.5:
        opinion = {'grade': '주의', 'color': '#ffa726',
                   'text': '약세 시그널이 우세합니다. 신규 매수는 자제하세요.'}
    else:
        opinion = {'grade': '비중 축소', 'color': '#ef5350',
                   'text': '대부분 기술 지표가 하락을 시사합니다. 보유 시 비중 축소를 검토하세요.'}
    if vol > 0.60:
        opinion['text'] += f' (변동성 {vol*100:.0f}% — 고위험)'

    comments['summary'] = opinion['text']

    levels = _calculate_trading_levels(closes, stock_info)
    return {'comments': comments, 'levels': levels, 'opinion': opinion}


def generate_long_analysis(closes, volumes, stock_info):
    """중장기 10-Factor 분석 코멘트 + 투자 의견"""
    comments = {}
    c = closes[-1]
    per = stock_info.get('per')
    pbr = stock_info.get('pbr')
    div_y = stock_info.get('dividend_yield')
    h52, l52 = stock_info.get('high52'), stock_info.get('low52')

    # F1 PER
    if per and per > 0:
        tag = '깊은 저평가' if per < 8 else '저평가' if per < 12 else '적정' if per < 15 else '고평가 주의'
        comments['f1'] = f'PER {per:.1f} — {tag}'
    else:
        comments['f1'] = 'PER 데이터 없음 (52주 위치로 보완)'

    # F2 PBR
    if pbr and pbr > 0:
        tag = '순자산 대비 크게 할인' if pbr < 0.7 else '장부가 미만 할인' if pbr < 1.0 else '적정' if pbr < 1.5 else '프리미엄 구간'
        comments['f2'] = f'PBR {pbr:.1f} — {tag}'
    else:
        comments['f2'] = 'PBR 데이터 없음'

    # F3 배당
    if div_y and div_y > 0:
        tag = '매우 매력적' if div_y > 4 else '매력적' if div_y > 2.5 else '양호'
        comments['f3'] = f'배당수익률 {div_y:.1f}% — {tag}'
    else:
        comments['f3'] = '배당 데이터 없음 또는 무배당'

    # F4 시총
    cap = stock_info.get('market_cap_str', '')
    mcn = stock_info.get('market_cap_num', 0)
    tag = '초대형 (안정)' if mcn > 500_000 else '대형' if mcn > 100_000 else '중형' if mcn > 50_000 else '소형 (변동 주의)'
    comments['f4'] = f'시총 {cap} — {tag}'

    # F5 변동성
    vol = calc_volatility(closes)
    tag = '매우 안정' if vol < 0.20 else '안정' if vol < 0.30 else '보통' if vol < 0.40 else '높음 주의' if vol < 0.60 else '매우 높음'
    comments['f5'] = f'연율 변동성 {vol*100:.0f}% — {tag}'

    # F6 외인
    fr = parse_number(stock_info.get('foreign_rate', '')) or 0
    if fr > 25: comments['f6'] = f'외인 보유 {fr:.1f}% — 글로벌 기관 선호 종목'
    elif fr > 15: comments['f6'] = f'외인 보유 {fr:.1f}% — 양호한 외국인 관심'
    elif fr > 5: comments['f6'] = f'외인 보유 {fr:.1f}% — 보통'
    else: comments['f6'] = f'외인 보유 {fr:.1f}% — 관심 낮음'

    # F7 52주 할인
    if h52 and l52 and h52 > l52:
        pct_off = (h52 - c) / h52 * 100
        pos = (c - l52) / (h52 - l52)
        tag = '역발상 매수 구간' if pos < 0.30 else '저점 접근' if pos < 0.45 else '중간' if pos < 0.65 else '고점 근접'
        comments['f7'] = f'52주 고점 대비 {pct_off:.0f}% 할인 · {tag}'
    else:
        comments['f7'] = '52주 데이터 부족'

    # F8 섹터 역발상
    sector = stock_info.get('sector', '기타')
    pop = stock_info.get('popularity', '중립')
    if pop == '비인기': comments['f8'] = f'{sector} — 비인기 섹터, 역발상 프리미엄 기대'
    elif pop == '인기': comments['f8'] = f'{sector} — 인기 섹터, 이미 가격 반영 가능성'
    else: comments['f8'] = f'{sector} — 중립 섹터'

    # F9 수급
    lf9 = stock_info.get('lf9_sup', 5)
    if lf9 >= 7: comments['f9'] = '외인/기관 바닥권 매집 감지 — 스마트머니 유입'
    elif lf9 >= 5.5: comments['f9'] = '수급 중립, 전환 초기 가능성'
    else: comments['f9'] = '아직 본격적 매집 미확인'

    # F10 기술적 바닥
    rsi = calc_rsi(closes)
    cr = rsi[-1] if len(rsi) > 0 and not np.isnan(rsi[-1]) else 50
    parts = []
    if cr < 35: parts.append(f'RSI {cr:.0f} — 과매도, 바닥 반등 기대')
    elif cr < 50: parts.append(f'RSI {cr:.0f} — 바닥권 회복 중')
    elif cr > 65: parts.append(f'RSI {cr:.0f} — 이미 상승 진행')
    else: parts.append(f'RSI {cr:.0f} — 중립')
    if len(closes) >= 60:
        ma60 = np.mean(closes[-60:])
        d = (c - ma60) / ma60
        if -0.05 < d < 0.05: parts.append('MA60 부근 장기 지지선')
        elif d < -0.10: parts.append(f'MA60 대비 {d*100:.0f}% 아래')
    comments['f10'] = ' · '.join(parts) if parts else '-'

    # 투자 의견
    total = stock_info.get('total_score', 0)
    opinion = {}
    if total >= 7:
        opinion = {'grade': '장기 매수', 'color': '#00e676',
                   'text': '저평가 지표 다수 확인. 1년+ 관점 분할 매수 적기입니다.'}
    elif total >= 6:
        opinion = {'grade': '관심 종목', 'color': '#66bb6a',
                   'text': '저평가 매력이 있습니다. 추가 하락 시 분할 진입을 고려하세요.'}
    elif total >= 5:
        opinion = {'grade': '관망', 'color': '#ffee58',
                   'text': '저평가 매력이 아직 두드러지지 않습니다. 추가 확인이 필요합니다.'}
    else:
        opinion = {'grade': '보류', 'color': '#ffa726',
                   'text': '현재 장기투자 매력이 낮습니다. 다른 종목을 우선 검토하세요.'}
    comments['summary'] = opinion['text']

    levels = _calculate_trading_levels(closes, stock_info)
    return {'comments': comments, 'levels': levels, 'opinion': opinion}


def _calculate_trading_levels(closes, stock_info):
    """1차/2차 방어 + 1차/2차 매도 목표 — 기술적 지지·저항선 기반"""
    current = closes[-1]
    ma20 = np.mean(closes[-20:]) if len(closes) >= 20 else current * 0.97
    ma60 = np.mean(closes[-60:]) if len(closes) >= 60 else None

    bb_result = calc_bollinger(closes) if len(closes) >= 20 else (None, None, None)
    upper_bb, _, lower_bb = bb_result
    bb_lower = lower_bb[-1] if lower_bb is not None and not np.isnan(lower_bb[-1]) else None
    bb_upper = upper_bb[-1] if upper_bb is not None and not np.isnan(upper_bb[-1]) else None

    low_5d = float(np.min(closes[-5:])) if len(closes) >= 5 else current * 0.97

    # ── 1차 방어: 가장 가까운 지지선 ──
    cands_s1 = []
    if ma20 < current:
        cands_s1.append((f'MA20({int(ma20):,}원) 이탈 시', int(ma20)))
    if low_5d < current:
        cands_s1.append((f'최근 5일 저점({int(low_5d):,}원) 이탈 시', int(low_5d)))
    if cands_s1:
        cands_s1.sort(key=lambda x: x[1], reverse=True)
        s1_reason, s1_price = cands_s1[0]
    else:
        s1_price = int(current * 0.97)
        s1_reason = '현재가 대비 -3%'

    # ── 2차 방어: 더 강한 지지선 ──
    cands_s2 = []
    if ma60 and ma60 < s1_price:
        cands_s2.append((f'MA60({int(ma60):,}원) 이탈 시', int(ma60)))
    if bb_lower and bb_lower < s1_price:
        cands_s2.append((f'볼린저 하단({int(bb_lower):,}원) 이탈 시', int(bb_lower)))
    low_20d = float(np.min(closes[-20:])) if len(closes) >= 20 else current * 0.93
    if low_20d < s1_price:
        cands_s2.append((f'20일 저점({int(low_20d):,}원) 이탈 시', int(low_20d)))
    if cands_s2:
        cands_s2.sort(key=lambda x: x[1], reverse=True)
        s2_reason, s2_price = cands_s2[0]
    else:
        s2_price = int(current * 0.93)
        s2_reason = '현재가 대비 -7%'
    if s2_price >= s1_price:
        s2_price = int(s1_price * 0.95)
        s2_reason = '1차 방어 대비 추가 -5%'

    # ── 1차 매도 목표: 가장 가까운 저항선 ──
    high_20d = float(np.max(closes[-20:])) if len(closes) >= 20 else current * 1.05
    cands_t1 = []
    if bb_upper and bb_upper > current * 1.01:
        cands_t1.append((f'볼린저 상단({int(bb_upper):,}원) 도달 시', int(bb_upper)))
    if high_20d > current * 1.01:
        cands_t1.append((f'20일 고점({int(high_20d):,}원) 도달 시', int(high_20d)))
    if cands_t1:
        cands_t1.sort(key=lambda x: x[1])
        t1_reason, t1_price = cands_t1[0]
    else:
        t1_price = int(current * 1.05)
        t1_reason = '현재가 대비 +5%'

    # ── 2차 매도 목표: 더 높은 저항선 ──
    h52 = stock_info.get('high52')
    if h52 and h52 > t1_price * 1.02:
        t2_price = int(h52)
        t2_reason = f'52주 최고가({int(h52):,}원) 도달 시'
    else:
        t2_price = int(t1_price * 1.10)
        t2_reason = '1차 매도가 대비 +10%'
    if t2_price <= t1_price:
        t2_price = int(t1_price * 1.10)
        t2_reason = '1차 매도가 대비 +10%'

    return {
        'entry_price': int(current),
        'stop_1_price': s1_price,
        'stop_1_pct': round((s1_price - current) / current * 100, 1),
        'stop_1_reason': s1_reason,
        'stop_2_price': s2_price,
        'stop_2_pct': round((s2_price - current) / current * 100, 1),
        'stop_2_reason': s2_reason,
        'target_1_price': t1_price,
        'target_1_pct': round((t1_price - current) / current * 100, 1),
        'target_1_reason': t1_reason,
        'target_2_price': t2_price,
        'target_2_pct': round((t2_price - current) / current * 100, 1),
        'target_2_reason': t2_reason,
        'ma20': int(ma20),
        'ma60': int(ma60) if ma60 else None,
    }
