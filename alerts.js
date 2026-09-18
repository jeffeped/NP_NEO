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

export function nutritionAlerts(input,{volumes,effective,totalVolume,glucosePercent,osmolarity}) {
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
  if(Number.isFinite(osmolarity)&&osmolarity>900) {
    const accessGuidance=input.access==='central'
      ?'Mantenha o acesso venoso central selecionado e confira o protocolo institucional.'
      :'Considere acesso venoso central e confira o protocolo institucional.';
    add('osmolarity-high','osmolarity','caution','concentration',osmolarity,900,
      `osmolaridade estimada de ${Math.round(osmolarity)} mOsm/L, acima do limite de 900 mOsm/L geralmente recomendado para nutrição parenteral periférica. ${accessGuidance} Estimativa pela equação de Pereira-da-Silva et al.; não corresponde à osmolalidade laboratorial medida. ${context}`);
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
  // Relação sempre molar: cálcio é informado em mEq (1 mmol = 2 mEq)
  // e fósforo em mmol. Só há relação definida quando ambos são ofertados.
  if(effective.ca>0&&effective.p>0) {
    const calciumMmol=effective.ca/2;
    const ratio=calciumMmol/effective.p;
    const early=input.day===1;
    const ratioText=formatCalculated(ratio,early?1:1.3,early?ratio>1:ratio>1.3);
    const phase=early?'fase precoce (1º dia de vida)':'após a fase inicial';
    const baseMessage=`relação molar Ca:P calculada em ${ratioText}:1 (${formatCalculated(calciumMmol,0,false)} mmol de Ca/kg/dia ÷ ${formatCalculated(effective.p,0,false)} mmol de P/kg/dia), ${phase}. `;
    if(ratio<0.8) {
      add(early?'CAP_EARLY_LOW':'CAP_LATE_LOW','ca-p','caution','ratio',ratio,0.8,
        `${baseMessage}Valor abaixo de 0,8:1. Revise as ofertas de cálcio e fósforo. ${context}`);
    } else if(early&&ratio>1) {
      add('CAP_EARLY_HIGH','ca-p','caution','ratio',ratio,1,
        `${baseMessage}Na fase precoce, a faixa-alvo é 0,8–1,0:1. Revise as ofertas de cálcio e fósforo. ${context}`);
    } else if(!early&&ratio>1.3) {
      add('CAP_LATE_HIGH','ca-p','caution','ratio',ratio,1.3,
        `${baseMessage}Após a fase inicial, valores acima de 1,3:1 requerem revisão das ofertas de cálcio e fósforo. ${context}`);
    } else if(!early&&ratio>1.2) {
      add('CAP_LATE_INFO','ca-p','info','ratio',ratio,1.2,
        `${baseMessage}A faixa preferencial é 0,8–1,2:1; valores de 1,2–1,3:1 são informativos e devem ser conferidos no contexto clínico. ${context}`);
    }
  }
  return alerts;
}
