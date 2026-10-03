// Regras confirmadas pelo responsável do projeto em 16/09/2026.
// Alertas clínicos orientam a revisão; não acrescentam bloqueios de exportação.
export const ALERT_LABELS = Object.freeze({info:'ORIENTAÇÃO',caution:'ATENÇÃO',high:'ACIMA DO TETO',critical:'ALERTA CRÍTICO'});
export const CEFTRIAXONE_CALCIUM_NOTE='Em recém-nascidos, soluções IV contendo cálcio não devem ser administradas concomitantemente com ceftriaxona devido ao risco de precipitação cálcio-ceftriaxona. A restrição se aplica mesmo com linhas de infusão separadas.';
export const PN_SAFETY_NOTES=Object.freeze([
  'Em neonatos, proteger a solução de nutrição parenteral e o sistema de administração da luz durante toda a infusão.',
  'Monitorização metabólica: glicemia; Na, K, Ca, P e Mg; função renal (ureia e creatinina); triglicerídeos; equilíbrio ácido-base; função hepática, especialmente em NP prolongada.',
  'NP padronizada é adequada para a maioria dos recém-nascidos, porém individualização pode ser necessária em oligúria/anúria, insuficiência renal, distúrbios hidroeletrolíticos importantes, perdas anormais, instabilidade metabólica, colestase/hepatopatia e NP prolongada ou condições especiais.',
  'Na transição NP para NE, conferir os aportes TOTAIS de proteína e energia (NP + enteral e demais fontes em uso) antes de reduzir a NP, para evitar déficit nutricional. O volume enteral isolado não garante adequação.',
  CEFTRIAXONE_CALCIUM_NOTE
]);
export const formatAlertNumber = value => Number.isInteger(value) ? `${value},0` : String(value).replace('.',',');
function formatCalculated(value,reference,above) {
  const display=Number(value.toFixed(6));
  // Não exibir o próprio teto quando a oferta real o ultrapassou por pouco.
  return formatAlertNumber(above&&display===reference?value:display);
}
function formatConcentrationAlert(value) {
  const roundedUp=Math.ceil((value-1e-12)*10)/10;
  return formatAlertNumber(roundedUp);
}

