import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VERSION,ENERGY} from '../engine.js';
import {calculateHydration} from '../hydration.js';
import {calculateEnteral,FM85,integrateNutrition,intravenousFromResult,enteralNutrientWarnings} from '../enteral.js';
test('0.7.6: confirmed WFI plus invalid negative enteral nutrients retains fortifier and IV contributions',()=>{
 const hv=calculateHydration({access:'central',day:8,weight:2,fluid:100,vig:2,na:4,k:2,ca:1,mg:.2,doseUnit:'perKgDay',concentrations:{na:1.7,k:1.34,ca:.5,mg:.8},allowWfiReview:true,wfiClinicalReviewAcknowledged:true});
 const en=calculateEnteral({type:'lhop',rate:100,analyzedEnergy:-70,analyzedProtein:-2,fm85GramsPer100mL:4});
 const all=integrateNutrition({source:'hydration',parenteral:intravenousFromResult('hydration',hv),enteral:en});
 assert.equal(all.enteral.calories,FM85.energyPerGram*4);assert.equal(all.enteral.protein,FM85.proteinPerGram*4);assert.equal(all.parenteral.calories,11.52);assert.equal(all.parenteral.protein,0);assert.equal(all.total.calories,11.52+FM85.energyPerGram*4);assert.equal(all.total.protein,FM85.proteinPerGram*4);
 const warnings=enteralNutrientWarnings(en,all).join(' ');assert.match(warnings,/Energia analisada inválida: -70/);assert.match(warnings,/Proteína analisada inválida: -2/);assert.match(warnings,/Revise os valores e recalcule/);
});
test('0.7.9: version and offline cache agree; approved energy factors remain 4/9/4',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')),lock=JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
 assert.equal(VERSION,'0.7.9');assert.equal(pkg.version,VERSION);assert.equal(lock.version,VERSION);assert.equal(lock.packages[''].version,VERSION);assert.match(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),/npp-neo-static-0\.7\.9/);assert.deepEqual(ENERGY,{aa:4,lip:9,glucose:4});
});
