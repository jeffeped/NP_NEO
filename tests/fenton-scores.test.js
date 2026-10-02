import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFentonScores} from '../fenton-scores.js';

const data={sex:'F',birthGaWeeks:28,birthGaDays:0,measurements:[{weeks:30,days:5,weightGrams:1300,headCm:27,lengthCm:39}]};
const csv='\uFEFFGA at Birth: 28.0000\r\nSex: F\r\nLanguage: English\r\nData type: Growth\r\nGA_weeks,Weight_g,W_Z,W_changeZ,W_%,Head_cm,H_Z,H_changeZ,H_%,Length_cm,L_Z,L_changeZ,L_%\r\n30.7143,1300,-0.887,0.000,19,27.00,-0.650,0.000,26,39.00,-0.336,0.000,37\r\n';
test('retains official z and percentile for each measure',()=>{
 const [row]=parseFentonScores(csv,data);
 assert.deepEqual(row.weightGrams,{value:1300,z:-.887,percentile:19});
 assert.deepEqual(row.headCm,{value:27,z:-.65,percentile:26});
 assert.deepEqual(row.lengthCm,{value:39,z:-.336,percentile:37});
});
test('rejects mismatched measures and malformed scores',()=>{
 assert.throws(()=>parseFentonScores(csv,{...data,measurements:[{...data.measurements[0],weightGrams:1400}]}),/incompatível/);
 assert.throws(()=>parseFentonScores(csv.replace('Sex: F','Sex: M'),data),/Sexo/);
 assert.throws(()=>parseFentonScores(csv.replace('30.7143','31.7143'),data),/Idade/);
 assert.throws(()=>parseFentonScores(csv.replace('-0.887','~'),data),/incompatível/);
});
test('accepts absent measurements without inventing scores',()=>{
 const partial={...data,measurements:[{weeks:30,days:5,weightGrams:1300}]};
 const row=csv.replace('27.00,-0.650,0.000,26,39.00,-0.336,0.000,37',',~,,,,~,,');
 assert.equal(parseFentonScores(row,partial)[0].headCm,null);
});
