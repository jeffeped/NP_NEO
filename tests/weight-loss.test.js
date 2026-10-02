import test from 'node:test';
import assert from 'node:assert/strict';
import {weightLossAtMeasurement,weightLossLine} from '../weight-loss.js';
import {resolveDosingWeight} from '../dosing-weight.js';

test('perda usa peso medido no D7, embora aporte use peso de nascimento',()=>{
 const context=resolveDosingWeight({day:7,birthWeight:1,weight:.92});
 assert.equal(context.calculationWeight,1);
 assert.deepEqual(weightLossAtMeasurement({weightContext:context}),{birth:1000,current:920,day:7,percent:8});
 assert.match(weightLossLine({weightContext:context}),/8,0% abaixo do peso ao nascer/);
});
test('D8 usa peso atual nos aportes; ganho ou dado ausente não gera perda',()=>{
 const context=resolveDosingWeight({day:8,birthWeight:1,weight:.93});
 assert.equal(context.calculationWeight,.93);
 assert.equal(weightLossAtMeasurement({weightContext:context}).percent,7);
 assert.equal(weightLossLine({weightContext:resolveDosingWeight({day:8,birthWeight:1,weight:1.01})}),null);
 assert.equal(weightLossLine({weightContext:resolveDosingWeight({day:8,weight:1})}),null);
});
test('a perda atual usa os pesos da avaliação nutricional quando a velocidade foi calculada em outro dia',()=>{
 const weightContext=resolveDosingWeight({day:7,birthWeight:1,weight:.92});
 const growth={input:{birthWeight:1000,finalWeight:880,finalDay:4}};
 assert.deepEqual(weightLossAtMeasurement({growth,weightContext}),{birth:1000,current:920,day:7,percent:8});
 assert.equal(weightLossAtMeasurement({growth:{input:{birthWeight:1000,finalWeight:0}}}),null);
});
