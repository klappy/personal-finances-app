import fs from 'node:fs/promises';import path from 'node:path';import {empty,operate} from './core.mjs';
const readOperations=new Set(['docs','query','summarize','coverage','import_preview','export']);
export function store(filename,actor,provider=null){
 let queue=Promise.resolve();
 return(name,args)=>{
  const task=queue.then(async()=>{
   const readOnly=readOperations.has(name);let lock;
   if(!readOnly){
    await fs.mkdir(path.dirname(filename),{recursive:true});
    try{lock=await fs.open(filename+'.lock','wx',0o600);}catch(e){if(e.code==='EEXIST')throw Error('State busy: another client holds the write lock');throw e;}
   }
   try{
    let state;try{state=JSON.parse(await fs.readFile(filename,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;state=empty();}
    const before=state.revision,result=await operate(state,name,args,actor,provider);
    if(state.revision!==before){
     if(readOnly)throw Error('Read operation attempted to mutate state');
     const temp=filename+'.tmp';await fs.writeFile(temp,JSON.stringify(state),{mode:0o600});await fs.rename(temp,filename);
    }
    return result;
   }finally{if(lock){await lock.close();await fs.unlink(filename+'.lock');}}
  });queue=task.catch(()=>{});return task;
 };
}
