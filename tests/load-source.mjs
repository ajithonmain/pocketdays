import { readFileSync } from 'node:fs';
import ts from 'typescript';
const cache=new Map();
function sourceUrl(file){
  const key=file.href;
  if(cache.has(key))return cache.get(key);
  const source=readFileSync(file,'utf8');
  let js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  js=js.replace(/from ['"](\.[^'"]+)['"]/g,(_,dependency)=>`from '${sourceUrl(new URL(dependency.endsWith('.ts')?dependency:dependency+'.ts',file))}'`);
  const url='data:text/javascript;base64,'+Buffer.from(js).toString('base64');cache.set(key,url);return url;
}
export function loadSource(name){return import(sourceUrl(new URL(`../src/app/core/${name}.ts`,import.meta.url)));}
export function loadFile(file){return import(sourceUrl(file));}
