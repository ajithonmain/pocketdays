import { parseBackup } from '../../src/app/core/backup';
interface Statement { bind(...values: unknown[]): Statement; first<T>(): Promise<T | null>; run(): Promise<{meta:{changes:number}}> }
interface Env { DB: { prepare(sql:string): Statement } }
interface Context { request: Request; env: Env }
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const empty=()=>({schemaVersion:1,stores:[],people:[],days:[],settings:{currency:'INR',weekStart:'monday',showDailyTotals:false}});
export async function onRequest({request,env}:Context):Promise<Response>{
  if(!['GET','PUT'].includes(request.method)) return reply({error:'Method not allowed'},405);
  const key=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if(!key)return reply({error:'Private diary link required'},401);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key))),x=>x.toString(16).padStart(2,'0')).join('');
  if(request.method==='PUT'){
    const raw=await request.text();if(raw.length>1_000_000)return reply({error:'Diary too large'},413);
    let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid JSON'},400);}
    if(!body || !Number.isSafeInteger(body.revision)||body.revision<0||body.data?.schemaVersion!==1||!Array.isArray(body.data.days)||!Array.isArray(body.data.stores)||!Array.isArray(body.data.people)||!body.data.settings)return reply({error:'Invalid diary'},400);
    try { body.data = parseBackup(JSON.stringify({app:'PocketDays',kind:'backup',version:1,diary:body.data})).diary; }
    catch { return reply({error:'Invalid diary'},400); }
    const initial=JSON.stringify(empty());
    await env.DB.prepare('INSERT OR IGNORE INTO diaries (key_hash,revision,data) VALUES (?,0,?)').bind(hash,initial).run();
    const result=await env.DB.prepare('UPDATE diaries SET data=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE key_hash=? AND revision=?').bind(JSON.stringify(body.data),hash,body.revision).run();
    if(result.meta.changes!==1)return reply({error:'Revision conflict'},409);
  }
  const row=await env.DB.prepare('SELECT revision,data FROM diaries WHERE key_hash=?').bind(hash).first<{revision:number;data:string}>();
  return reply(row?{revision:row.revision,data:JSON.parse(row.data)}:{revision:0,data:empty()});
}
