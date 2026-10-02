import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import vm from 'node:vm';
import {calculate} from '../engine.js';
import {calculateHydration,formatHydrationVolume} from '../hydration.js';
import {calculateStandard,formatStandardVolume} from '../standard.js';
import {calculateEnteral,compositionFor,intravenousFromResult,integrateNutrition,assessTransition} from '../enteral.js';
import {initEnteral} from '../enteral-ui.js';
import {createHydrationReport} from '../hydration-pdf.js';
import {createEnteralReport} from '../enteral-pdf.js';
const near=(a,b,t=1e-8)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=t,`${a} versus ${b}`);
const npInput={day:8,weight:1,birthWeight:1,gaWeeks:28,gaDays:0,fluidPhase:'stable',fluid:60,aa:2,lip:1,vig:3,na:0,k:0,ca:0,mg:0,p:0,access:'central',naSalt:'nacl',pSalt:'glycero',znDose:400,seDose:7,omit:{va:true,vb:true,oligo:true,zn:true,se:true}};
const hvInput={day:8,weight:1,birthWeight:1,fluid:40,vig:2,na:0,k:0,ca:0,mg:0,access:'central',doseUnit:'perKgDay',concentrations:{na:1.7,k:1.34,ca:.5,mg:.8}};
const en=calculateEnteral({type:'lhop',rate:50});
for(const invalid of [NaN,Infinity,-Infinity,'NaN','Infinity','abc','1e309'])test(`audit D1: core rejects explicit invalid composition ${invalid}`,()=>{
 assert.throws(()=>compositionFor({type:'lhop',analyzedEnergy:invalid,analyzedProtein:invalid}),/inválida/);
 assert.throws(()=>compositionFor({type:'lhop',analyzedEnergy:65,analyzedProtein:invalid}),/inválida/);
 assert.throws(()=>compositionFor({type:'lhop',fm85GramsPer100mL:invalid}),/inválida/);
});
test('audit D1: missing pair uses estimate, incomplete pair rejects, negative pair remains a warned zero',()=>{
 for(const fields of [{},{analyzedEnergy:'',analyzedProtein:''},{analyzedEnergy:null,analyzedProtein:null}])assert.equal(compositionFor({type:'lhop',...fields}).energy,65);
 assert.throws(()=>compositionFor({type:'lhop',analyzedEnergy:65}),/informe energia e proteína/);
 const r=compositionFor({type:'lhop',analyzedEnergy:-5,analyzedProtein:-1});assert.equal(r.energy,0);assert.equal(r.protein,0);assert.ok(r.energyValidation&&r.proteinValidation);
});
for(const invalid of ['NaN','Infinity','-Infinity','abc','1e309'])test(`audit D1: UI does not silently estimate ${invalid}`,()=>{
 const {document,window}=parseHTML(readFileSync(new URL('../index.html',import.meta.url),'utf8'));const el=id=>document.getElementById(id);
 const ui=initEnteral(document,()=>({}));for(const [id,val]of [['en-source','none'],['en-type','lhop'],['en-fm85','0']])el(id).querySelector(`[value="${val}"]`).selected=true;
 el('en-rate').value='100';el('en-energy').value=invalid;el('en-protein').value=invalid;
 el('enteral-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(ui.getResult(),null);assert.equal(el('en-errors').hidden,false);assert.match(el('en-errors').textContent,/número finito/);assert.equal(el('en-result').hidden,true);
});
test('audit D2: small and ordinary displayed volumes conserve dose and mass',()=>{
 const r=calculateHydration({...hvInput,fluid:100,vig:4,na:.001});
 const read=v=>Number(formatHydrationVolume(v).replace(',','.'));
 near(read(r.rows[0].volume)*1.7,.001,1e-12);assert.notEqual(formatHydrationVolume(r.rows[0].volume),'0,1');
 near(r.rows.reduce((a,x)=>a+read(x.volume),0)+read(r.mixture.sg5)+read(r.mixture.sg50),100);
 near(read(r.mixture.sg5)*.05+read(r.mixture.sg50)*.5,5.76);
 for(const v of [1e-15,1e-9,.000001,.049999,.05,.099999,.1,.100001,1.21,1/3,5000.09999])near(read(v),v,Math.max(1e-15,Math.abs(v)*1e-10));
 assert.equal(formatStandardVolume(1.21),'1,3');
});
test('three sources: NP + HV + enteral, with no double count',()=>{
 const iv=intravenousFromResult('individual_hydration',{np:calculate(npInput),hv:calculateHydration(hvInput)}),all=integrateNutrition({source:'individual_hydration',parenteral:iv,enteral:en});
 near(all.total.fluid,150);near(all.total.calories,78.22);near(all.total.protein,2.6);near(all.intravenousComponents.np.calories,34.2);near(all.intravenousComponents.hv.calories,11.52);
 const active=integrateNutrition({source:'individual_hydration',parenteral:iv,enteral:calculateEnteral({type:'lhop',rate:60})});assert.equal(assessTransition(active).active,true);
});
test('three sources: Numeta 2:1 + HV + enteral retains lipid exclusion',()=>{
 const np=calculateStandard({day:8,weight:1,birthWeight:1,mode:'fluid',value:60,access:'central',formulation:'2in1'});
 const all=integrateNutrition({source:'standard_hydration',parenteral:intravenousFromResult('standard_hydration',{np,hv:calculateHydration(hvInput)}),enteral:en});
 near(all.total.fluid,150);near(all.total.calories,93.52);near(all.total.protein,2.95);assert.match(all.sourceLabel,/2:1.*HV/);
});
test('three sources: each source must be valid, matched and reviewed',()=>{
 const np=calculate(npInput);
 for(const hv of [null,calculateHydration({...hvInput,day:7}),calculateHydration({...hvInput,weight:1.1}),calculateHydration({...hvInput,vig:.5,allowWfiReview:true}),calculateHydration({...hvInput,fluid:10,vig:4,access:'peripheral'})])assert.throws(()=>intravenousFromResult('individual_hydration',{np,hv}));
 assert.throws(()=>intravenousFromResult('individual_hydration',{np:calculate({...npInput,vig:13}),hv:calculateHydration(hvInput)}));
 const reviewed=calculateHydration({...hvInput,vig:.5,allowWfiReview:true,wfiClinicalReviewAcknowledged:true});assert.ok(intravenousFromResult('individual_hydration',{np,hv:reviewed}));
 assert.throws(()=>integrateNutrition({source:'individual_hydration',parenteral:{},enteral:en}),/NP e HV/);
});
vm.runInThisContext(readFileSync(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));
globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>readFileSync(new URL('../assets/uea-logo.png',import.meta.url))});
test('audit PDF: records true tiny HV volume and separates all three nutritional sources',async()=>{
 const lines=[],original=PDFLib.PDFPage.prototype.drawText;PDFLib.PDFPage.prototype.drawText=function(t,o){lines.push(String(t));return original.call(this,t,o);};
 try{
  await createHydrationReport(calculateHydration({...hvInput,fluid:100,vig:4,na:.001}));const shown=lines.find(x=>x.startsWith('0,000588'));assert.ok(shown);near(Number(shown.replace(',','.'))*1.7,.001,1e-12);
  lines.length=0;const integrated=integrateNutrition({source:'individual_hydration',parenteral:intravenousFromResult('individual_hydration',{np:calculate(npInput),hv:calculateHydration(hvInput)}),enteral:en});
  await createEnteralReport({enteral:en,integrated});for(const text of ['NP','HV','Enteral','Total','60,0','40,0','50,0','150,0','78,2','2,60'])assert.ok(lines.includes(text),text);
 }finally{PDFLib.PDFPage.prototype.drawText=original;}
});
