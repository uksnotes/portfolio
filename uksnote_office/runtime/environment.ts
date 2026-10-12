/** Local adapter for the original Cloudflare D1 interface. */
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdirSync,chmodSync} from 'node:fs';
import path from 'node:path';
export const root=process.env.HI_OFFICE_ROOT || process.cwd();
export const dataDir=path.resolve(process.env.HI_OFFICE_DATA_DIR || path.join(root,'data'));
mkdirSync(dataDir,{recursive:true,mode:0o700});
const settings=JSON.parse(readFileSync(path.join(dataDir,'settings.json'),'utf8'));
for(const k of ['OFFICE_PASSWORD_SALT','OFFICE_PASSWORD_HASH','OFFICE_ENCRYPTION_KEY'])if(!settings[k])throw Error('Local settings missing: '+k);
const sql=new DatabaseSync(path.join(dataDir,'office.sqlite3'));
try{chmodSync(path.join(dataDir,'office.sqlite3'),0o600);}catch{}
sql.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
sql.exec('CREATE TABLE IF NOT EXISTS local_migrations(name TEXT PRIMARY KEY);');
for(const name of readdirSync(path.join(root,'source/drizzle')).filter(x=>x.endsWith('.sql')).sort()){
 if(sql.prepare('SELECT name FROM local_migrations WHERE name=?').get(name))continue;
 sql.exec('BEGIN IMMEDIATE');
 try{sql.exec(readFileSync(path.join(root,'source/drizzle',name),'utf8'));sql.prepare('INSERT INTO local_migrations(name) VALUES(?)').run(name);sql.exec('COMMIT');}
 catch(e){sql.exec('ROLLBACK');throw e;}
}
class Statement{
 constructor(public query:string,public args:any[]=[]){}
 bind(...args:any[]){return new Statement(this.query,args);}
 async first(column?:string){const row:any=sql.prepare(this.query).get(...this.args);return row?(column?row[column]:row):null;}
 async all(){return {success:true,results:sql.prepare(this.query).all(...this.args)};}
 runSync(){const x=sql.prepare(this.query).run(...this.args);return {success:true,results:[],meta:{changes:Number(x.changes),last_row_id:Number(x.lastInsertRowid)}};}
 async run(){return this.runSync();}
}
export const env={...settings,DB:{
 prepare(query:string){return new Statement(query);},
 async batch(statements:Statement[]){sql.exec('BEGIN IMMEDIATE');try{const result=statements.map(s=>s.runSync());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}
}};
export function closeDatabase(){sql.close();}
