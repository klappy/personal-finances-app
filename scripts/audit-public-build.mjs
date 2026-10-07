import {readdir,readFile} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {pathToFileURL} from 'node:url';

// Financial ingredients belong in authenticated runtime storage, never in the
// public app repository or browser build. This gate catches common leakage;
// it complements, rather than replaces, source review and runtime auth tests.
const patterns=[
 ['provider account identifier',/\buagr_[A-Za-z0-9]+\b/],
 ['provider connection identifier',/\bagco_[A-Za-z0-9]+\b/],
 ['email address',/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
 ['embedded monetary amount',/\$\s*\d[\d,]*(?:\.\d{2})?\b/],
 ['private local path',/\/Users\/[^\s"'<>]+/],
 ['private credential material',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[ps]_[A-Za-z0-9]{20,}/]
];
export async function auditPublicBuild(directory){
 const findings=[];let files=0;
 async function visit(folder){for(const entry of await readdir(folder,{withFileTypes:true})){
  const path=join(folder,entry.name),name=relative(directory,path);
  if(entry.isSymbolicLink()){findings.push({path:name,rule:'symlink in public assets'});continue;}
  if(entry.isDirectory()){await visit(path);continue;}
  files++;
  if(/\.(?:map|csv|tsv|pdf|sqlite|db)$/i.test(name)){findings.push({path:name,rule:'source document or source map in public assets'});continue;}
  if(!/\.(?:html|js|mjs|css|json|webmanifest|svg|txt)$/i.test(name))continue;
  const content=await readFile(path,'utf8');
  for(const [rule,pattern] of patterns)if(pattern.test(content))findings.push({path:name,rule});
 }}
 await visit(directory);if(!files)findings.push({path:'.',rule:'empty build'});
 return {files,findings,pass:files>0&&findings.length===0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await auditPublicBuild(process.argv[2]||'dist');
 // Report categories and paths only; never echo the matched private value.
 console.log(JSON.stringify(result,null,2));if(!result.pass)process.exitCode=1;
}
