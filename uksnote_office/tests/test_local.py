"""End-to-end HTTP tests using temporary data. No external service calls."""
import json
import os
from pathlib import Path
import re
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]

class LocalOfficeTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='hi-office-test-')
        self.data = Path(self.temp.name) / 'data'
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            self.port = sock.getsockname()[1]
        self.url = f'http://127.0.0.1:{self.port}'
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        self.process = None
        self.log = open(Path(self.temp.name)/'server.log','w+',encoding='utf-8')
        self.start()

    def start(self):
        self.process = subprocess.Popen([sys.executable,str(ROOT/'app.py'),'--no-browser','--port',str(self.port),'--data-dir',str(self.data)],stdout=self.log,stderr=self.log)
        for _ in range(120):
            if self.process.poll() is not None:
                self.log.seek(0)
                self.fail('Server exited: '+self.log.read())
            try:
                if self.call('/health')[0] == 200:
                    return
            except OSError:
                pass
            time.sleep(0.1)
        self.fail('Server readiness timeout')

    def stop(self):
        if self.process and self.process.poll() is None:
            # Ctrl+C allows Python to stop its Node child on every platform.
            if os.name == 'nt':
                subprocess.run(['taskkill','/PID',str(self.process.pid),'/T','/F'],capture_output=True)
            else:
                import signal
                self.process.send_signal(signal.SIGINT)
            self.process.wait(timeout=10)

    def tearDown(self):
        self.stop()
        self.log.close()
        self.temp.cleanup()

    def call(self,path,body=None,token=None,method=None,headers=None):
        h={'Origin':self.url,'Content-Type':'application/json'}
        if token:h['Authorization']='Bearer '+token
        h.update(headers or {})
        request=urllib.request.Request(self.url+path,data=json.dumps(body).encode() if body is not None else None,headers=h,method=method or ('POST' if body is not None else 'GET'))
        try:r=self.opener.open(request,timeout=10)
        except urllib.error.HTTPError as error:r=error
        with r:
            data=r.read();content_type=r.headers.get('Content-Type','')
            return r.status,json.loads(data) if 'application/json' in content_type else data,r.headers

    def login(self):
        status,data,headers=self.call('/api/session',{'username':'datascience_user1','password':'1234'})
        self.assertEqual(status,200,data)
        self.assertNotIn('; Secure',headers['Set-Cookie'])
        return data['sessionToken']

    def test_end_to_end_and_restart(self):
        self.assertEqual(self.call('/api/state')[0],401)
        self.assertEqual(self.call('/api/session',{'username':'datascience_user1','password':'wrong'})[0],401)
        for route in ['/','/login']:
            status,html,_=self.call(route)
            self.assertEqual(status,200)
            self.assertIn(b'<div id="root">',html)
        html=self.call('/')[1].decode()
        assets=re.findall(r'(?:src|href)="(/assets/[^\"]+)"',html)
        self.assertGreaterEqual(len(assets),2)
        for asset in assets:
            status,content,_=self.call(asset)
            self.assertEqual(status,200)
            self.assertGreater(len(content),100)
        self.assertEqual(self.call('/data/settings.json')[0],404)
        self.assertEqual(self.call('/runtime-dist/server.mjs')[0],404)
        self.assertEqual(self.call('/health',headers={'Host':'evil.example'})[0],403)
        self.assertEqual(self.call('/health',headers={'Origin':'https://evil.example'})[0],403)
        token=self.login()
        entries=[('task',{'title':'재시작 유지 시험','date':'2026-10-12','done':False}),('holding',{'name':'삼성전자','code':'005930','quantity':2,'cost':100000}),('watch',{'name':'현대해상','code':'001450'}),('draft',{'to':'test@example.com','subject':'초안','body':'발송하지 않는 시험'}),('alarm',{'title':'알림 초안','enabled':False})]
        for kind,data in entries:
            self.assertEqual(self.call('/api/record',{'kind':kind,'data':data},token)[0],200)
        state=self.call('/api/state',token=token)[1]
        self.assertEqual(len(state['records']),5)
        task=next(x for x in state['records'] if x['kind']=='task')
        change={'id':task['id'],'version':task['version'],'kind':'task','data':{'title':task['title'],'date':task['date'],'done':True}}
        self.assertEqual(self.call('/api/record',change,token)[0],200)
        self.assertEqual(self.call('/api/record',change,token)[0],409)
        self.assertEqual(self.call('/api/record',{'kind':'holding','data':{'name':'bad','code':'005930','quantity':-1,'cost':1}},token)[0],400)
        # Original D1 secret interface is backed by the real local SQLite adapter.
        self.assertEqual(self.call('/api/settings',{'kisKey':'local-test-key','kisSecret':'local-test-secret'},token)[0],200)
        with sqlite3.connect(self.data/'office.sqlite3') as connection:
            secret=connection.execute('SELECT data FROM secrets').fetchone()[0]
            self.assertNotIn('local-test-secret',secret)
        self.assertEqual(self.call('/api/team-list',token=token)[0],200)
        self.assertEqual(self.call('/api/apartment-list',token=token)[0],200)
        self.assertEqual(self.call('/api/kospi-ranking',token=token)[0],200)
        # An injected platform header cannot select another local owner.
        self.assertEqual(len(self.call('/api/state',token=token,headers={'oai-authenticated-user-id':'fake-user'})[1]['records']),5)
        self.assertEqual(self.call('/api/logout',{},token)[0],200)
        self.assertEqual(self.call('/api/state',token=token)[0],401)
        config_before=(self.data/'settings.json').read_bytes()
        self.stop();self.start()
        self.assertEqual(config_before,(self.data/'settings.json').read_bytes())
        token=self.login()
        state=self.call('/api/state',token=token)[1]
        self.assertEqual(len(state['records']),5)
        self.assertTrue(next(x for x in state['records'] if x['kind']=='task')['done'])
        self.assertTrue(state['connections']['kis'])
        self.assertEqual(next(x for x in state['records'] if x['kind']=='holding')['quantity'],2)
        print('PASS: static assets, login/logout, host/origin checks, CRUD, encrypted credentials, all room endpoints, restart persistence')

if __name__=='__main__':
    unittest.main(verbosity=2)
