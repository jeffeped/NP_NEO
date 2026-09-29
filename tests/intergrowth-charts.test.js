import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {referenceValue} from '../intergrowth.js';
import {buildIntergrowthChartModel,createIntergrowthChart} from '../intergrowth-charts.js';

test('curvas incluem os extremos 27+0 e 64+0, sem extrapolação, para os sete escores Z',()=>{
 for(const sex of ['male','female'])for(const metric of ['weight','length','head']){
  const model=buildIntergrowthChartModel({sex,metric});
  assert.deepEqual(model.curves.map(curve=>curve.z),[-3,-2,-1,0,1,2,3]);
  for(const curve of model.curves){
   assert.equal(curve.points.length,260);
   assert.equal(curve.points[0].pmaDays,189);assert.equal(curve.points.at(-1).pmaDays,448);
   assert.equal(curve.points[0].x,model.plot.left);assert.equal(curve.points.at(-1).x,model.plot.right);
   for(const point of curve.points)assert.ok(point.y>=model.plot.top&&point.y<=model.plot.bottom);
  }
 }
});
test('peso de entrada em gramas é projetado em kg na mesma coordenada da curva',()=>{
 const pmaDays=280,weight=referenceValue('male','weight',pmaDays,0);
 const model=buildIntergrowthChartModel({sex:'male',metric:'weight',measurements:[{pmaDays,weight}]});
 const median=model.curves.find(curve=>curve.z===0).points.find(point=>point.pmaDays===pmaDays);
 assert.equal(model.points[0].value,weight/1000);assert.equal(model.points[0].y,median.y);
 assert.equal(model.unit,'kg');assert.equal(model.inputUnit,'g');
});
test('medidas extremas ampliam o eixo vertical e medidas ausentes preservam a numeração',()=>{
 const model=buildIntergrowthChartModel({sex:'female',metric:'weight',measurements:[{pmaDays:200,length:40},{pmaDays:280,weight:100},{pmaDays:448,weight:30000}]});
 assert.deepEqual(model.points.map(point=>point.index),[2,3]);
 assert.ok(model.yMax>30);assert.ok(model.yMin<=.1);
 for(const point of model.points)assert.ok(point.y>=model.plot.top&&point.y<=model.plot.bottom);
 const labels=[...model.curves].reverse();
 labels.forEach((curve,index)=>{assert.ok(curve.labelY>=model.plot.top&&curve.labelY<=model.plot.bottom);if(index)assert.ok(curve.labelY-labels[index-1].labelY>=13);});
});
test('SVG acessível informa indicador/unidade, sete curvas e pontos numerados sem recursos remotos',()=>{
 const {document}=parseHTML('<html><body></body></html>');
 const chart=createIntergrowthChart(document,{sex:'female',metric:'length',measurements:[{pmaDays:280,length:45},{pmaDays:287,length:47}]});
 assert.equal(chart.getAttribute('role'),'img');
 assert.equal(chart.querySelectorAll('polyline[data-z]').length,7);
 assert.equal(chart.querySelectorAll('[data-measurement]').length,2);
 assert.ok(chart.querySelector('[data-series="measurements"]'));
 assert.match(chart.querySelector('title').textContent,/Comprimento.*feminino/);
 assert.match(chart.querySelector('desc').textContent,/Valores em cm/);
 assert.equal(chart.querySelectorAll('image,script,foreignObject,a').length,0);
 assert.doesNotMatch(chart.outerHTML,/(?:NaN|undefined|Infinity)/);
});
test('gráficos na mesma página recebem descrições acessíveis únicas',()=>{
 const {document}=parseHTML('<html><body></body></html>');
 const one=createIntergrowthChart(document,{sex:'male',metric:'head'}),two=createIntergrowthChart(document,{sex:'male',metric:'head'});
 assert.notEqual(one.getAttribute('aria-labelledby'),two.getAttribute('aria-labelledby'));
});
