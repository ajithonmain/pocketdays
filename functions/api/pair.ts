interface Statement { bind(...values: unknown[]): Statement; first<T>(): Promise<T | null>; run(): Promise<{meta:{changes:number}}> }
interface Env { DB: { prepare(sql:string): Statement } }
interface Context { request: Request; env: Env }
const TTL_SECONDS = 600;
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const sha256=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),x=>x.toString(16).padStart(2,'0')).join('');
async function readBody(request:Request):Promise<Record<string,unknown>|null>{
  const raw=await request.text();if(raw.length>2000)return null;
  try{const body=JSON.parse(raw);return body&&typeof body==='object'?body:null;}catch{return null;}
}
/**
 * PUT  /api/pair  (bearer diary key)  store an encrypted diary key under a one-time lookup id.
 * POST /api/pair  (no auth)           claim and delete it. The server never sees the pairing code.
 */
export async function onRequest({request,env}:Context):Promise<Response>{
  if(request.method!=='PUT'&&request.method!=='POST')return reply({error:'Method not allowed'},405);
  const now=Math.floor(Date.now()/1000);
  if(request.method==='PUT'){
    const key=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if(!key)return reply({error:'Private diary link required'},401);
    const body=await readBody(request);
    const id=body?.id,payload=body?.payload;
    if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id)||typeof payload!=='string'||!/^[A-Za-z0-9+/=]{20,400}$/.test(payload))return reply({error:'Invalid pairing'},400);
    const hash=await sha256(key);
    const diary=await env.DB.prepare('SELECT revision FROM diaries WHERE key_hash=?').bind(hash).first<{revision:number}>();
    if(!diary)return reply({error:'Sync this diary first'},404);
    await env.DB.prepare('DELETE FROM pairings WHERE expires_at<=? OR key_hash=?').bind(now,hash).run();
    const expiresAt=now+TTL_SECONDS;
    await env.DB.prepare('INSERT OR REPLACE INTO pairings (id,key_hash,payload,expires_at) VALUES (?,?,?,?)').bind(id,hash,payload,expiresAt).run();
    return reply({expiresAt});
  }
  const body=await readBody(request);
  const id=body?.id;
  if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))return reply({error:'Invalid pairing'},400);
  const row=await env.DB.prepare('DELETE FROM pairings WHERE id=? AND expires_at>? RETURNING payload').bind(id,now).first<{payload:string}>();
  return row?reply({payload:row.payload}):reply({error:'Code not found or expired'},404);
}