export function macroReference(nutrient,weight,day) {
  return {
    dose:day===1?2:3,
    phase:day===1?'inicial no 1º dia de vida':'de progressão após o 1º dia de vida',
    ceiling:nutrient==='lip'?4:3.5
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
export function compareProducts(left,right) {
  const [a,ap]=decimalProduct(left),[b,bp]=decimalProduct(right);
  const scale=Math.min(ap,bp);
  const delta=a*10n**BigInt(ap-scale)-b*10n**BigInt(bp-scale);
  return delta>0n?1:delta<0n?-1:0;
}

export function nutritionAlerts(input,{volumes,effective,totalVolume,glucosePercent,osmolarity,calciumConcentration,phosphorusConcentration,nonProtein=0}) {
  const alerts=[];
  const context='';
  function add(id,nutrient,level,kind,value,reference,message) {
    alerts.push({id,nutrient,level,kind,value,reference,blocking:false,
      weightKg:input.weight,day:input.day,message:`${ALERT_LABELS[level]}: ${message}`});
  }
  // Exames opcionais: apoio clínico, sem ajuste automático de doses ou bloqueio.
  // Ureia: recomendação ENTERAL condicional, Embleton et al., JPGN 2023.
  if(Number.isFinite(input.urea)&&input.urea>34) {
    add('UREA_HIGH','urea','caution','laboratory',input.urea,34,
      'Ureia >34 mg/dL. Na ausência de desidratação ou disfunção renal e com aporte energético adequado, considerar se a oferta proteica está excedendo a capacidade de utilização. Avaliar contexto clínico antes de reduzir aminoácidos. Referência derivada de recomendação enteral, com evidência limitada para o ponto de corte; não determina redução automática de aminoácidos da NP.');
  }
  // Faixas operacionais aprovadas; Alur e Ramarao (2025) descrevem progressão <265.
  if(Number.isFinite(input.triglycerides)&&input.triglycerides>=250) {
    const high=input.triglycerides>265;
    add(high?'TRIGLYCERIDES_HIGH':'TRIGLYCERIDES_BORDERLINE','triglycerides','caution','laboratory',input.triglycerides,high?265:250,
      (high?'Triglicerídeos elevados; evitar progressão e considerar redução da oferta lipídica conforme contexto clínico e protocolo institucional.':'Triglicerídeos limítrofes; reavaliar progressão da emulsão lipídica.')+
      ' Não há consenso universal sobre um único ponto de corte.');
  }
  if(input.ceftriaxone===true&&effective.ca>0) {
    add('CEFTRIAXONE_CALCIUM','ceftriaxone-calcium','critical','interaction',effective.ca,null,CEFTRIAXONE_CALCIUM_NOTE);
  }
  // Critério operacional aprovado em 02/10/2026; triagem, não diagnóstico.
  // Ofertas efetivas, energia não proteica presente e faixa Ca:P já adotada.
  const highAminoAcids=compareProducts([volumes.aa,0.1],[input.weight,3])>=0;
  const highCaP=effective.p>0&&(effective.ca/2)/effective.p>(input.day===1?1:1.3);
  if(highAminoAcids&&nonProtein>0&&
    (compareProducts([volumes.phosphate,input.pSalt==='kphos'?1.1:1],[input.weight,1])<0||highCaP)) {
    add('ANABOLIC_HYPOPHOSPHATEMIA','refeeding','caution','screening',effective.p,1,
      'Risco de hipofosfatemia anabólica: aporte elevado de aminoácidos/energia requer oferta adequada de fósforo. Confira fósforo, potássio e magnésio séricos. '+
      `AA efetivos: ${formatCalculated(effective.aa,3,false)} g/kg/dia; P efetivo: ${formatCalculated(effective.p,1,false)} mmol/kg/dia. `+
      'Reavalie também a relação molar Ca:P. Triagem operacional, sem diagnóstico automático de síndrome de realimentação.');
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
      :'Acesso periférico selecionado: prescrição e PDF bloqueados. Selecione acesso venoso central ou revise os parâmetros.';
    add('osmolarity-high','osmolarity','caution','concentration',osmolarity,900,
      `osmolaridade estimada: ${formatCalculated(osmolarity,900,true)} mOsm/L (>900 mOsm/L). Esta osmolaridade exige acesso venoso central. ${accessGuidance}`);
  }
  // Wang et al. (Pediatr Neonatol. 2020;61:331-337; PMID 32199865)
  // avaliaram gluconato de cálcio 50 mEq/L + glicerofosfato de sódio
  // 25 mmol/L em formulações neonatais. Esses valores delimitam a composição
  // diretamente estudada; não constituem um limite universal de solubilidade.
  if(totalVolume>0&&effective.ca>0&&effective.p>0) {
    if(input.pSalt==='glycero'&&(calciumConcentration>50||phosphorusConcentration>25)) {
      add('CAP_CONCENTRATION_STUDIED_RANGE','ca-p-compatibility','caution','concentration',
        Math.max(calciumConcentration/50,phosphorusConcentration/25),1,
        `concentração mineral elevada: Ca ${formatConcentrationAlert(calciumConcentration)} mEq/L; P ${formatConcentrationAlert(phosphorusConcentration)} mmol/L. Um ou mais valores excedem a composição estudada com gluconato de cálcio e glicerofosfato de sódio. Confirme a compatibilidade físico-química com a farmácia responsável.`);
    } else if(input.pSalt==='kphos') {
      add('CAP_INORGANIC_COMPATIBILITY','ca-p-compatibility','caution','compatibility',null,null,
        `cálcio associado a fosfato inorgânico: Ca ${formatConcentrationAlert(calciumConcentration)} mEq/L; P ${formatConcentrationAlert(phosphorusConcentration)} mmol/L. Confirme a compatibilidade em curva específica da formulação com a farmácia responsável.`);
    }
  }
  for(const [id,name,concentration] of [['aa','Aminoácidos',0.1],['lip','Lipídios',0.2]]) {
    const {dose,phase,ceiling}=macroReference(id,input.weight,input.day);
    const requested=input[id];
    const aboveRequested=ceiling!==null&&requested>ceiling;
    const aboveEffective=ceiling!==null&&compareProducts([volumes[id],concentration],[input.weight,ceiling])>0;
    const aboveCeiling=aboveRequested||aboveEffective;
    const relation=requested<dose?'abaixo':requested>dose?'acima':'na referência';
    const level=aboveCeiling?'high':requested===dose?'info':'caution';
    let message=`${name}: ${formatAlertNumber(requested)} g/kg/dia (${relation} da referência ${phase}: ${formatAlertNumber(dose)} g/kg/dia). `;
    if(aboveCeiling) {
      const source=aboveRequested&&aboveEffective?'solicitada e efetiva':aboveRequested?'solicitada':'efetiva após arredondamento dos volumes de preparo';
      message+=`A dose ${source} ultrapassa o teto de ${formatAlertNumber(ceiling)} g/kg/dia. Revise a prescrição. `;
    } else {
      message+=requested===dose?'Dose na referência habitual. ':`Revisar conforme o contexto clínico. `;
    }
    add(`${id}-${aboveCeiling?'ceiling':requested===dose?'guidance':'reference'}`,id,level,
      aboveCeiling?'ceiling':'reference',aboveRequested?requested:aboveEffective?effective[id]:requested,
      aboveCeiling?ceiling:dose,message);
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
