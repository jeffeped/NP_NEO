export const ENTERAL_COMPOSITION = Object.freeze({
  lmo_colostrum: {label:'LMO — colostro', energy:64.38, protein:2.32, estimated:true},
  lmo_transition: {label:'LMO — transição', energy:69.47, protein:1.77, estimated:true},
  lmo_mature: {label:'LMO — maduro', energy:68.70, protein:1.46, estimated:true},
  lhop: {label:'LHOP — composição estimada', energy:65.0, protein:1.20, estimated:true},
  fpt_prenan: {label:'FPT — Pré NAN', energy:81.0, protein:2.70, estimated:false},
  fpt_aptamil_pre: {label:'FPT — Aptamil Pré', energy:81.0, protein:2.70, estimated:false},
  fp_nan1: {label:'FP — NAN 1', energy:67.0, protein:1.20, estimated:false},
  fp_aptamil1: {label:'FP — Aptamil 1', energy:67.0, protein:1.30, estimated:false}
});
export const FM85 = Object.freeze({energyPerGram:4.3, proteinPerGram:0.36, standardGramsPer100mL:4});
export function lmoPhase(days){
  const d=Number(days);
  if(!Number.isFinite(d)||d<0) throw new Error('Dias de lactação inválidos.');
  return d<5?'lmo_colostrum':d<14?'lmo_transition':'lmo_mature';
}
export function compositionFor({type, lactationDays, analyzedEnergy, analyzedProtein, fm85GramsPer100mL=0}){
  let base;
  if(type==='lmo') base=ENTERAL_COMPOSITION[lmoPhase(lactationDays)];
  else if(type==='lhop') base=ENTERAL_COMPOSITION.lhop;
  else base=ENTERAL_COMPOSITION[type];
  if(!base) throw new Error('Dieta enteral não reconhecida.');
  const missing=value=>value==null||(typeof value==='string'&&value.trim()==='');
  const hasEnergy=!missing(analyzedEnergy),hasProtein=!missing(analyzedProtein);
  if(hasEnergy!==hasProtein)throw new Error('Para composição analisada, informe energia e proteína.');
  const hasAnalyzed=hasEnergy&&hasProtein;
  if(hasAnalyzed&&(!Number.isFinite(Number(analyzedEnergy))||!Number.isFinite(Number(analyzedProtein))))throw new Error('Composição analisada inválida: informe energia e proteína numéricas e finitas.');
  let energy=hasAnalyzed?Number(analyzedEnergy):base.energy;
  // Preserve invalid input separately: zero is a calculation fallback, not a measurement.
  const energyValidation=hasAnalyzed&&energy<0?{status:'invalid-negative',enteredValue:energy,calculationValue:0}:null;
  if(energyValidation)energy=energyValidation.calculationValue;
  let protein=hasAnalyzed?Number(analyzedProtein):base.protein;
  const proteinValidation=hasAnalyzed&&protein<0?{status:'invalid-negative',enteredValue:protein,calculationValue:0}:null;
  if(proteinValidation)protein=proteinValidation.calculationValue;
  const fortifier=Number(fm85GramsPer100mL);
  if(!Number.isFinite(fortifier)||fortifier<0) throw new Error('Concentração de FM85 inválida.');
  if(fortifier>0&&!['lmo','lhop'].includes(type)) throw new Error('FM85: selecione LMO ou LHOP; não acrescente o fortificante à fórmula.');
  energy+=fortifier*FM85.energyPerGram;
  protein+=fortifier*FM85.proteinPerGram;
  return {label:base.label,energy,protein,estimated:!hasAnalyzed&&base.estimated,fm85GramsPer100mL:fortifier,...(energyValidation?{energyValidation}:{}),...(proteinValidation?{proteinValidation}:{})};
}
export function calculateEnteral({rate,...options}){
  const r=Number(rate);
  if(!Number.isFinite(r)||r<0) throw new Error('Taxa enteral inválida.');
  const composition=compositionFor(options);
  return {rate:r,composition,calories:r*composition.energy/100,protein:r*composition.protein/100};
}
export const IV_SOURCES=Object.freeze({none:'Sem aporte intravenoso',individual:'NP individualizada',standard:'NP padrão (Numeta)',hydration:'HV',individual_hydration:'NP individualizada + HV',standard_hydration:'NP padrão (Numeta) + HV'});
export const IV_MEMBERS=Object.freeze({none:[],individual:['individual'],standard:['standard'],hydration:['hydration'],individual_hydration:['individual','hydration'],standard_hydration:['standard','hydration']});
export function intravenousFromResult(source,result){
  if(!Object.hasOwn(IV_SOURCES,source))throw new Error('Selecione o aporte intravenoso em uso.');
  if(IV_MEMBERS[source].length===2)return combineIntravenousResults(IV_MEMBERS[source][0],result?.np,result?.hv);
  if(source==='none')return {fluid:0,calories:0,protein:0};
  if(!result?.ok)throw new Error(`Calcule novamente ${IV_SOURCES[source]} na aba correspondente.`);
  let values;
  if(source==='individual'){
    if(!result.canExport)throw new Error('Revise os impedimentos da NP individualizada antes de integrar.');
    values={fluid:result.totals.fluid,calories:result.totals.calories,protein:result.effective.aa,weight:result.input.weight};
  }else if(source==='standard'){
    if(result.blocks.length)throw new Error('Revise os impedimentos da NP padrão antes de integrar.');
    values={fluid:result.fluid,calories:result.rows.find(r=>r.label==='Energia total').perKg,protein:result.protein,weight:result.weight,formulation:result.formulation??'3in1'};
  }else{
    if(!result.canPrepare||(result.reviewRequired&&!result.clinicalReviewAcknowledged))throw new Error('Revise os impedimentos da HV antes de integrar.');
    // Fator da glicose já utilizado no app: 4 kcal/g.
    values={fluid:result.input.fluid,calories:result.mixture.glucoseGrams*4/result.input.weight,protein:0,weight:result.input.weight};
  }
  if(['fluid','calories','protein'].some(key=>!Number.isFinite(values[key])||values[key]<0))throw new Error('Aporte intravenoso inválido; recalcule na aba correspondente.');
    values.weightContext=result.weightContext??result.input?.weightContext??null;
    return values;
}
export function combineIntravenousResults(npSource,npResult,hvResult){
  if(!['individual','standard'].includes(npSource))throw new Error('Selecione uma modalidade de NP para somar à HV.');
  const np=intravenousFromResult(npSource,npResult),hv=intravenousFromResult('hydration',hvResult);
  const a=np.weightContext,b=hv.weightContext;
  if(!a||!b||['day','basis','calculationWeight'].some(key=>a[key]!==b[key]))throw new Error('NP e HV devem usar o mesmo dia de vida e peso de cálculo. Confira os dados e recalcule as duas abas.');
  return {fluid:np.fluid+hv.fluid,calories:np.calories+hv.calories,protein:np.protein+hv.protein,weight:np.weight,weightContext:a,formulation:np.formulation,components:{np,hv}};
}
export function integrateNutrition({parenteral={},enteral,source='individual'}){
  if(!Object.hasOwn(IV_SOURCES,source))throw new Error('Selecione o aporte intravenoso em uso.');
  const combined=IV_MEMBERS[source].length===2;
  if(combined&&(!parenteral.components?.np||!parenteral.components?.hv))throw new Error('Calcule NP e HV antes de integrar as duas fontes.');
  const p=source==='none'?{fluid:0,calories:0,protein:0}:{fluid:Number(parenteral.fluid)||0,calories:Number(parenteral.calories)||0,protein:source==='hydration'?0:Number(parenteral.protein)||0};
  if(combined)for(const key of ['fluid','calories','protein']){
    const a=parenteral.components.np[key],b=parenteral.components.hv[key];
    if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<0)throw new Error('Aporte intravenoso inválido; recalcule NP e HV.');
    p[key]=a+b;
  }
  const e=enteral||{rate:0,calories:0,protein:0};
  // Also protect integration of a legacy/direct result that bypassed calculateEnteral.
  const invalidCalories=Number(e.calories)<0;
  const calories=invalidCalories?0:e.calories||0;
  const energyValidation=e.composition?.energyValidation??(invalidCalories?{status:'invalid-negative-total',enteredValue:Number(e.calories),calculationValue:0}:null);
  const invalidProtein=Number(e.protein)<0;
  const protein=invalidProtein?0:e.protein||0;
  const proteinValidation=e.composition?.proteinValidation??(invalidProtein?{status:'invalid-negative-total',enteredValue:Number(e.protein),calculationValue:0}:null);
  const twoChamber=IV_MEMBERS[source].includes('standard')&&parenteral.formulation==='2in1';
  return {source,sourceLabel:twoChamber?'NP padrão (Numeta 2:1, sem lipídios)'+(combined?' + HV':''):IV_SOURCES[source],weight:source==='none'?null:parenteral.weight,weightContext:source==='none'?null:parenteral.weightContext??null,parenteral:p,...(combined?{intravenousComponents:parenteral.components}:{}),enteral:{fluid:e.rate||0,calories,protein,...(energyValidation?{energyValidation}:{}),...(proteinValidation?{proteinValidation}:{})},
    total:{fluid:p.fluid+(e.rate||0),calories:p.calories+calories,protein:p.protein+protein}};
}

