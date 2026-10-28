import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {auditPublicBuild} from '../scripts/audit-public-build.mjs';
test('public build gate rejects embedded financial ingredients without echoing them',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'finance-public-audit-'));
 try{
  assert.equal((await auditPublicBuild(dir)).pass,false);
  await writeFile(join(dir,'app.js'),'fetch("/api/capability"); const format = new Intl.NumberFormat("en-US", {style:"currency",currency:"USD"});');
  assert.equal((await auditPublicBuild(dir)).pass,true);
  const privateValue='uagr_fixturePrivateAccount';
  await writeFile(join(dir,'bad.js'),`const account="${privateValue}"; const cost="$999.99"; const owner="alice@fixture.test";`);
  await writeFile(join(dir,'ledger.csv'),'date,amount');
  const result=await auditPublicBuild(dir);assert.equal(result.pass,false);assert.equal(result.findings.length,4);assert.equal(JSON.stringify(result).includes(privateValue),false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
