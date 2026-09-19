import {initStandard} from './standard-ui.js';
import {calculate,parseNumber,round1,formatVolume,VERSION} from './engine.js';
import {createReport} from './pdf.js';
import {macroReference,formatAlertNumber} from './alerts.js';
import {initHydration} from './hydration-ui.js';
import {initEnteral} from './enteral-ui.js';
const $=id=>document.getElementById(id);
const f=n=>Number.isFinite(n)?round1(n).toFixed(1).replace('.',','):'—';
const osm=n=>Number.isFinite(n)?String(Math.round(n)):'—';
const weightFormat=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(n);
let result=null,pdfUrl=null,downloadResult=null,installPrompt=null,serviceRegistration=null;
const macros=[{id:'aa',name:'Aminoped 10%',unit:'g/kg/dia'},{id:'lip',name:'Lipídeos 20%',unit:'g/kg/dia'},{id:'vig',name:'Glicose 50% · VIG',unit:'mg/kg/min'}];
const salts=[{id:'na',name:'Sódio',unit:'mEq/kg/dia',options:[['nacl','Cloreto de sódio 10%'],['acetate','Acetato de sódio']]},{id:'k',name:'Potássio',unit:'mEq/kg/dia',salt:'Cloreto de potássio 10%'},{id:'ca',name:'Cálcio',unit:'mEq/kg/dia',salt:'Gluconato de cálcio 10%'},{id:'mg',name:'Magnésio',unit:'mEq/kg/dia',salt:'Sulfato de magnésio 10%'},{id:'p',name:'Fósforo',unit:'mmol/kg/dia',options:[['kphos','Fosfato de potássio'],['glycero','Glicerofosfato de sódio']]}];
const omitHTML=(id,name)=>`<label class="omit"><input id="omit-${id}" type="checkbox" data-omit="${id}" aria-label="Não ofertar ${name}">Não ofertar</label>`;
function doseHTML(d){return `<div class="dose" data-dose="${d.id}"><div class="dose-top"><label class="dose-name" for="${d.id}">${d.name}</label>${omitHTML(d.id,d.name)}</div><div class="dose-controls">${d.options?`<select id="salt-${d.id}" aria-label="Sal de ${d.name}">${d.options.map(([v,s])=>`<option value="${v}">${s}</option>`).join('')}</select>`:d.salt?`<p class="help">${d.salt}</p>`:''}<div class="input-box"><input id="${d.id}" type="text" inputmode="decimal" placeholder="0,0" aria-label="Dose de ${d.name}"><span class="unit">${d.unit}</span></div></div></div>`;}
$('macros').innerHTML=macros.map(doseHTML).join('');$('electrolytes').innerHTML=salts.map(doseHTML).join('');
for(const id of ['aa','lip','vig']){const help=document.createElement('p');help.className='help';help.id='reference-'+id;$(id).closest('.dose-controls').append(help);$(id).setAttribute('aria-describedby',help.id);}
$('reference-vig').textContent='VIG — velocidade de infusão de glicose, em mg/kg/min. Concentração final >20%: cautela, inclusive em acesso central.';
const micros=[{id:'va',name:'Polivit A Ped',rule:'2 mL/kg · máximo 5 mL',time:'A partir do 3º dia de vida'},{id:'vb',name:'Polivit B Ped',rule:'2 mL/kg · máximo 5 mL',time:'A partir do 3º dia de vida'},{id:'oligo',name:'Solução de oligoelementos',rule:'0,2 mL/kg/dia',time:'A partir do 8º dia de vida'},{id:'zn',name:'Sulfato de zinco',rule:'Dose conforme a idade gestacional',time:'Desconta o zinco já ofertado pelos oligoelementos'},{id:'se',name:'Selênio',rule:'Dose conforme a idade gestacional',time:'Desde o 1º dia de vida'}];
$('micros').innerHTML=micros.map(d=>`<div class="dose" data-dose="${d.id}"><div class="dose-top"><span class="dose-name">${d.name}</span>${omitHTML(d.id,d.name)}</div><div class="dose-controls"><span class="auto" id="rule-${d.id}">${d.rule}</span><p class="help" id="timing-${d.id}">${d.time}</p>${['zn','se'].includes(d.id)?`<div class="input-box"><input id="${d.id}Dose" inputmode="decimal" type="text" value="${d.id==='zn'?'400':'2'}" aria-label="Dose de ${d.id==='zn'?'zinco':'selênio'}"><span class="unit">mcg/kg/dia</span></div>`:''}</div></div>`).join('');
$('app-version').textContent=VERSION;
function updateRules(){
  const w=parseNumber($('weight').value),day=parseNumber($('day').value),ga=parseNumber($('ga').value);
  for(const id of ['aa','lip']){
    if(!Number.isFinite(w)||w<=0||!Number.isInteger(day)||day<1){$('reference-'+id).textContent='Informe peso e dia de vida para exibir a referência de dose.';continue;}
    const ref=macroReference(id,w,day);
    $('reference-'+id).textContent=`Referência ${ref.phase}: ${formatAlertNumber(ref.dose)} g/kg/dia. `+(ref.ceiling===null?'Progressão habitual: 3,0 g/kg/dia; teto máximo não definido para peso ≥1000 g.':`Teto: ${formatAlertNumber(ref.ceiling)} g/kg/dia${id==='aa'?' somente para peso <1000 g':''}; não é uma meta de oferta.`);
  }
  const preterm=Number.isFinite(ga)&&ga<37;
  $('rule-zn').textContent=Number.isFinite(ga)?(preterm?'Prematuro: escolha de 400 a 500 mcg/kg/dia':'Termo: 250 mcg/kg/dia'):'Dose conforme a idade gestacional';
  $('rule-se').textContent=Number.isFinite(ga)?(preterm?'Prematuro: 7 mcg/kg/dia':'Termo: escolha de 2 a 3 mcg/kg/dia'):'Dose conforme a idade gestacional';
  $('znDose').disabled=$('omit-zn').checked||!preterm;
  $('seDose').disabled=$('omit-se').checked||preterm;
  $('znDose').placeholder=preterm?'400 a 500':'250 (automático)';
  $('seDose').placeholder=preterm?'7 (automático)':'2 a 3';
  for(const id of ['va','vb'])$('timing-'+id).textContent=Number.isFinite(day)&&day<3?'Não será incluído antes do 3º dia de vida.':'A partir do 3º dia de vida';
  $('timing-oligo').textContent=Number.isFinite(day)&&day<8?'Não será incluído antes do 8º dia de vida.':'A partir do 8º dia de vida';
}
function invalidate(){result=null;downloadResult=null;$('calculated-result').hidden=true;$('empty-result').hidden=false;$('empty-result').textContent='Calcule novamente para conferir os parâmetros atuais.';$('pdf-download').hidden=true;$('pdf-status').textContent='';if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=null;}}
const tabNames=['parameters','results','hydration','standard','enteral','notes'];
function view(name){for(const tab of tabNames){$(tab).hidden=name!==tab;$('tab-'+tab).setAttribute('aria-selected',String(name===tab));$('tab-'+tab).tabIndex=name===tab?0:-1;}window.scrollTo({top:0,behavior:'instant'});}
for(const name of tabNames)$('tab-'+name).addEventListener('click',()=>view(name));
$('edit-parameters').addEventListener('click',()=>view('parameters'));
document.querySelectorAll('.tabs button').forEach((button,index)=>button.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const target=e.key==='Home'?0:e.key==='End'?tabNames.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabNames.length)%tabNames.length;view(tabNames[target]);$('tab-'+tabNames[target]).focus();}}));
for(const name of tabNames.slice(1))$('tab-'+name).tabIndex=-1;
document.querySelectorAll('[data-omit]').forEach(c=>c.addEventListener('change',()=>{const row=c.closest('[data-dose]');row.classList.toggle('disabled',c.checked);row.querySelectorAll('.dose-controls input,.dose-controls select').forEach(x=>x.disabled=c.checked);updateRules();}));
$('npp-form').addEventListener('input',()=>{invalidate();updateRules();});$('npp-form').addEventListener('change',()=>{invalidate();updateRules();});
function collect(){const input={};for(const id of ['weight','day','fluid','aa','lip','vig','na','k','ca','mg','p','znDose','seDose'])input[id]=$(id).value;input.gaWeeks=$('ga').value;input.gaDays=$('ga-days').value;input.access=document.querySelector('[name="access"]:checked')?.value;input.naSalt=$('salt-na').value;input.pSalt=$('salt-p').value;input.omit={};document.querySelectorAll('[data-omit]').forEach(c=>input.omit[c.dataset.omit]=c.checked);return input;}
function textElement(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;}
function summaryRow(label,value,highlight=false){const row=document.createElement('div');row.className='summary-row'+(highlight?' highlight':'');row.append(textElement('span',label),textElement('strong',value));return row;}
function render(r){
  $('empty-result').hidden=true;$('calculated-result').hidden=false;
  $('result-context').replaceChildren(...[`Peso: ${weightFormat(r.input.weight)} kg`,`Dia de vida: ${r.input.day}`,`IG: ${r.input.gaWeeks} sem + ${r.input.gaDays} d`,`Acesso: ${r.input.access==='central'?'central':'periférico'}`].map(t=>textElement('span',t)));
  const tbody=$('result-rows');tbody.replaceChildren();let group=0;
  for(const item of r.rows){if(item.group!==group&&item.group<3){const spacer=document.createElement('tr');spacer.className='spacer';spacer.setAttribute('aria-hidden','true');const cell=document.createElement('td');cell.colSpan=2;spacer.append(cell);tbody.append(spacer);}group=item.group;const tr=document.createElement('tr');tr.dataset.component=item.id;if(item.volume===0)tr.className='inactive';const name=textElement('td',item.name);name.append(textElement('span',item.id==='water'?'q.s.p. o volume total':`${f(item.quantity)} ${item.unit} · ${f(item.perKg)} ${item.perUnit}`));if(item.status)name.append(textElement('span',item.status));tr.append(name,textElement('td',item.volume===null?'Rever':formatVolume(item.volume,item.id)));tbody.append(tr);}
  const t=r.totals;$('result-summary').replaceChildren(
    summaryRow('Volume total',f(t.totalVolume)+' mL'),summaryRow('Vazão · 24 h',f(t.infusion)+' mL/h'),summaryRow('Taxa hídrica',f(t.fluid)+' mL/kg/dia'),summaryRow('Taxa calórica',f(t.calories)+' kcal/kg/dia'),summaryRow('Concentração de glicose',f(t.glucosePercent)+'%',r.requiresCentral),summaryRow('Osmolaridade estimada',osm(t.osmolarity)+' mOsm/L',r.input.access==='peripheral'&&t.osmolarity>900),summaryRow('Proteína / calorias não proteicas',t.proteinRatio===null?'Não calculável':'1 : '+f(t.proteinRatio)),summaryRow('Relação Ca/P (mmol/mmol)',r.effective.p>0?f((r.effective.ca/2)/r.effective.p)+' : 1':'Não calculável (P = 0)')
  );
  $('result-alerts').replaceChildren();
  if(r.notices.length){const note=textElement('div',r.notices.join(' '),'notice');$('result-alerts').append(note);}
  for(const alert of r.alerts){const note=textElement('div',alert.message,'notice clinical-alert '+(alert.level==='info'?'info':alert.level==='high'?'danger':'caution'));note.dataset.alertId=alert.id;note.dataset.level=alert.level;$('result-alerts').append(note);}
  for(const block of r.blocks.filter(b=>!b.startsWith('Concentração de glicose')))$('result-alerts').append(textElement('div',block,'notice danger'));
  $('access-alert').hidden=!r.requiresCentral;
  if(r.requiresCentral)$('access-alert').textContent=r.accessBlocked?'Concentração de glicose acima de 12,5%. É obrigatório acesso central. Revise o acesso ou os parâmetros.':'Concentração de glicose acima de 12,5%: acesso central obrigatório. Acesso central selecionado.';
  const offers=document.createElement('details');offers.className='section offers';offers.innerHTML='<summary>Conferir doses solicitadas e efetivas <span aria-hidden="true">⌄</span></summary><table><thead><tr><th>Nutriente</th><th>Solicitada</th><th>Efetiva</th></tr></thead><tbody></tbody></table>';
  for(const o of r.offers){const tr=document.createElement('tr'),td=textElement('td',o.name);td.append(textElement('span',o.unit));tr.append(td,textElement('td',f(o.requested)),textElement('td',f(o.actual)));offers.querySelector('tbody').append(tr);}
  $('result-alerts').append(offers);
  if(r.rounding.length)$('result-alerts').append(textElement('p','Há volumes arredondados; confira as doses efetivas.','infusion-note'));
  if(Math.abs(t.infusion-t.infusionExact)>1e-9)$('result-alerts').append(textElement('p','A vazão é exibida com uma casa decimal. Vazão × 24 h pode diferir ligeiramente do volume total; confira a programação da infusão.','infusion-note'));
  $('acknowledgements').replaceChildren();
  for(const a of r.adjustments){const note=document.createElement('div');note.className='notice';note.append(textElement('p',`${a.name}: dose solicitada ${f(a.requested)} ${a.unit}; dose resultante ${f(a.actual)} ${a.unit}, já fornecida por ${a.source}. O sal complementar não foi acrescentado.`));const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.dataset.ack=a.id;check.addEventListener('change',updateExport);label.append(check,textElement('span',`Conferi e aceito a dose resultante de ${a.name.toLowerCase()}.`));note.append(label);$('acknowledgements').append(note);}
  updateExport();
}
function updateExport(){const accepted=[...document.querySelectorAll('[data-ack]')].every(x=>x.checked);$('export-pdf').disabled=!result?.canExport||!accepted;}
$('npp-form').addEventListener('submit',e=>{e.preventDefault();$('form-errors').hidden=true;document.querySelectorAll('.invalid').forEach(x=>x.classList.remove('invalid'));const r=calculate(collect());if(!r.ok){invalidate();const list=document.createElement('ul');for(const err of r.errors){list.append(textElement('li',err.message));const id={gaWeeks:'ga',gaDays:'ga-days',naSalt:'salt-na',pSalt:'salt-p'}[err.field]||err.field;const el=$(id);if(el){el.closest('.field,.dose')?.classList.add('invalid');const details=el.closest('details');if(details)details.open=true;}}$('form-errors').replaceChildren(list);$('form-errors').hidden=false;$('form-errors').scrollIntoView({block:'center'});return;}result=r;render(r);view('results');});
$('export-pdf').addEventListener('click',async()=>{
  if(!result?.canExport||[...document.querySelectorAll('[data-ack]')].some(x=>!x.checked))return;
  const snapshot=result;$('export-pdf').disabled=true;$('pdf-status').textContent='Preparando PDF no aparelho…';
  try{const bytes=await createReport(snapshot);if(result!==snapshot)return;const blob=new Blob([bytes],{type:'application/pdf'});if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(blob);downloadResult=snapshot;const link=$('pdf-download');link.href=pdfUrl;link.download='NP_NEO-calculo.pdf';link.hidden=false;link.click();$('pdf-status').textContent='PDF gerado. Se o download não iniciar, use o link abaixo.';}catch(error){console.error('PDF generation failed');$('pdf-status').textContent='Não foi possível gerar o PDF. Aguarde o carregamento completo do app e tente novamente.';}finally{updateExport();}
});
$('pdf-download').addEventListener('click',e=>{if(!result||result!==downloadResult)e.preventDefault();});
$('install-help-button').addEventListener('click',()=>{$('install-help').hidden=!$('install-help').hidden;});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install-app').hidden=false;});
$('install-app').addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('install-app').hidden=true;}});
window.addEventListener('appinstalled',()=>{$('install-app').hidden=true;});
async function checkOffline(){const controller=navigator.serviceWorker.controller;if(!controller)return;const channel=new MessageChannel();channel.port1.onmessage=e=>{$('offline-status').textContent=e.data.ready?(navigator.onLine?'Pronto para usar offline':'Você está offline · cálculos e PDF disponíveis'):'Uso offline ainda não preparado.';};controller.postMessage({type:'CHECK_OFFLINE'},[channel.port2]);}
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{serviceRegistration=reg;if(reg.waiting)$('update-app').hidden=false;reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)$('update-app').hidden=false;});});return navigator.serviceWorker.ready;}).then(checkOffline).catch(()=>{$('offline-status').textContent='Não foi possível preparar o modo offline. Reabra o link com internet.';});navigator.serviceWorker.addEventListener('controllerchange',checkOffline);}else{$('offline-status').textContent='Este navegador não oferece instalação offline.';}
window.addEventListener('online',checkOffline);window.addEventListener('offline',checkOffline);
$('update-app').addEventListener('click',()=>{if(!confirm('Reiniciar para atualizar? Os parâmetros atuais serão descartados.'))return;navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});serviceRegistration?.waiting?.postMessage({type:'ACTIVATE_UPDATE'});});
const hydrationUI=initHydration(document);
initEnteral(()=>result?.ok?{fluid:result.totals.fluid,calories:result.totals.calories,protein:result.effective.aa}:{});
window.addEventListener('pageshow',e=>{if(e.persisted){$('npp-form').reset();invalidate();updateRules();hydrationUI.reset();}});
updateRules();

initStandard(document);