// Shared by the on-screen summary and both nutritional PDF exports.
export function enteralEnergyWarnings(enteral,integrated){
  const validation=integrated?.enteral?.energyValidation??enteral?.composition?.energyValidation;
  if(!validation)return [];
  const entered=String(validation.enteredValue).replace('.',',');
  if(validation.status==='invalid-negative-total')return [
    `Energia enteral inválida recebida: ${entered} kcal/kg/dia.`,
    'Usado 0 kcal/kg/dia no total; não é valor medido.',
    'Revise o valor informado e recalcule.'];
  if(validation.status!=='invalid-negative')return [];
  return [`Energia analisada inválida: ${entered} kcal/100 mL.`,
    'Usado 0 kcal/100 mL para a energia do leite; não é valor medido.',
    'Revise o valor informado e recalcule.',
    ...(enteral?.composition?.fm85GramsPer100mL>0?['Energia do FM85 acrescentada separadamente.']:[])];
}

export function enteralNutrientWarnings(enteral,integrated){
  const protein=integrated?.enteral?.proteinValidation??enteral?.composition?.proteinValidation;
  if(!protein)return enteralEnergyWarnings(enteral,integrated);
  const energy=integrated?.enteral?.energyValidation??enteral?.composition?.energyValidation;
  const lines=[];
  for(const [label,unit,validation] of [['Energia','kcal',energy],['Proteína','g',protein]]){
    if(!validation)continue;
    const per=validation.status==='invalid-negative-total'?'kg/dia':'100 mL';
    const kind=validation.status==='invalid-negative-total'?'enteral recebida':'analisada';
    lines.push(`${label} ${kind} inválida: ${String(validation.enteredValue).replace('.',',')} ${unit}/${per}; usado 0.`);
  }
  lines.push('Zero no cálculo não é valor medido. Revise os valores e recalcule.');
  if(enteral?.composition?.fm85GramsPer100mL>0)lines.push('FM85: energia e proteína acrescentadas separadamente.');
  return lines;
}

