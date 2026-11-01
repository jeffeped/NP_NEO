import {createUsageClient} from './usage.js';
import {USAGE_ENDPOINT} from './usage-config.js';

const FORMS={'npp-form':'np_ind','std-form':'np_padrao','hv-form':'hv','enteral-form':'enteral','growth-form':'fenton','fenton-form':'fenton','ig-form':'intergrowth'};
const BUTTONS={'export-pdf':'np_ind','std-export':'np_padrao','hv-export':'hv','en-export':'enteral',
 'fenton-total-export':'fenton','fenton-pdf-button':'fenton','fenton-z-button':'fenton','fenton-projection-run':'fenton',
 'ig-total-export':'intergrowth','ig-export':'intergrowth','ig-csv-export':'intergrowth','ig-velocity-calculate':'intergrowth','ig-projection-run':'intergrowth'};

export function initUsageUI(win,doc,endpoint,providedClient){
 const client=providedClient??createUsageClient({endpoint});
 const panel=doc.getElementById('usage-preference'),checkbox=doc.getElementById('usage-enabled'),status=doc.getElementById('usage-status');
 if(panel)panel.hidden=!endpoint;
 const update=()=>{if(checkbox)checkbox.checked=client.enabled();if(status)status.textContent=client.enabled()?'Estatísticas de uso ativadas.':'Estatísticas de uso desativadas ou bloqueadas pela preferência do navegador.';};
 update();
 checkbox?.addEventListener('change',()=>{client.setEnabled(checkbox.checked);update();});
 doc.addEventListener('submit',event=>{const feature=FORMS[event.target?.id];if(feature)client.record('action',feature);},true);
 doc.addEventListener('click',event=>{const button=event.target?.closest?.('button');const feature=BUTTONS[button?.id];if(feature&&!button.disabled)client.record('action',feature);},true);
 win.addEventListener('online',()=>{void client.flush();update();});
 win.addEventListener('storage',()=>{update();if(!client.enabled())void client.flush();});
 doc.addEventListener('visibilitychange',()=>{if(doc.visibilityState==='visible'){void client.flush();update();}});
 client.record('open');
 return client;
}

// A separate module script: a metrics failure never blocks app.js initialization.
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 try{initUsageUI(window,document,USAGE_ENDPOINT);}catch{}
}
