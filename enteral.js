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
  const hasAnalyzed=Number.isFinite(Number(analyzedEnergy))&&Number.isFinite(Number(analyzedProtein));
  let energy=hasAnalyzed?Number(analyzedEnergy):base.energy;
  let protein=hasAnalyzed?Number(analyzedProtein):base.protein;
  const fortifier=Number(fm85GramsPer100mL)||0;
  if(fortifier<0) throw new Error('Concentração de FM85 inválida.');
  energy+=fortifier*FM85.energyPerGram;
  protein+=fortifier*FM85.proteinPerGram;
  return {label:base.label,energy,protein,estimated:!hasAnalyzed&&base.estimated,fm85GramsPer100mL:fortifier};
}
export function calculateEnteral({rate,...options}){
  const r=Number(rate);
  if(!Number.isFinite(r)||r<0) throw new Error('Taxa enteral inválida.');
  const composition=compositionFor(options);
  return {rate:r,composition,calories:r*composition.energy/100,protein:r*composition.protein/100};
}
export function integrateNutrition({parenteral={},enteral}){
  const p={fluid:Number(parenteral.fluid)||0,calories:Number(parenteral.calories)||0,protein:Number(parenteral.protein)||0};
  const e=enteral||{rate:0,calories:0,protein:0};
  return {parenteral:p,enteral:{fluid:e.rate||0,calories:e.calories||0,protein:e.protein||0},
    total:{fluid:p.fluid+(e.rate||0),calories:p.calories+(e.calories||0),protein:p.protein+(e.protein||0)}};
}
