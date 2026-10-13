import {validateFentonData} from './fenton-ui.js';

const growthFields={sex:'gr-sex',birthWeight:'gr-birth-weight',gaWeeks:'gr-ga-weeks',gaDays:'gr-ga-days',initialDay:'gr-initial-day',initialWeight:'gr-initial-weight',finalDay:'gr-final-day',finalWeight:'gr-final-weight'};
const maxSize=1024*1024;
function checkContent(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Arquivo de acompanhamento inválido.');
 const fenton=validateFentonData(value.fenton),growth={};
 if(!value.growth||typeof value.growth!=='object'||Array.isArray(value.growth))throw new Error('Campos de velocidade inválidos no arquivo.');
 for(const key of Object.keys(growthFields)){
  const v=value.growth[key];if(typeof v!=='string'||v.length>50)throw new Error('Campos de velocidade inválidos no arquivo.');
  growth[key]=v;
 }
 if(!['','female','male'].includes(growth.sex))throw new Error('Sexo inválido nos campos de velocidade.');
 if(typeof value.assessment!=='string'||value.assessment.length>2000)throw new Error('Relato inválido no arquivo de acompanhamento.');
 return {fenton,growth,assessment:value.assessment};
}
export function encodeFollowup(value){
 return JSON.stringify({format:'GROW_NEO-followup',formatVersion:1,...checkContent(value)},null,2);
}
export function decodeFollowup(text){
 if(typeof text!=='string'||text.length>maxSize)throw new Error('Arquivo de acompanhamento inválido ou muito grande.');
 let file;try{file=JSON.parse(text);}catch{throw new Error('Arquivo de acompanhamento inválido.');}
 if(file?.format!=='GROW_NEO-followup')throw new Error('Este arquivo não é um acompanhamento do GROW_NEO.');
 if(file.formatVersion!==1)throw new Error('Versão de arquivo de acompanhamento não suportada.');
 return checkContent(file);
}
export function initFollowup(doc,{fenton,urls=globalThis.URL}){
 if(!fenton)return;
 const $=id=>doc.getElementById(id),status=$('followup-status'),link=$('followup-download'),input=$('followup-file');
 let url=null,revision=0;
 const invalidate=()=>{revision++;if(url)urls.revokeObjectURL(url);url=null;link.hidden=true;link.removeAttribute('href');status.textContent='';};
 for(const id of ['growth-form','fenton-form','fenton-assessment'])for(const type of ['input','change'])$(id).addEventListener(type,invalidate);
 $('fenton-add').addEventListener('click',invalidate);
 $('fenton-measures').addEventListener('click',event=>{if(event.target.closest('button'))invalidate();});
 $('followup-save').addEventListener('click',()=>{
  try{
   const growth=Object.fromEntries(Object.entries(growthFields).map(([key,id])=>[key,$(id).value]));
   const content=encodeFollowup({fenton:fenton.read(),growth,assessment:$('fenton-assessment').value});
   if(url)urls.revokeObjectURL(url);url=urls.createObjectURL(new Blob([content],{type:'application/json'}));
   link.href=url;link.download='GROW_NEO-acompanhamento.json';link.hidden=false;link.click();
   status.textContent='Arquivo pronto para salvar. Na próxima avaliação, abra o arquivo e acrescente as novas medidas.';
  }catch(error){status.textContent=error.message;}
 });
 input.addEventListener('change',async()=>{
  const file=input.files?.[0];if(!file)return;
  const ticket=++revision;status.textContent='Abrindo acompanhamento…';
  try{
   if(file.size>maxSize)throw new Error('Arquivo de acompanhamento muito grande.');
   const content=decodeFollowup(await file.text());
   if(ticket!==revision)throw new Error('Dados alterados durante a leitura. Abra novamente o arquivo.');
   fenton.restore(content.fenton);
   for(const [key,id] of Object.entries(growthFields)){
    const el=$(id);if(el.tagName==='SELECT'){for(const option of el.options)option.selected=false;Array.from(el.options).find(option=>option.value===content.growth[key]).selected=true;}else el.value=content.growth[key];
   }
   $('fenton-assessment').value=content.assessment;
   for(const id of ['growth-form','fenton-assessment'])$(id).dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));
   status.textContent=`Acompanhamento aberto: ${content.fenton.measurements.length} medida(s). Confira os dados e acrescente as novas medidas. Gere novamente o gráfico e o relatório.`;
  }catch(error){status.textContent=error.message;}
  finally{input.value='';}
 });
}
