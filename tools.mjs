import {operationDefinitions} from './capability-contract.mjs';
export {operationDefinitions} from './capability-contract.mjs';
import {VERSION} from './core.mjs';
export const toolDefinitions=[
 {name:'docs',description:'Discover all operation schemas, effects, versions and limits',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},
 {name:'query',description:'Read canonical facts or composed flow collections with bounded filters',inputSchema:operationDefinitions.find(x=>x.name==='query').inputSchema,annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},
 {name:'project',description:'Produce pure summaries, source coverage or import previews; never writes',inputSchema:{type:'object',properties:{operation:{type:'string',enum:['summarize','coverage','import_preview','decision_preview']},args:{type:'object'}},required:['operation','args'],additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},
 {name:'execute',description:'Run an explicit authenticated, revisioned import or curation command; no financial transactions',inputSchema:{type:'object',properties:{operation:{type:'string',enum:['import_commit','classification_propose','classification_review','decision_update']},args:{type:'object'}},required:['operation','args'],additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:true,idempotentHint:false,openWorldHint:true}}
];
function validateSchema(value,schema,path='args',depth=0){
 if(depth>30)throw Error('Input nesting limit');
 if(schema.type==='object'){if(!value||typeof value!=='object'||Array.isArray(value))throw Error(path+' must be an object');for(const key of schema.required||[])if(!Object.hasOwn(value,key))throw Error(path+'.'+key+' is required');for(const [key,child] of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key))throw Error('Reserved input key');const next=schema.properties?.[key];if(!next&&schema.additionalProperties===false)throw Error('Unknown argument: '+path+'.'+key);if(next)validateSchema(child,next,path+'.'+key,depth+1);}}
 else if(schema.type==='array'){if(!Array.isArray(value)||schema.minItems&&value.length<schema.minItems||schema.maxItems&&value.length>schema.maxItems)throw Error(path+' must be a bounded array');if(schema.items)value.forEach((v,i)=>validateSchema(v,schema.items,path+'['+i+']',depth+1));}
 else if(schema.type==='integer'){if(!Number.isInteger(value))throw Error(path+' must be an integer');}
 else if(schema.type&&typeof value!==schema.type)throw Error(path+' must be '+schema.type);
 if(schema.enum&&!schema.enum.includes(value))throw Error('Invalid option: '+path);
}
export async function dispatch(name,args,call){
 const method=toolDefinitions.find(x=>x.name===name);if(!method)throw Error('Unknown capability');validateSchema(args||{},method.inputSchema);
 if(name==='docs')return structuredClone({...await call('docs',{}),surface:toolDefinitions,operations:operationDefinitions});
 const operation=name==='query'?'query':args.operation,parameters=name==='query'?args:args.args;
 const definition=operationDefinitions.find(x=>x.name===operation);if(!definition)throw Error('Unknown operation');validateSchema(parameters,definition.inputSchema);return call(operation,parameters);
}
export async function rpc(message,call){const {id,method,params={}}=message;if(id===undefined)return null;try{let result;if(method==='initialize')result={protocolVersion:'2025-06-18',capabilities:{tools:{}},serverInfo:{name:'finance-core-prototype',version:VERSION}};else if(method==='ping')result={};else if(method==='tools/list')result={tools:toolDefinitions};else if(method==='tools/call'){if(!toolDefinitions.some(t=>t.name===params.name))throw Error('Unknown tool');const data=await dispatch(params.name,params.arguments||{},call);result={content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data};}else return{jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}};return{jsonrpc:'2.0',id,result};}catch(e){return{jsonrpc:'2.0',id,result:{isError:true,content:[{type:'text',text:e.message}]}};}}
