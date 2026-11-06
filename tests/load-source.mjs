import { readFileSync } from 'node:fs';
import ts from 'typescript';
const cache=new Map();
function sourceUrl(name){
  if(cache.has(name))return cache.get(name);
  const source=readFileSync(new URL(`../src/app/core/${name}.ts`,import.meta.url),'utf8');
  let js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  js=js.replace(/from ['"]\.\/([^'"]+)['"]/g,(_,dependency)=>`from '${sourceUrl(dependency)}'`);
  const url='data:text/javascript;base64,'+Buffer.from(js).toString('base64');cache.set(name,url);return url;
}
export function loadSource(name){return import(sourceUrl(name));}
