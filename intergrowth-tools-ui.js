import {analyzeIntergrowthTrend,projectIntergrowth,encodeIntergrowthFollowup,decodeIntergrowthFollowup,intergrowthCsv} from './intergrowth-followup.js';
import {createIntergrowthChart} from './intergrowth-charts.js';
import {weightReadingText,renderGrowthReading} from './growth-reading.js';
const fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d).replace('.',','):'—';
export function initIntergrowthTools(doc,{intergrowth,urls=globalThis.URL}){
 const $=id=>doc.getElementById(id),status=$('ig-followup-status'),link=$('ig-followup-download'),file=$('ig-followup-file');
 let url=null,csvUrl=null,revision=0;
 const text=(tag,value)=>{const el=doc.createElement(tag);el.textContent=value;return el;};
 const invalidate=()=>{
  revision++;if(url)urls.revokeObjectURL(url);url=null;link.hidden=true;link.removeAttribute('href');status.textContent='';
  if(csvUrl)urls.revokeObjectURL(csvUrl);csvUrl=null;$('ig-csv-download').hidden=true;$('ig-csv-download').removeAttribute('href');$('ig-csv-export').disabled=!intergrowth.getResult();
  $('ig-projection-result').hidden=true;$('ig-projection-rows').replaceChildren();$('ig-projection-chart').replaceChildren();$('ig-projection-status').textContent='';
  const result=intergrowth.getResult();let birth=null;try{birth=intergrowth.readBirth();}catch{}
  const trend=analyzeIntergrowthTrend(result,birth),risk=$('ig-risk');risk.hidden=!trend.risk;
  const rows=result?.measurements??[],reading=weightReadingText(trend,{reference:'INTERGROWTH-21st pós-natal',birthPmaDays:birth,lastWeightPmaDays:rows.findLast(m=>Number.isFinite(m.weight))?.pmaDays});
  risk.textContent=reading.message;$('ig-risk-context').textContent=reading.context;
  renderGrowthReading(doc,'ig-reading-notices',rows,birth);
  $('ig-projection-run').disabled=!result;
 };
 intergrowth.subscribe(invalidate);for(const type of ['input','change'])$('ig-assessment').addEventListener(type,invalidate);invalidate();
 $('ig-csv-export').addEventListener('click',()=>{
  if(!intergrowth.getResult())return;const csv=intergrowthCsv(intergrowth.getResult());if(csvUrl)urls.revokeObjectURL(csvUrl);csvUrl=urls.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const download=$('ig-csv-download');download.href=csvUrl;download.download='GROW_NEO-INTERGROWTH-escores-z.csv';download.hidden=false;download.click();
 });
 $('ig-projection-run').addEventListener('click',()=>{
  $('ig-projection-result').hidden=true;$('ig-projection-rows').replaceChildren();$('ig-projection-chart').replaceChildren();
  try{
   const result=intergrowth.getResult(),projection=projectIntergrowth(result);
   for(const p of projection.points){const row=doc.createElement('tr');for(const cell of [`+${p.daysAhead} dias`,`${p.weeks}+${p.days}`,fmt(p.weight,0),fmt(p.z,2),p.percentile==null?'—':p.percentile<.1?'<0,1':p.percentile>99.9?'>99,9':fmt(p.percentile),p.inRange?'Hipotético':'Fora da faixa INTERGROWTH'])row.append(text('td',cell));$('ig-projection-rows').append(row);}
   $('ig-projection-context').textContent=`VC das duas últimas pesagens: ${fmt(projection.velocity)} g/kg/dia, em ${projection.intervalDays} dias. Peso de partida: ${fmt(projection.currentWeight,0)} g na IPM ${projection.currentWeeks}+${projection.currentDays}.`;
   const current=result.measurements.findLast(m=>m.weight!=null),valid=projection.points.filter(p=>p.inRange);
   if(valid.length){
    const svg=createIntergrowthChart(doc,{sex:result.sex,metric:'weight',measurements:[current,...valid]});
    svg.querySelector('[data-series="measurements"]')?.setAttribute('stroke-dasharray','6 4');
    for(const mark of svg.querySelectorAll('[data-measurement]'))if(mark.getAttribute('data-measurement')!=='1'){mark.setAttribute('fill','#ffffff');mark.setAttribute('stroke','#a14b12');}
    svg.querySelector('desc').textContent='Simulação hipotética. Ponto 1: última pesagem real; pontos 2 e 3: projeções de 14 e 28 dias quando dentro da faixa.';
    $('ig-projection-chart').append(svg);
   }
   $('ig-projection-result').hidden=false;$('ig-projection-status').textContent='Simulação hipotética de crescimento proporcional constante, sem prognóstico validado. Ponto 1: última pesagem real; demais pontos vazados: projeções. Projeções não entram nas medidas, no arquivo ou no PDF integrado.';
  }catch(error){$('ig-projection-status').textContent=error.message;}
 });
 $('ig-followup-save').addEventListener('click',()=>{
  try{const content=encodeIntergrowthFollowup(intergrowth.readFollowup());if(url)urls.revokeObjectURL(url);url=urls.createObjectURL(new Blob([content],{type:'application/json'}));link.href=url;link.download='GROW_NEO-acompanhamento-INTERGROWTH.json';link.hidden=false;link.click();status.textContent='Arquivo pronto para salvar. Salve novamente após acrescentar medidas ou alterar o relato.';}catch(error){status.textContent=error.message;}
 });
 file.addEventListener('change',async()=>{
  const selected=file.files?.[0];if(!selected)return;const ticket=++revision;status.textContent='Abrindo acompanhamento…';
  try{if(selected.size>1024*1024)throw new Error('Arquivo de acompanhamento muito grande.');const content=decodeIntergrowthFollowup(await selected.text());if(ticket!==revision)throw new Error('Dados alterados durante a leitura. Abra novamente o arquivo.');intergrowth.restore(content);status.textContent=`Acompanhamento aberto: ${content.input.measurements.length} medida(s). Confira e gere novamente as curvas e o relatório.`;}catch(error){status.textContent=error.message;}finally{file.value='';}
 });
 return {invalidate};
}
