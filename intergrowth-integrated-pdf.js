import {buildIntegratedIntergrowthModel,paintIntegratedIntergrowth,intergrowthIdentification} from './intergrowth-integrated.js';
import {calculateIntergrowthVelocity} from './intergrowth-velocity.js';

export async function exportIntegratedIntergrowthPdf(result,{identification='',date=new Date()}={}){
 intergrowthIdentification(identification);
 const model=buildIntegratedIntergrowthModel(result);
 const velocity=result.velocity?calculateIntergrowthVelocity(model.result,result.velocity.initialIndex,result.velocity.finalIndex):null;
 if(!globalThis.PDFLib)throw new Error('Biblioteca de PDF indisponível. Reabra o aplicativo e tente novamente.');
 const {PDFDocument,StandardFonts,rgb,degrees}=globalThis.PDFLib,doc=await PDFDocument.create();
 doc.setTitle('GROW_NEO - Prancha integrada INTERGROWTH-21st');doc.setAuthor('Jefferson Guilherme');doc.setCreator('Jefferson Guilherme');
 doc.setSubject('Padrão pós-natal INTERGROWTH-21st; 27+0 a 64+0 semanas de idade pós-menstrual; gráfico próprio, sem endosso institucional. DOI: 10.1016/S2214-109X(15)00163-1');
 doc.setCreationDate(date);doc.setModificationDate(date);
 const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold),page=doc.addPage([model.width,model.height]);
 const color=hex=>rgb(...[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));
 paintIntegratedIntergrowth({
  beginGrid(){},endGrid(){},
  text(value,x,y,o){const font=o.bold?bold:regular,span=font.widthOfTextAtSize(value,o.size),offset=o.align==='center'?span/2:o.align==='right'?span:0;
   page.drawText(value,{x:x-offset,y:model.height-y,size:o.size,font,color:color(o.color),...(o.rotate?{rotate:degrees(-o.rotate)}:{})});
  },
  line(x1,y1,x2,y2,o){page.drawLine({start:{x:x1,y:model.height-y1},end:{x:x2,y:model.height-y2},color:color(o.color),thickness:o.width});},
  polyline(points,o){page.drawSvgPath(points.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' '),{x:0,y:model.height,borderColor:color(o.color),borderWidth:o.width});},
  marker(x,y,o){const options={color:color(o.color),borderColor:rgb(1,1,1),borderWidth:.7};
   if(o.shape==='circle')page.drawCircle({x,y:model.height-y,size:o.size,...options});
   else if(o.shape==='square')page.drawRectangle({x:x-o.size,y:model.height-y-o.size,width:o.size*2,height:o.size*2,...options});
   else page.drawSvgPath(`M ${x} ${y-o.size-1} L ${x-o.size-1} ${y+o.size} L ${x+o.size+1} ${y+o.size} Z`,{x:0,y:model.height,...options});
  }
 },model,{identification,date,velocity});
 return doc.save();
}