// Metas aprovadas em 19/09/2026. Comparar valores internos, sem arredondar.
export function assessTransition(integrated){
  const {parenteral,enteral,total}=integrated;
  const hasPN=['individual','standard','individual_hydration','standard_hydration'].includes(integrated.source)&&(integrated.intravenousComponents?.np??parenteral).fluid>0;
  const active=hasPN&&enteral.fluid>50;
  return {active,reason:!hasPN?'no-pn':enteral.fluid<=50?'enteral-threshold':null,
    energyMet:active?total.calories>=110:null,
    proteinMet:active?total.protein>=2.5:null};
}

export function transitionLines(integrated){
  const assessment=assessTransition(integrated);
  if(!assessment.active)return [assessment.reason==='no-pn'
    ?'Metas de transição não avaliadas: sem PN no cálculo integrado.'
    :'Metas de transição não avaliadas: oferta enteral menor ou igual a 50 mL/kg/dia.'];
  return ['Metas de transição avaliadas: enteral >50 mL/kg/dia com PN presente.',
    `Energia total: ${assessment.energyMet?'meta atingida':'abaixo da meta'} (mínimo 110 kcal/kg/dia).`,
    `Proteína total: ${assessment.proteinMet?'meta atingida':'abaixo da meta'} (mínimo 2,50 g/kg/dia).`];
}


