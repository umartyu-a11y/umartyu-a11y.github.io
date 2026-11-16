import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 3000);
const apiBase = (process.env.OPENAI_API_BASE || 'https://api.openai.com/v1').replace(/\/$/, '');
const apiKey = process.env.OPENAI_API_KEY || '';
const model = process.env.AI_MODEL || 'gpt-5-mini';
const origin = process.env.ALLOWED_ORIGIN || '*';
const json = (res, status, body) => { res.writeHead(status, {'content-type':'application/json; charset=utf-8','access-control-allow-origin':origin,'access-control-allow-headers':'content-type','access-control-allow-methods':'GET,POST,OPTIONS'}); res.end(JSON.stringify(body)); };
const normalizeArabic = s => String(s || '').normalize('NFKC').replace(/[،؛,.!?؟:؛]/g, ' ').replace(/[إأآٱ]/g,'ا').replace(/[ؤ]/g,'و').replace(/[ئ]/g,'ي').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـٰ]/g,'').replace(/\s+/g,' ').trim();
const readBody = req => new Promise((resolve,reject)=>{let data='';req.on('data',c=>{data+=c;if(data.length>100000) reject(new Error('payload too large'))});req.on('end',()=>{try{resolve(JSON.parse(data||'{}'))}catch(e){reject(e)}});req.on('error',reject)});
async function check(body){
  if(!apiKey) throw Object.assign(new Error('AI backend is not configured'),{status:503});
  const expected=String(body.expected||'').slice(0,12000), transcript=String(body.transcript||'').slice(0,12000), mode=body.mode||'letters';
  if(!expected||!transcript) throw Object.assign(new Error('expected and transcript are required'),{status:400});
  const prompt=`Эталонный арабский текст:\n${expected}\n\nРаспознанный текст ученика:\n${transcript}\n\nРежим проверки: ${mode}.`;
  const upstream=await fetch(`${apiBase}/chat/completions`,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${apiKey}`},body:JSON.stringify({model,messages:[{role:'system',content:'Ты точный проверяющий заучивания арабских исламских матнов. Сравнивай только предоставленные строки. Не выдавай низкоуверенное распознавание за ошибку ученика. Учитывай нормальные варианты алифа, хамзы, пунктуации и отсутствие огласовок в режиме letters. Верни JSON с полями confidence (0..1), score (0..1), status (reliable или uncertain), corrected, summary и errors; errors — массив объектов type (missing/extra/replace/order/uncertain), expected, heard, message. Отвечай только валидным JSON без markdown.'},{role:'user',content:prompt}],temperature:0.1,max_completion_tokens:1800,reasoning:{effort:'low'},response_format:{type:'json_object'}})});
  const raw=await upstream.text();if(!upstream.ok) throw Object.assign(new Error(`AI provider ${upstream.status}: ${raw.slice(0,300)}`),{status:502});
  const data=JSON.parse(raw), content=data.choices?.[0]?.message?.content; if(!content) throw Object.assign(new Error('AI returned no content'),{status:502});
  const parsed=JSON.parse(content);const score=Number(parsed.score??(parsed.match===true?1:parsed.match===false?0:0));const errors=Array.isArray(parsed.errors)?parsed.errors:[];return {confidence:Number(parsed.confidence??(parsed.status==='uncertain'?0.5:0.92)),score,status:parsed.status||((parsed.uncertain||errors.some(e=>e.type==='uncertain'))?'uncertain':'reliable'),corrected:parsed.corrected||parsed.normalized_reference||expected,summary:parsed.summary||parsed.note||'Сравнение выполнено AI-моделью.',errors,model};
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8'};
async function staticFile(req,res){let path=req.url.split('?')[0];if(path==='/')path='/index.html';let safe=normalize(path).replace(/^\.\.(\/|\\)/,'');try{let data=await readFile(join(root,safe));res.writeHead(200,{'content-type':mime[extname(safe)]||'application/octet-stream'});res.end(data)}catch{json(res,404,{error:'not found'})}}
const server=http.createServer(async(req,res)=>{if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':origin,'access-control-allow-headers':'content-type','access-control-allow-methods':'GET,POST,OPTIONS'});return res.end()}if(req.method==='GET'&&req.url.startsWith('/health'))return json(res,200,{ok:true,aiConfigured:Boolean(apiKey),model});if(req.method==='POST'&&req.url.startsWith('/api/check')){try{return json(res,200,await check(await readBody(req)))}catch(e){return json(res,e.status||500,{error:e.message})}}return staticFile(req,res)});
server.listen(port,'0.0.0.0',()=>console.log(`Matn AI backend listening on ${port}`));
