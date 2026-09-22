import {calculateGrowth} from './growth.js';
const fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d).replace('.',','):'—';
const pma=n=>{const days=Math.round(n*7);return `${Math.floor(days/7)} sem + ${days%7} d`;};
export function initGrowth(doc){
 let last=null;const $=id=>doc.getElementById(id);
 const invalidate=()=>{last=null;$('gr-result').hidden=true;};
 for(const event of ['input','change'])$('growth-form').addEventListener(event,invalidate);
 $('growth-form').addEventListener('submit',event=>{
  event.preventDefault();
  const r=calculateGrowth({sex:$('gr-sex').value,birthWeight:$('gr-birth-weight').value,gaWeeks:$('gr-ga-weeks').value,gaDays:$('gr-ga-days').value,initialDay:$('gr-initial-day').value,initialWeight:$('gr-initial-weight').value,finalDay:$('gr-final-day').value,finalWeight:$('gr-final-weight').value});
  $('gr-errors').hidden=r.ok;
  if(!r.ok){$('gr-errors').textContent=r.errors.map(e=>e.message).join(' ');return;}
  last=r;
  $('gr-context').innerHTML=`<span>${r.input.sex==='female'?'Feminino':'Masculino'}</span><span>Intervalo: ${r.intervalDays} dias</span><span>IPM média: ${pma(r.midpointPmaWeeks)}</span>`;
  $('gr-summary').innerHTML=`<div class="summary-row"><span>Ganho no período</span><strong>${fmt(r.totalGain,0)} g</strong></div><div class="summary-row"><span>Ganho diário</span><strong>${fmt(r.gramsPerDay)} g/dia</strong></div><div class="summary-row highlight"><span>Velocidade pelo peso médio</span><strong>${fmt(r.gramsPerKgDay)} g/kg/dia</strong></div><div class="summary-row"><span>Peso médio do período</span><strong>${fmt(r.averageWeight,0)} g</strong></div>`;
  $('gr-notices').replaceChildren();
  const note=(text,cls='notice')=>{const e=doc.createElement('div');e.className=cls;e.textContent=text;$('gr-notices').append(e);};
  if(!r.birthWeightRecovered)note('O paciente ainda não está na fase de crescimento propriamente dita, pois ainda não recuperou o peso de nascimento.','notice caution');
  if(r.shortInterval)note('Intervalo inferior a 5 dias: o resultado é mais suscetível a variações hídricas e de pesagem.','notice caution');
  if(r.reference){
   const comparison=r.birthWeightRecovered?` A velocidade calculada corresponde a ${fmt(r.percentOfReference,0)}% desse valor.`:'';
   note(`Referência Fenton 2025 para ${r.input.sex==='female'?'meninas':'meninos'}, ${r.reference.startWeek}–${r.reference.endWeek} semanas: P50 ${fmt(r.reference.gramsPerKgDay)} g/kg/dia.${comparison}`,'notice info');
  }else note('A idade pós-menstrual média está fora da faixa de 22 a 49 semanas da referência Fenton 2025.','notice info');
  $('gr-result').hidden=false;
 });
 return {invalidate,getResult:()=>last};
}
