from flask import Flask, render_template, jsonify, request as flask_request
from stock_analyzer import (analyze_all_stocks, load_cached_data,
                            FACTOR_WEIGHTS, FACTOR_LABELS,
                            generate_analysis, generate_long_analysis)
import numpy as np
import threading
import requests
import time
from datetime import datetime, timedelta

app = Flask(__name__)

analysis_status = {
    'running': False,
    'progress': '대기 중',
    'complete': False,
    'error': None,
}


def progress_callback(message):
    analysis_status['progress'] = message


def run_analysis():
    analysis_status['running'] = True
    analysis_status['complete'] = False
    analysis_status['error'] = None
    analysis_status['progress'] = '분석 시작...'
    try:
        analyze_all_stocks(progress_callback=progress_callback)
        analysis_status['complete'] = True
        analysis_status['progress'] = '분석 완료!'
    except Exception as e:
        analysis_status['error'] = str(e)
        analysis_status['progress'] = f'오류 발생: {str(e)}'
    finally:
        analysis_status['running'] = False


@app.route('/')
def index():
    return render_template('index.html',
                           factor_weights=FACTOR_WEIGHTS,
                           factor_labels=FACTOR_LABELS)


@app.route('/api/analyze', methods=['POST'])
def start_analysis():
    if analysis_status['running']:
        return jsonify({'status': 'already_running', 'progress': analysis_status['progress']})
    thread = threading.Thread(target=run_analysis, daemon=True)
    thread.start()
    return jsonify({'status': 'started'})


@app.route('/api/status')
def get_status():
    return jsonify(analysis_status)


@app.route('/api/data')
def get_data():
    data = load_cached_data()
    if data is None:
        return jsonify({'error': 'no_data', 'message': '분석 데이터가 없습니다. 분석을 먼저 실행해주세요.'})
    return jsonify(data)


def parse_fchart_xml(xml_text):
    """fchart XML 파싱 → OHLCV 리스트"""
    import re
    candles = []
    for m in re.finditer(r'data="(\d{8})\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)"', xml_text):
        date, o, h, l, c, v = m.groups()
        candles.append({
            'date': date,
            'open': int(o), 'high': int(h),
            'low': int(l), 'close': int(c),
            'volume': int(v),
        })
    return candles


@app.route('/api/chart/<ticker>')
def get_chart(ticker):
    """일봉(1년) + 월봉(5년) 차트 데이터 반환"""
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
    end_date = datetime.now().strftime('%Y%m%d')
    start_daily = (datetime.now() - timedelta(days=400)).strftime('%Y%m%d')
    result = {'ticker': ticker, 'daily': [], 'monthly': [], 'name': ''}

    # 일봉 (JSON API — 약 250거래일)
    try:
        url = (f'https://api.stock.naver.com/chart/domestic/item/{ticker}/day'
               f'?startDateTime={start_daily}&endDateTime={end_date}')
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            raw = r.json()
            result['daily'] = [
                {
                    'date': d.get('localDate', ''),
                    'open': int(d.get('openPrice', 0) or 0),
                    'high': int(d.get('highPrice', 0) or 0),
                    'low': int(d.get('lowPrice', 0) or 0),
                    'close': int(d.get('closePrice', 0) or 0),
                    'volume': int(d.get('accumulatedTradingVolume', 0) or 0),
                }
                for d in raw if d.get('closePrice')
            ]
    except Exception as e:
        result['daily_error'] = str(e)

    # 월봉 (fchart XML API — 60개월 = 5년)
    try:
        url = f'https://fchart.stock.naver.com/sise.nhn?symbol={ticker}&timeframe=month&count=60&requestType=0'
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            result['monthly'] = parse_fchart_xml(r.text)
    except Exception as e:
        result['monthly_error'] = str(e)

    # 종목 기본 정보 (캐시에서) + 분석 코멘트/방어 계산
    mode = flask_request.args.get('mode', 'short')
    try:
        cached = load_cached_data()
        if cached:
            stocks_list = cached.get(mode, cached.get('short', {})).get('stocks', [])
            for s in stocks_list:
                if s['ticker'] == ticker:
                    result['name'] = s['name']
                    result['stock_info'] = s
                    break
    except Exception:
        pass

    if result['daily'] and result.get('stock_info'):
        try:
            closes = np.array([c['close'] for c in result['daily'] if c['close']], dtype=float)
            volumes = np.array([c['volume'] for c in result['daily'] if c['volume'] is not None], dtype=float)
            if len(closes) >= 20:
                fn = generate_long_analysis if mode == 'long' else generate_analysis
                result['analysis'] = fn(closes, volumes, result['stock_info'])
        except Exception:
            pass

    return jsonify(result)


if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("  uksnote 국내 요약기")
    print("  http://localhost:5001 에서 접속하세요")
    print("=" * 60 + "\n")
    app.run(debug=True, port=5001)
