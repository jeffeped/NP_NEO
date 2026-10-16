import {analyzeWeightTrend,makeWeightProjections} from './fenton-outlook.js';
import {fentonReadingRows,weightReadingText,renderGrowthReading} from './growth-reading.js';
const fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d).replace('.',','):'—';
export function initFentonOutlook(doc,{fenton,urls=globalThis.URL}){
 if(!fenton)return;
 const $=id=>doc.getElementById(id),button=$('fenton-projection-run'),status=$('fenton-projection-status'),result=$('fenton-projection-result'),figure=$('fenton-projection-figure'),image=$('fenton-projection-chart');
 let revision=0,url=null,busy=false,activeTicket=null;
 const clear=()=>{revision++;activeTicket=null;busy=false;if(url)urls.revokeObjectURL(url);url=null;image.removeAttribute('src');figure.hidden=true;result.hidden=true;$('fenton-projection-rows').replaceChildren();status.textContent='';};
 const text=(tag,value)=>{const el=doc.createElement(tag);el.textContent=value;return el;};
 const refresh=()=>{
  clear();const chart=fenton.getChart(),trend=analyzeWeightTrend(chart),risk=$('fenton-risk');
  risk.hidden=!trend.risk;
  const rows=fentonReadingRows(chart),birth=chart?.data?chart.data.birthGaWeeks*7+chart.data.birthGaDays:null;
  const reading=weightReadingText(trend,{reference:'Fenton 2025',birthPmaDays:birth,lastWeightPmaDays:rows.findLast(m=>Number.isFinite(m.weight))?.pmaDays});
  risk.textContent=reading.message;$('fenton-risk-context').textContent=reading.context;
  renderGrowthReading(doc,'fenton-reading-notices',rows,birth);
  button.disabled=!chart?.scores||busy;
 };
 fenton.subscribe(refresh);refresh();
 button.addEventListener('click',async()=>{
  if(busy)return;
  clear();const snapshot=fenton.getChart(),ticket=revision;activeTicket=ticket;busy=true;button.disabled=true;
  try{
   if(!snapshot?.scores)throw new Error('Gere o gráfico e os escores das medidas atuais antes de simular.');
   const projection=makeWeightProjections(snapshot.data.measurements),valid=projection.points.filter(p=>p.inRange);
   const data={sex:snapshot.data.sex,birthGaWeeks:snapshot.data.birthGaWeeks,birthGaDays:snapshot.data.birthGaDays,measurements:valid.map(p=>({weeks:p.weeks,days:p.days,weightGrams:Math.round(p.weightGrams)}))};
   status.textContent=valid.length?'Consultando a posição hipotética na curva Fenton…':'Conferindo os limites da curva…';
   const answer=valid.length?await fenton.requestProjections(data):null;
   if(ticket!==revision||snapshot!==fenton.getChart())return;
   if(answer&&(!Array.isArray(answer.scores)||answer.scores.length!==valid.length))throw new Error('Escores da projeção indisponíveis; tente novamente.');
   for(const point of projection.points){
    const i=valid.indexOf(point),score=i>=0?answer?.scores[i]:null;
    if(score&&(score.weeks!==point.weeks||score.days!==point.days||!Number.isFinite(score.weight?.z)||Math.abs(score.weight?.value-Math.round(point.weightGrams))>.5))throw new Error('Os escores não correspondem aos pesos projetados; tente novamente.');
    const row=doc.createElement('tr');
    for(const cell of [`+${point.daysAhead} dias`,`${point.weeks}+${point.days}`,point.weightGrams==null?'Indisponível':fmt(point.weightGrams,0),score?fmt(score.weight.z,2):'—',score?(typeof score.weight.percentile==='string'?score.weight.percentile:fmt(score.weight.percentile)):'—',point.inRange?'Hipotético':'Fora da faixa Fenton'])row.append(text('td',cell));
    $('fenton-projection-rows').append(row);
   }
   $('fenton-projection-context').textContent=`VC das duas últimas pesagens: ${fmt(projection.velocity)} g/kg/dia, em ${projection.intervalDays} dias. Peso de partida: ${fmt(projection.currentWeight,0)} g na IPM ${projection.currentWeeks}+${projection.currentDays}.`;
   result.hidden=false;
   if(answer?.blob){url=urls.createObjectURL(answer.blob);image.src=url;figure.hidden=false;}
   status.textContent='Simulação hipotética de crescimento proporcional constante. Mudanças clínicas, no aporte ou nas perdas não são previstas. Pontos projetados não são medidas reais e não foram acrescentados ao acompanhamento ou ao PDF integrado.';
  }catch(error){if(ticket===revision&&snapshot===fenton.getChart()){result.hidden=true;$('fenton-projection-rows').replaceChildren();status.textContent=error.message;}}
  finally{if(activeTicket===ticket){activeTicket=null;busy=false;button.disabled=!fenton.getChart()?.scores;}}
 });
}
