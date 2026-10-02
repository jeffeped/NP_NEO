// Measured loss from birth weight. The institutional dosing weight is irrelevant here.
export function weightLossAtMeasurement({growth=null,weightContext=null}={}){
 const birth=Number.isFinite(weightContext?.birthWeight)?weightContext.birthWeight*1000:growth?.input?.birthWeight;
 const current=Number.isFinite(weightContext?.currentWeight)?weightContext.currentWeight*1000:growth?.input?.finalWeight;
 const day=weightContext?.day??growth?.input?.finalDay;
 if(!Number.isFinite(birth)||birth<=0||!Number.isFinite(current)||current<=0||current>=birth)return null;
 return {birth,current,day:Number.isFinite(day)?day:null,percent:(birth-current)*100/birth};
}
export function weightLossLine(inputs){
 const loss=weightLossAtMeasurement(inputs);
 if(!loss)return null;
 const fmt=(n,d=0)=>n.toFixed(d).replace('.',',');
 return `Peso medido${loss.day===null?'':` no D${loss.day}`}: ${fmt(loss.current)} g; ${fmt(loss.percent,1)}% abaixo do peso ao nascer (${fmt(loss.birth)} g).`;
}
