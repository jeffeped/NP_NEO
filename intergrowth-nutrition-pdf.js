import {calculateIntergrowth} from './intergrowth.js';
import {calculateIntergrowthVelocity} from './intergrowth-velocity.js';
import {exportIntergrowthSummaryPdf} from './intergrowth-pdf.js';
import {createFentonNutritionReport} from './fenton-nutrition-pdf.js';

export async function createIntergrowthNutritionReport({nutrition,result,assessment=''}){
 if(!result)throw new Error('Gere as curvas INTERGROWTH antes de exportar.');
 const validated=calculateIntergrowth(result);
 const velocity=result.velocity?calculateIntergrowthVelocity(validated,result.velocity.initialIndex,result.velocity.finalIndex):null;
 const chart={data:{sex:validated.sex==='female'?'F':'M',measurements:validated.measurements.map(m=>({weeks:m.weeks,days:m.days,weightGrams:m.weight,lengthCm:m.length,headCm:m.head}))},scores:validated.measurements.map(m=>{
  const row={weeks:m.weeks,days:m.days};
  for(const metric of ['weight','length','head'])if(m[metric]!=null){const score=m.scores[metric];row[metric]={value:m[metric],...score,percentile:score.percentile<.1?'<0,1':score.percentile>99.9?'>99,9':score.percentile};}return row;
 })};
 return createFentonNutritionReport({nutrition,chart,assessment},{velocity,summary:()=>exportIntergrowthSummaryPdf(validated,{pageLabel:'2/2',stamp:false})});
}
