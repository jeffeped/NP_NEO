import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFentonScores} from '../fenton-scores.js';

const request={measurements:[{weeks:24,days:3,weightGrams:613,headCm:21.5,lengthCm:31},{weeks:25,days:0,weightGrams:655}]};
const csv='GA (weeks),Weight (g),Weight Z,Weight Percentile,Head (cm),Head Z,Head Percentile,Length (cm),Length Z,Length Percentile\n24w3d,613,-1.12,13.1,21.5,-0.4,34.5,31,0.25,59.9\n25+0,655,-1.05,14.7,,,,,,\n';
test('CSV fictício associa medidas, escores e percentis recebidos às duas idades',()=>{
 const rows=parseFentonScores(csv,request);
 assert.deepEqual(rows,[
  {weeks:24,days:3,weight:{value:613,z:-1.12,percentile:13.1},length:{value:31,z:.25,percentile:59.9},head:{value:21.5,z:-.4,percentile:34.5}},
  {weeks:25,days:0,weight:{value:655,z:-1.05,percentile:14.7}}
 ]);
});
test('CSV diferente, ausente ou incompleto não é aceito como escore do gráfico',()=>{
 assert.throws(()=>parseFentonScores(csv.replace('655,-1.05','655,'),request),/divergente/);
 assert.throws(()=>parseFentonScores(csv.replace('25+0','25+1'),request),/idades/);
 assert.throws(()=>parseFentonScores(csv.replace('613,-1.12','614,-1.12'),request),/divergente/);
 assert.throws(()=>parseFentonScores(csv.split('\n').slice(0,2).join('\n'),request),/mesmas medidas/);
 assert.throws(()=>parseFentonScores('GA,WeightZ\n24.4,-1.2\n',request),/Formato/);
});
test('colunas agrupadas com Z, percentil e mudança de Z preservam apenas o Z absoluto',()=>{
 const grouped='GA (wk),Wt (g),Z,%tile,dZ(birth),Head (cm),Z,%tile,dZ(birth),Length (cm),Z,%tile,dZ(birth)\r\n24 3/7,613,-1.12,13.1,0,21.5,-0.4,34.5,0,31,0.25,59.9,0\r\n25 0/7,655,-1.05,14.7,0.07,,,,,,,,\r\n';
 assert.deepEqual(parseFentonScores(grouped,request),parseFentonScores(csv,request));
});
test('CSV com BOM, decimais entre aspas e percentil limitado mantém os valores recebidos',()=>{
 const quoted=csv.replace('24w3d,613,-1.12,13.1','24.429,613,"-1,12","<0,1"');
 assert.equal(parseFentonScores('\uFEFF'+quoted,request)[0].weight.percentile,'<0,1');
 assert.throws(()=>parseFentonScores(quoted.replace('<0,1','<101'),request),/fora da faixa/);
 assert.throws(()=>parseFentonScores(csv.replace('613,-1.12,13.1','613,-1.12,101'),request),/divergente/);
});
