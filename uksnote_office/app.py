#!/usr/bin/env python3
"""HI OFFICE local launcher. Python 3.10+ and Node.js 22.13+; no pip packages."""
from __future__ import annotations
import argparse
import base64
import getpass
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parent

def node_path() -> str:
    binary = shutil.which('node')
    if not binary:
        raise RuntimeError('Node.js가 없습니다. https://nodejs.org 에서 Node.js 22.13 이상을 설치하고 터미널을 다시 열어 주세요.')
    try:
        version = subprocess.check_output([binary, '--version'], text=True).strip().lstrip('v')
        parts = tuple(int(x) for x in version.split('.')[:2])
        if parts < (22, 13):
            raise RuntimeError('Node.js 22.13 이상이 필요합니다. 현재 버전: ' + version)
    except (subprocess.SubprocessError, ValueError) as exc:
        raise RuntimeError('node --version 실행을 확인해 주세요.') from exc
    return binary

def write_private(path: Path, obj: dict, *, exclusive: bool = False) -> None:
    flags = os.O_WRONLY | os.O_CREAT | (os.O_EXCL if exclusive else os.O_TRUNC)
    fd = os.open(path, flags, 0o600)
    with os.fdopen(fd, 'w', encoding='utf-8') as output:
        json.dump(obj, output, indent=2)
        output.write('\n')

def password_fields(password: str) -> dict:
    salt = secrets.token_hex(24)
    return {'OFFICE_PASSWORD_SALT': salt,
            'OFFICE_PASSWORD_HASH': hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()}

def ensure_settings(data: Path) -> None:
    data.mkdir(parents=True, exist_ok=True, mode=0o700)
    config = data / 'settings.json'
    if not config.exists():
        # Never replace a lost encryption key while a database already exists.
        if (data / 'office.sqlite3').exists():
            raise RuntimeError('기존 DB의 settings.json이 없습니다. 백업의 settings.json을 복원하세요. 기존 데이터는 변경하지 않았습니다.')
        initial = {**password_fields('1234'), 'OFFICE_ENCRYPTION_KEY': base64.b64encode(secrets.token_bytes(32)).decode()}
        try:
            write_private(config, initial, exclusive=True)
        except FileExistsError:
            pass
    try:
        content = json.loads(config.read_text(encoding='utf-8'))
        if not all(content.get(x) for x in ('OFFICE_PASSWORD_SALT','OFFICE_PASSWORD_HASH','OFFICE_ENCRYPTION_KEY')):
            raise ValueError('missing settings')
        if len(base64.b64decode(content['OFFICE_ENCRYPTION_KEY'], validate=True)) != 32:
            raise ValueError('invalid encryption key')
    except (ValueError, KeyError) as exc:
        raise RuntimeError('data/settings.json 형식을 확인하세요. 백업 파일이 있으면 복원해 주세요.') from exc

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description='HI OFFICE 로컬 실행')
    parser.add_argument('--port', type=int, default=8000, help='접속 포트 (기본 8000)')
    parser.add_argument('--no-browser', action='store_true', help='브라우저 자동 열기 끄기')
    parser.add_argument('--data-dir', type=Path, default=ROOT / 'data', help='SQLite·설정 저장 폴더')
    parser.add_argument('--check', action='store_true', help='실행 환경과 빌드 파일만 검사')
    parser.add_argument('--set-password', action='store_true', help='서버 종료 후 로컬 로그인 비밀번호 변경')
    args = parser.parse_args(argv)
    if not 1024 <= args.port <= 65535:
        parser.error('--port는 1024~65535 사이여야 합니다.')
    try:
        node = node_path()
        for filename in ('static/index.html','runtime-dist/server.mjs'):
            if not (ROOT / filename).is_file():
                raise RuntimeError(f'{filename} 파일이 없습니다. ZIP 전체를 압축 해제하거나 npm install 후 npm run build를 실행하세요.')
        if args.check:
            print('OK: Python / Node.js / 화면 빌드 / API 서버 파일 확인')
            return 0
        data = args.data_dir.expanduser().resolve()
        ensure_settings(data)
        if args.set_password:
            password = getpass.getpass('새 비밀번호: ')
            if len(password) < 4 or len(password) > 256:
                raise RuntimeError('비밀번호는 4~256자 사이로 입력하세요.')
            if getpass.getpass('새 비밀번호 확인: ') != password:
                raise RuntimeError('비밀번호가 일치하지 않습니다.')
            config = data / 'settings.json'
            values = json.loads(config.read_text(encoding='utf-8'))
            values.update(password_fields(password))
            temp = data / ('settings-' + secrets.token_hex(8) + '.tmp')
            write_private(temp, values, exclusive=True)
            os.replace(temp, config)
            database = data / 'office.sqlite3'
            if database.exists():
                with sqlite3.connect(database) as connection:
                    connection.execute('DELETE FROM sessions')
                    connection.execute('DELETE FROM attempts')
            print('비밀번호를 변경했습니다. python app.py로 다시 실행하세요.')
            return 0
        instance = secrets.token_hex(16)
        env = os.environ.copy()
        env.update(HI_OFFICE_ROOT=str(ROOT), HI_OFFICE_DATA_DIR=str(data), HI_OFFICE_PORT=str(args.port), HI_OFFICE_INSTANCE=instance)
        url = f'http://127.0.0.1:{args.port}'
        print(f'HI OFFICE 시작 중…\n데이터 폴더: {data}\n종료: Ctrl+C', flush=True)
        process = subprocess.Popen([node, str(ROOT / 'runtime-dist/server.mjs')], cwd=ROOT, env=env)
        # Local health requests must not go through a corporate HTTP proxy.
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        try:
            for _ in range(100):
                if process.poll() is not None:
                    raise RuntimeError('서버가 시작되지 않았습니다. 위 오류를 확인해 주세요.')
                try:
                    with opener.open(url + '/health', timeout=0.5) as response:
                        ready = json.load(response)
                    if ready.get('instance') == instance:
                        break
                except (OSError, ValueError, urllib.error.URLError):
                    pass
                time.sleep(0.1)
            else:
                raise RuntimeError('서버 시작 시간이 초과되었습니다.')
            print(f'접속: {url}\n기본 계정: datascience_user1 / 최초 비밀번호: 1234', flush=True)
            if not args.no_browser:
                try:
                    webbrowser.open(url)
                except Exception:
                    print('브라우저에서 위 접속 주소를 직접 열어 주세요.')
            return process.wait()
        finally:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
    except KeyboardInterrupt:
        print('\nHI OFFICE를 종료했습니다. 저장한 데이터는 유지됩니다.')
        return 0
    except (RuntimeError, OSError) as exc:
        print('실행 오류: ' + str(exc), file=sys.stderr)
        return 1

if __name__ == '__main__':
    raise SystemExit(main())
