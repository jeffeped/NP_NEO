import test from 'node:test';import assert from 'node:assert/strict';import {parseHTML} from 'linkedom';import {readFileSync} from 'node:fs';
const html=()=>readFileSync(new URL('../index.html',import.meta.url),'utf8');
const chart=()=>({data:{sex:'F',birthGaWeeks:25,birthGaDays:0,measurements:[{weeks:25,days:0,weightGrams:1000},{weeks:26,days:0,weightGrams:1100}]},scores:[{weeks:25,days:0,weight:{value:1000,z:.2,percentile:60}},{weeks:26,days:0,weight:{value:1100,z:-1.9,percentile:3}}]});
async function setup(request){const {initFentonOutlook}=await import('../fenton-outlook-ui.js');const {document,window}=parseHTML(html());let state=chart(),notify;let made=0;const revoked=[];const api={getChart:()=>state,subscribe:fn=>notify=fn,requestProjections:request};initFentonOutlook(document,{fenton:api,urls:{createObjectURL:()=>{made++;return 'blob:projection';},revokeObjectURL:u=>revoked.push(u)}});return {document,window,notify,setChart:s=>state=s,made:()=>made,revoked,$:id=>document.getElementById(id)};}
test('alerta >2Z descreve risco e orientação, sem alterar medidas reais',async()=>{
 const a=await setup(async()=>{});assert.equal(a.$('fenton-risk').hidden,false);assert.match(a.$('fenton-risk').textContent,/RCEU/);assert.match(a.$('fenton-risk').textContent,/especialista/);assert.match(a.$('fenton-risk').textContent,/2,10/);assert.equal(a.$('fenton-projection-run').disabled,false);
});
test('consulta projeta2pesos, mostra Z/P separados e não substitui gráfico real',async()=>{
 let sent;const a=await setup(async data=>{sent=data;return {blob:new Blob(['jpeg']),scores:data.measurements.map(m=>({weeks:m.weeks,days:m.days,weight:{value:m.weightGrams,z:-1,percentile:16}}))};});
 a.$('fenton-projection-run').click();await new Promise(r=>setImmediate(r));assert.equal(sent.measurements.length,2);assert.deepEqual(sent.measurements.map(m=>m.weeks),[28,30]);assert.equal(a.$('fenton-projection-result').hidden,false);assert.match(a.$('fenton-projection-rows').textContent,/-1,00/);assert.match(a.$('fenton-projection-status').textContent,/hipotética/);assert.equal(a.made(),1);
});
test('edição durante consulta descarta projeção obsoleta e libera nova consulta',async()=>{
 let complete;const a=await setup(data=>new Promise(r=>complete=()=>r({blob:new Blob(['jpeg']),scores:data.measurements.map(m=>({weeks:m.weeks,days:m.days,weight:{value:m.weightGrams,z:-1,percentile:16}}))})));
 a.$('fenton-projection-run').click();a.setChart(null);a.notify();complete();await new Promise(r=>setImmediate(r));assert.equal(a.made(),0);assert.equal(a.$('fenton-projection-result').hidden,true);assert.equal(a.$('fenton-risk').hidden,true);
});
test('novo gráfico permite recomeçar antes da resposta antiga; finally antigo não libera consulta nova',async()=>{
 const complete=[];
 const a=await setup(data=>new Promise(resolve=>{
  complete.push(()=>resolve({blob:new Blob(['jpeg']),scores:data.measurements.map(m=>({weeks:m.weeks,days:m.days,weight:{value:m.weightGrams,z:-1,percentile:16}}))}));
 }));
 a.$('fenton-projection-run').click();a.setChart(chart());a.notify();assert.equal(a.$('fenton-projection-run').disabled,false);a.$('fenton-projection-run').click();assert.equal(complete.length,2);
 complete[0]();await new Promise(r=>setImmediate(r));assert.equal(a.$('fenton-projection-run').disabled,true);assert.equal(a.made(),0);
 complete[1]();await new Promise(r=>setImmediate(r));assert.equal(a.made(),1);assert.equal(a.$('fenton-projection-result').hidden,false);
});
