// Observed weight change between two evaluations (Average2pt method), using
// the arithmetic mean of the two weights, as in growth.js. This calculation
// does not supply an INTERGROWTH velocity reference, percentile or Z score.
import {INTERGROWTH_MIN_DAYS,INTERGROWTH_MAX_DAYS} from './intergrowth.js';

export function calculateIntergrowthVelocity(result,initialIndex,finalIndex){
 const measurements=result?.measurements;
 if(!Array.isArray(measurements)||measurements.length<2||measurements.length>20)
  throw new Error('Informe de 2 a 20 avaliações para calcular a velocidade de crescimento.');
 if(!Number.isInteger(initialIndex)||!Number.isInteger(finalIndex)||initialIndex<0||finalIndex<0||initialIndex>=measurements.length||finalIndex>=measurements.length)
  throw new Error('Selecione avaliações inicial e final válidas.');
 if(finalIndex<=initialIndex)
  throw new Error('A avaliação final deve ser posterior à inicial.');
 let previous=INTERGROWTH_MIN_DAYS-1;
 for(const [index,row] of measurements.entries()){
  if(!row||!Number.isInteger(row.pmaDays)||row.pmaDays<INTERGROWTH_MIN_DAYS||row.pmaDays>INTERGROWTH_MAX_DAYS)
   throw new Error(`Avaliação ${index+1}: a IPM deve estar entre 27 semanas + 0 dias e 64 semanas + 0 dias.`);
  if(row.pmaDays<=previous)
   throw new Error('Informe as avaliações em ordem crescente de IPM, sem repetir a idade.');
  previous=row.pmaDays;
 }
 const start=measurements[initialIndex],end=measurements[finalIndex];
 for(const index of [initialIndex,finalIndex]){
  const weight=measurements[index].weight;
  if(weight==null)throw new Error(`Avaliação ${index+1}: informe o peso para calcular a velocidade de crescimento.`);
  if(!Number.isFinite(weight)||weight<100||weight>20000)
   throw new Error(`Avaliação ${index+1}: confira o peso em gramas (100–20.000 g).`);
 }
 const intervalDays=end.pmaDays-start.pmaDays;
 const totalGain=end.weight-start.weight;
 const averageWeight=(start.weight+end.weight)/2;
 return {
  initialIndex,finalIndex,initialEvaluation:initialIndex+1,finalEvaluation:finalIndex+1,
  startPmaDays:start.pmaDays,endPmaDays:end.pmaDays,startWeight:start.weight,endWeight:end.weight,
  intervalDays,totalGain,averageWeight,
  gramsPerDay:totalGain/intervalDays,
  gramsPerKgDay:1000*totalGain/(averageWeight*intervalDays)
 };
}
