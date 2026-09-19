// User-triggered updates never discard an active calculation without confirmation.
export function initAppUpdate({button,status,serviceWorker,confirmRestart,reload}){
 let registration=null,busy=false;
 const showReady=()=>{button.dataset.ready='true';status.textContent='Nova versão disponível';};
 const watch=worker=>{if(!worker)return;worker.addEventListener('statechange',()=>{
  if(worker.state==='installed'&&serviceWorker.controller)showReady();
  else if(worker.state==='redundant')status.textContent='Não foi possível baixar a atualização. Tente novamente.';
 });};
 const setRegistration=reg=>{registration=reg;if(reg.waiting)showReady();watch(reg.installing);reg.addEventListener('updatefound',()=>{status.textContent='Baixando atualização…';watch(reg.installing);});};
 const activate=()=>{
  if(!registration?.waiting)return false;
  if(confirmRestart('Reiniciar para atualizar? Os parâmetros atuais serão descartados.')){
   serviceWorker.addEventListener('controllerchange',reload,{once:true});
   registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
  }
  return true;
 };
 const check=async()=>{
  if(busy)return;
  if(!serviceWorker){status.textContent='Atualização indisponível neste navegador.';return;}
  if(!registration){status.textContent='Aguarde o carregamento do app e tente novamente.';return;}
  if(activate())return;
  busy=true;button.disabled=true;status.textContent='Verificando…';
  try{await registration.update();if(!activate())status.textContent=registration.installing?'Baixando atualização…':'Você está na versão mais recente.';}
  catch{status.textContent='Não foi possível verificar. Confira a conexão e tente novamente.';}
  finally{busy=false;button.disabled=false;}
 };
 button.addEventListener('click',check);
 return {setRegistration,check};
}
