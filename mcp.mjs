import {providerFromEnvironment} from './ma8ic-provider.mjs';
import readline from 'node:readline';import {store} from './store.mjs';import {rpc} from './tools.mjs';
if(!process.env.FINANCE_STATE_FILE){console.error('FINANCE_STATE_FILE must name a private state file outside the code repository');process.exit(1);}
const call=store(process.env.FINANCE_STATE_FILE,'local-mcp-process',await providerFromEnvironment());for await(const line of readline.createInterface({input:process.stdin})){try{const result=await rpc(JSON.parse(line),call);if(result)process.stdout.write(JSON.stringify(result)+'\n');}catch{process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}})+'\n');}}
