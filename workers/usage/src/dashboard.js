export const DASHBOARD_HTML=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Uso diário — GROW_NEO</title>
<style>body{font:16px system-ui;color:#173c32;background:#f4f8f6;margin:0;padding:24px}main{max-width:1100px;margin:auto}h1{font-size:28px}form,.card{background:white;padding:20px;border-radius:12px;margin:16px 0}input,select,button{font:inherit;padding:10px;border-radius:6px;border:1px solid #78998b}button{background:#08764f;color:white;cursor:pointer}label{display:inline-block;margin:6px 12px 6px 0}input{max-width:85vw}table{width:100%;border-collapse:collapse;background:white}th,td{text-align:right;padding:12px;border-bottom:1px solid #dde7e2}th:first-child,td:first-child{text-align:left}.scroll{overflow-x:auto}p{line-height:1.5}.subtle{color:#50695e}.summary{display:flex;gap:16px;flex-wrap:wrap}.summary strong{font-size:28px;display:block}#status{min-height:24px}[hidden]{display:none!important}</style>
</head><body><main><h1>GROW_NEO · uso diário</h1><p class="subtle">Dia civil de Manaus (UTC−4). Dados disponíveis após ativação da coleta.</p>
<form id="login" autocomplete="off"><label>Chave privada <input id="token" type="password" minlength="32" maxlength="256" required autocomplete="off" spellcheck="false"></label><button type="submit">Acessar estatísticas</button></form>
<section id="report" hidden><div class="card"><label>Período <select id="period"><option value="7">7 dias</option><option value="30" selected>30 dias</option><option value="90">90 dias</option></select></label><button id="refresh" type="button">Atualizar</button> <button id="csv" type="button">Baixar CSV</button> <button id="logout" type="button">Sair</button></div>
<div class="summary"><div class="card">Ativos hoje<strong id="today-active">0</strong></div><div class="card">Média diária no período<strong id="average">0</strong></div><div class="card">Aberturas no período<strong id="total-opens">0</strong></div></div>
<div class="scroll"><table><thead><tr><th>Data</th><th>Visitantes</th><th>Ativos</th><th>Aberturas</th><th>Ações</th></tr></thead><tbody id="daily"></tbody></table></div>
<h2>Funções utilizadas no período</h2><div class="scroll"><table><thead><tr><th>Função</th><th>Ações solicitadas</th></tr></thead><tbody id="features"></tbody></table></div>
<p class="subtle">Ativo = navegador que solicitou cálculo, gráfico, simulação ou relatório. Solicitações podem não ter sido concluídas. Visitantes incluem quem apenas abriu o app. Aberturas são carregamentos, incluindo recargas. Uma pessoa pode usar vários dispositivos; um dispositivo pode ser compartilhado.</p>
<p class="subtle">Os dados cobrem apenas versões atualizadas com estatísticas ativadas. Uso offline pode chegar com até 7 dias de atraso; bloqueadores, preferências, falhas de conexão e limites podem reduzir as contagens. Zero registros não comprova ausência de uso. Não são contados pacientes nem desfechos clínicos. Retenção: 90 dias.</p></section><p id="status" role="status" aria-live="polite"></p></main><script src="/dashboard.js" defer></script></body></html>`;

export const DASHBOARD_SCRIPT=`'use strict';
const $=id=>document.getElementById(id),labels={np_ind:'NP individualizada',np_padrao:'NP padrão',hv:'Hidratação venosa',enteral:'Enteral',fenton:'GROW_Fenton',intergrowth:'INTERGROWTH'};
let key='',rows=[],revision=0;
const cell=(tag,value)=>{const e=document.createElement(tag);e.textContent=String(value);return e;};
function render(){
 $('daily').replaceChildren();$('features').replaceChildren();
 for(const r of [...rows].reverse()){const tr=document.createElement('tr');tr.append(...[r.day.split('-').reverse().join('/'),r.visitors,r.active,r.opens,r.actions].map(v=>cell('td',v)));$('daily').append(tr);}
 for(const [id,label] of Object.entries(labels)){const tr=document.createElement('tr');tr.append(cell('td',label),cell('td',rows.reduce((n,r)=>n+(r.features[id]||0),0)));$('features').append(tr);}
 $('today-active').textContent=rows.at(-1)?.active??0;$('average').textContent=(rows.reduce((n,r)=>n+r.active,0)/(rows.length||1)).toFixed(1).replace('.',',');$('total-opens').textContent=rows.reduce((n,r)=>n+r.opens,0);
}
async function load(){
 const version=++revision;$('status').textContent='Consultando estatísticas…';
 try{const response=await fetch('/stats?days='+$('period').value,{headers:{Authorization:'Bearer '+key},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error(response.status===401?'Chave inválida.':'Não foi possível consultar. Confira a configuração e tente novamente.');
  const data=await response.json();if(version!==revision)return;rows=data.days;render();$('report').hidden=false;$('login').hidden=true;$('status').textContent='Atualizado agora. A coleta offline pode chegar posteriormente.';
 }catch(error){if(version!==revision)return;rows=[];$('report').hidden=true;$('login').hidden=false;$('status').textContent=error.message;}
}
$('login').addEventListener('submit',event=>{event.preventDefault();key=$('token').value;$('token').value='';void load();});
$('refresh').addEventListener('click',()=>void load());$('period').addEventListener('change',()=>void load());
$('logout').addEventListener('click',()=>{revision++;key='';rows=[];render();$('report').hidden=true;$('login').hidden=false;$('status').textContent='Sessão encerrada.';});
$('csv').addEventListener('click',()=>{const columns=['Data','Visitantes','Ativos','Aberturas','Acoes',...Object.values(labels)];const csv=[columns.join(';'),...rows.map(r=>[r.day,r.visitors,r.active,r.opens,r.actions,...Object.keys(labels).map(k=>r.features[k]||0)].join(';'))].join('\\r\\n');const url=URL.createObjectURL(new Blob(['\\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='GROW_NEO-uso-diario.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
`;
