import {createHash} from 'node:crypto';
import {calculateIntergrowth} from '../../intergrowth.js';
import {calculateIntergrowthVelocity} from '../../intergrowth-velocity.js';
import {calculateEnteral,integrateNutrition} from '../../enteral.js';

export const fixedIssueDate=new Date('2026-10-15T16:00:00Z');
export function reportCases(){
 const enteral=calculateEnteral({type:'lhop',rate:150}),nutrition={enteral,integrated:integrateNutrition({source:'none',enteral})};
 const make=(name,sex,measurements)=>({name,nutrition,result:calculateIntergrowth({sex,measurements}),assessment:'História fictícia.\nAvaliação.\nConduta.\nProgramação.\nReavaliar.'});
 const cases=['male','female'].map(sex=>make(sex+'-20',sex,Array.from({length:20},(_,i)=>({weeks:30+Math.floor(i/7),days:i%7,weight:1200+i*25,...(i%3?{length:35+i*.2}:{}),...(i%4?{head:25+i*.1}:{})}))));
 cases.push(make('limites','female',[{weeks:27,days:0,weight:600},{weeks:64,days:0,weight:7000}]));
 cases.push(make('fora-da-grade','male',[{weeks:40,days:0,weight:20000}]));
 const velocity=make('velocidade','male',[{weeks:40,days:0,weight:3000,length:49,head:34.5},{weeks:41,days:3,weight:3300,length:50,head:35}]);
 velocity.result.velocity=calculateIntergrowthVelocity(velocity.result,0,1);cases.push(velocity);
 return cases;
}

/** Capture every first-page drawing operation, allowing only the release number to change. */
export async function capturePageOne(createReport,input){
 const proto=globalThis.PDFLib.PDFPage.prototype,methods=['drawText','drawLine','drawRectangle'],saved={},operations=[];
 let first=null;
 const normalize=value=>{
  if(value==null||typeof value!=='object')return typeof value==='string'?value.replace(/Versão \d+\.\d+\.\d+/g,'Versão <VERSION>'):value;
  if(Array.isArray(value))return value.map(normalize);
  if(value.name&&value.constructor?.name==='PDFFont')return {font:value.name};
  if(value.name&&typeof value.widthOfTextAtSize==='function')return {font:value.name};
  return Object.fromEntries(Object.entries(value).filter(([k])=>!['font'].includes(k)).map(([k,v])=>[k,normalize(v)]).concat(value.font?[['font',value.font.name]]:[]));
 };
 for(const method of methods){saved[method]=proto[method];proto[method]=function(...args){if(!first)first=this;if(this===first)operations.push({method,args:normalize(args)});return saved[method].apply(this,args);};}
 const RealDate=globalThis.Date;
 globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[fixedIssueDate]));}static now(){return +fixedIssueDate;}};
 try{const bytes=await createReport(input);return {bytes,hash:createHash('sha256').update(JSON.stringify(operations)).digest('hex'),operations};}
 finally{globalThis.Date=RealDate;for(const method of methods)proto[method]=saved[method];}
}
