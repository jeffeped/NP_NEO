// Regras confirmadas pelo responsável do projeto em 16/09/2026.
// Alertas clínicos orientam a revisão; não acrescentam bloqueios de exportação.
export const ALERT_LABELS = Object.freeze({info:'ORIENTAÇÃO',caution:'ATENÇÃO',high:'ACIMA DO TETO'});
export const formatAlertNumber = value => Number.isInteger(value) ? `${value},0` : String(value).replace('.',',');
function formatCalculated(value,reference,above) {
  const display=Number(value.toFixed(6));
  // Não exibir o próprio teto quando a oferta real o ultrapassou por pouco.
  return formatAlertNumber(above&&display===reference?value:display);
}

export function macroReference(nutrient,weight,day) {
  return {
    dose:day===1?2:3,
    phase:day===1?'inicial no 1º dia de vida':'de progressão após o 1º dia de vida',
    ceiling:nutrient==='lip'?4:(weight<1?3.5:null)
  };
}

// Compara produtos decimais sem o ruído binário de multiplicações/divisões.
// Não aplica tolerância nem arredondamento: um decimal acima do limite conta.
function decimalProduct(values) {
  return values.reduce(([integer,power],value)=>{
    const [mantissa,exponent='0']=String(value).toLowerCase().split('e');
    const [whole,fraction='']=mantissa.split('.');
    return [integer*BigInt(whole+fraction),power+Number(exponent)-fraction.length];
  },[1n,0]);
}
function compareProducts(left,right) {
  const [a,ap]=decimalProduct(left),[b,bp]=decimalProduct(right);
  const scale=Math.min(ap,bp);
  const delta=a*10n**BigInt(ap-scale)-b*10n**BigInt(bp-scale);
  return delta>0n?1:delta<0n?-1:0;
}

export function nutritionAlerts(input,{volumes,effective,totalVolume,glucosePercent}) {
  const alerts=[];
  const context=`Peso atual: ${formatAlertNumber(input.weight)} kg; dia de vida: ${input.day}.`;
  function add(id,nutrient,level,kind,value,reference,message) {
    alerts.push({id,nutrient,level,kind,value,reference,blocking:false,
      weightKg:input.weight,day:input.day,message:`${ALERT_LABELS[level]}: ${message}`});
  }
  // A concentração final usa os volumes de preparo, antes do arredondamento
  // visual do percentual. Preserva o arredondamento de preparo já existente.
  if(totalVolume>0&&compareProducts([volumes.glucose,0.5,100],[totalVolume,20])>0) {
    add('glucose-concentration-high','glucose','caution','concentration',glucosePercent,20,
      `concentração final de glicose superior a 20%. Calculada: ${formatCalculated(glucosePercent,20,true)}%. Recomenda-se cautela e revisão da prescrição, mesmo em acesso venoso central. Acesso selecionado: ${input.access==='central'?'central':'periférico'}. ${context}`);
  }
  for(const [id,name,concentration] of [['aa','Aminoácidos',0.1],['lip','Lipídios',0.2]]) {
    const {dose,phase,ceiling}=macroReference(id,input.weight,input.day);
    const requested=input[id];
    const aboveRequested=ceiling!==null&&requested>ceiling;
    const aboveEffective=ceiling!==null&&compareProducts([volumes[id],concentration],[input.weight,ceiling])>0;
    const aboveCeiling=aboveRequested||aboveEffective;
    const relation=requested<dose?'abaixo':requested>dose?'acima':'na referência';
    const level=aboveCeiling?'high':requested===dose?'info':'caution';
    let message=`${name}: dose solicitada ${formatAlertNumber(requested)} g/kg/dia; dose efetiva calculada ${formatCalculated(effective[id],ceiling??dose,aboveEffective)} g/kg/dia. Referência ${phase}: ${formatAlertNumber(dose)} g/kg/dia. `;
    if(aboveCeiling) {
      const source=aboveRequested&&aboveEffective?'solicitada e efetiva':aboveRequested?'solicitada':'efetiva após arredondamento dos volumes de preparo';
      message+=`A dose ${source} ultrapassa o teto de ${formatAlertNumber(ceiling)} g/kg/dia${id==='aa'?' aplicável somente a RN com peso <1000 g':''}. Revise a prescrição. `;
    } else {
      message+=requested===dose?'Dose solicitada na referência habitual. ':`Dose solicitada ${relation} da referência habitual; revisar conforme o contexto clínico. `;
      if(ceiling!==null)message+=`Teto: ${formatAlertNumber(ceiling)} g/kg/dia${id==='aa'?', somente para RN com peso <1000 g':''}; este teto não é uma meta de oferta. `;
      else message+='Para RN com peso ≥1000 g, a referência de progressão é 3,0 g/kg/dia; não foi definido um teto máximo neste protocolo. ';
    }
    add(`${id}-${aboveCeiling?'ceiling':requested===dose?'guidance':'reference'}`,id,level,
      aboveCeiling?'ceiling':'reference',aboveRequested?requested:aboveEffective?effective[id]:requested,
      aboveCeiling?ceiling:dose,message+context);
  }
  return alerts;
}
