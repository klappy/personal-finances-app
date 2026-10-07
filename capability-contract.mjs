// L5-owned operation schemas, effects and service routes.
import {classificationSchema} from './classification-contract.mjs';
const string={type:'string'},integer={type:'integer'},classification=classificationSchema;
export const operationDefinitions=[
 ['docs','Read capabilities, versions and limitations',{},[]],
 ['query','Read canonical transactions with bounded pagination',{record_ids:{type:'array',items:string,maxItems:5000},search:string,month:string,account:string,purpose:string,offset:integer,limit:integer,collection:{type:'string',enum:['flows','ledger','snapshot','records']},kind:string,view:{type:'string',enum:['dashboard']},scope:{type:'string',enum:['home','work','combined']},period:string,hide_reimbursed:{type:'boolean'},all:{type:'boolean'}},[]],
 ['summarize','Read recorded spending totals or shared monthly spending projection; no coverage claim',{account_type:{type:'string',enum:['credit_card','loan','bank']},month:string,account:string,purpose:string,view:{type:'string',enum:['spending']},months:{type:'array',items:string,minItems:1,maxItems:24},scope:{type:'string',enum:['home','work','combined']},collection:{type:'string',enum:['flows','commitments','evidence','accounts']},kind:string,period:string,hide_reimbursed:{type:'boolean'},groups:{type:'array',items:string,maxItems:100},series:{type:'boolean'},rollups:{type:'array',maxItems:8,items:{type:'array',minItems:1,maxItems:12,items:{type:'string',enum:['kind','direction','family','purpose','group','category','account','merchant','detail','travel_purpose','payment_channel']}}},series_by:{type:'array',items:{type:'string',enum:['kind','direction','family','purpose','group','category','account','merchant','detail','travel_purpose','payment_channel']}},group_by:{type:'array',items:{type:'string',enum:['month','kind','direction','family','purpose','group','category','account','merchant','detail','travel_purpose','payment_channel']}}},[]],
 ['coverage','Read source counts per account/month; counts are not completeness proof',{month:string,account:string,purpose:string},[]],
 ['export','Export the ledger and evidence; may contain private financial data',{},[]],
 ['import_preview','Validate a normalized import without changing data',{rows:{type:'array',items:{type:'object'}},format:{type:'string',enum:['dashboard_snapshot','runtime_evidence']},snapshot:{type:'object'},evidence:{type:'object'}},[]],
 ['import_commit','Commit normalized source records without duplicate spending',{revision:integer,idempotency_key:string,rows:{type:'array',items:{type:'object'}},format:{type:'string',enum:['dashboard_snapshot','runtime_evidence']},snapshot:{type:'object'},evidence:{type:'object'}},['revision','idempotency_key']],
 ['classification_propose','Store a review-only classification proposal',{revision:integer,transaction_id:string},['revision','transaction_id']],
 ['decision_update','Save dashboard curation and budget decisions with evidence history',{revision:integer,decisions:{type:'object',properties:{transactions:{type:'object'},budgets:{type:'object'},commitments:{type:'object'},notes:string},required:['transactions','budgets','commitments','notes'],additionalProperties:false}},['revision','decisions']],
 ['classification_review','Accept or reject a proposal with evidence and a revision check',{revision:integer,proposal_id:string,decision:{type:'string',enum:['accept','reject']},classification,evidence:string},['revision','proposal_id','decision','evidence']]
].map(([name,description,properties,required])=>({name,description,inputSchema:{type:'object',properties,required,additionalProperties:false},annotations:{readOnlyHint:!['import_commit','classification_propose','classification_review','decision_update'].includes(name),destructiveHint:name==='classification_review',idempotentHint:['docs','query','summarize','coverage','export','import_preview','import_commit'].includes(name),openWorldHint:false}}));
export const operationRoutes={
 docs:{capability:'docs',args:{}},
 query:{capability:'query'},
 summarize:{capability:'project',operation:'summarize'},
 coverage:{capability:'project',operation:'coverage'},
 export:{capability:'query',args:{collection:'ledger'}},
 import_preview:{capability:'project',operation:'import_preview'},
 import_commit:{capability:'execute',operation:'import_commit'},
 classification_propose:{capability:'execute',operation:'classification_propose'},
 decision_update:{capability:'execute',operation:'decision_update'},
 classification_review:{capability:'execute',operation:'classification_review'}
};