export const CLINICAL_PHASES=Object.freeze({oligoanuria:'Fase de oligoanúria',transition:'Fase de transição',growth:'Fase de crescimento'});
export function clinicalReferenceLines(integrated,{phase='',birthWeight=null,gestationalAge=null}={}){
 const lines=[`Fase clínica: ${CLINICAL_PHASES[phase]||'não informada'}.`];
 if(!phase)return [...lines,'Selecione a fase clínica para consultar as referências.'];
 if(!Object.hasOwn(CLINICAL_PHASES,phase))throw new Error('Fase clínica inválida.');
 if(phase!=='growth')return [...lines,
  'ESPGHAN 2018 — referências parenterais para prematuros:',
  'D1: energia mínima de referência 45–55 kcal/kg/dia; AA 1,5–2,5 g/kg/dia.',
  'Desde D2: AA 2,5–3,5 g/kg/dia e energia não proteica >65 kcal/kg/dia.',
  'Esses valores não definem metas próprias da oligoanúria ou da transição.',
  'Proteína enteral não é classificada pela faixa de aminoácidos parenterais.',
  'Referências: Joosten et al., 2018; van Goudoever et al., 2018.'];
 lines.push('Referência enteral de crescimento — ESPGHAN 2022 (publicada em 2023).');
 if(!(Number.isFinite(birthWeight)&&birthWeight>0&&Number.isFinite(gestationalAge)&&gestationalAge>0))return [...lines,'Informe peso ao nascer e idade gestacional ao nascer para verificar aplicabilidade.'];
 lines.push(`Peso ao nascer: ${birthWeight} g; IG ao nascer: ${gestationalAge} semanas.`);
 if(birthWeight>=1800||gestationalAge>=37)return [...lines,'Referência não aplicada: população de prematuros com peso ao nascer <1800 g.'];
 lines.push('Para prematuros clinicamente estáveis em crescimento:',
 'Energia: 115–140 kcal/kg/dia. Proteína enteral: 3,5–4,0 g/kg/dia.');
 if(!['none','hydration'].includes(integrated.source))return [...lines,'Comparação enteral não aplicada à oferta mista com NP; consulte as metas de transição PN / EN.'];
 const fmt=n=>n.toFixed(2).replace('.',',');
 for(const [label,key,low,high,unit] of [['Energia','calories',115,140,'kcal/kg/dia'],['Proteína','protein',3.5,4,'g/kg/dia']]){
  const value=integrated.total[key];
  const status=value<low?`faltam ${fmt(low-value)} ${unit} até o limite inferior`:value>high?`${fmt(value-high)} ${unit} acima do limite superior`:'dentro da faixa de referência';
  lines.push(`${label} ofertada: ${fmt(value)} ${unit} — ${status}.`);
 }
 if(integrated.source==='hydration')lines.push('Energia ofertada: HV + enteral; proteína ofertada: somente enteral.');
 return [...lines,'Distância até a referência de alimentação plena; não determina ajuste automático.',
 'Fonte: Embleton et al., JPGN 2023;76:248–268.'];
}
