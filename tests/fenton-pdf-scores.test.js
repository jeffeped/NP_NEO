import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFentonPdfTable} from '../fenton-pdf-scores.js';
const request={sex:'F',birthGaWeeks:24,birthGaDays:3,measurements:[{weeks:24,days:3,weightGrams:613,headCm:21.5,lengthCm:31},{weeks:25,days:0,weightGrams:655}]};
const item=(str,x,y)=>({str,width:0,transform:[1,0,0,1,x,y]});
function table(){
 const items=[item('Sex: Female | GA at Birth: 24 3/7 weeks',55,723),item('GAge',78,710),item('(weeks)',78,695),item('Weight (g)',175,710),item('Head Circ. (cm)',327,710),item('Length (cm)',479,710)];
 const xs=[121,163,205,239,273,315,357,391,425,467,509,543];
 xs.forEach((x,i)=>items.push(item(['Value','Z','dZ','%'][i%4],x,695)));
 const rows=[['24 3/7','613','-1.12','-8.22','13.1','21.5','-0.4','2.9','34.5','31','0.25','-3.6','59.9'],['25','655','-1.05','5.5','14.7','','','','','','','','']];
 rows.forEach((r,i)=>{items.push(item(r[0],78,680-i*15));r.slice(1).forEach((s,j)=>{if(s)items.push(item(s,xs[j],680-i*15));});});
 return items;
}
test('official grouped PDF layout preserves Z rather than dZ and allows missing metrics',()=>{
 assert.deepEqual(parseFentonPdfTable(table(),request),[{weeks:24,days:3,weight:{value:613,z:-1.12,percentile:13.1},head:{value:21.5,z:-.4,percentile:34.5},length:{value:31,z:.25,percentile:59.9}},{weeks:25,days:0,weight:{value:655,z:-1.05,percentile:14.7}}]);
});
test('PDF sex, birth age, measurement age, values and row count must match the current request',()=>{
 for(const altered of [{...request,sex:'M'},{...request,birthGaDays:2},{...request,measurements:[{...request.measurements[0],days:4},request.measurements[1]]},{...request,measurements:[{...request.measurements[0],weightGrams:614},request.measurements[1]]}])assert.throws(()=>parseFentonPdfTable(table(),altered),/correspondem|divergente/);
 assert.throws(()=>parseFentonPdfTable(table().filter(i=>i.transform[5]!==665),request),/mesmas medidas/);
});
test('bounded percentiles remain bounded; invalid scores, columns and unexpected measures fail',()=>{
 const bounded=table();bounded.find(i=>i.str==='13.1').str='<0.1';assert.equal(parseFentonPdfTable(bounded,request)[0].weight.percentile,'<0,1');
 bounded.find(i=>i.str==='<0.1').str='101';assert.throws(()=>parseFentonPdfTable(bounded,request),/Percentil/);
 assert.throws(()=>parseFentonPdfTable(table().filter(i=>i.str!=='-1.12'),request),/divergente/);
 const changed=table();changed.find(i=>i.str==='dZ').str='Delta';assert.throws(()=>parseFentonPdfTable(changed,request),/Colunas/);
 assert.throws(()=>parseFentonPdfTable([...table(),item('20',273,665)],request),/não foi enviada/);
});
