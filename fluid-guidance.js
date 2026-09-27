// Jochum et al., Clin Nutr. 2018;37:2344–2353, Tables 1–3.
// https://doi.org/10.1016/j.clnu.2018.06.948
// Os máximos são referências por fase, não uma avaliação de perdas, fototerapia
// ou outros aportes. O peso ao nascer determina a faixa nos dias 1–5.
const EARLY_MAX=Object.freeze({
  term:[60,70,80,100,140],
  pretermOver1500:[80,100,120,140,160],
  preterm1000to1500:[90,110,130,150,180],
  pretermUnder1000:[100,120,140,160,180]
});

export function fluidGuidance({day,gaWeeks,birthWeight,phase}) {
  if(!Number.isInteger(day)||day<1||!Number.isInteger(gaWeeks)||gaWeeks<0)throw new Error('Dia de vida e idade gestacional inválidos.');
  const term=gaWeeks>=37;
  if(day<=5){
    if(!term&&(!Number.isFinite(birthWeight)||birthWeight<=0))throw new Error('Informe o peso ao nascer para selecionar a faixa de prematuridade nos dias 1 a 5.');
    const band=term?'term':birthWeight<1?'pretermUnder1000':birthWeight<=1.5?'preterm1000to1500':'pretermOver1500';
    const label={term:'RN a termo',pretermUnder1000:'prematuro <1000 g ao nascer',preterm1000to1500:'prematuro de 1000 a 1500 g ao nascer',pretermOver1500:'prematuro >1500 g ao nascer'}[band];
    return {max:EARLY_MAX[band][day-1],reference:`Tabela 1 · ${label} · D${day}`,phase:'adaptation'};
  }
  if(day>30)return {max:null,reference:'Tabelas neonatais de fluidos não definem um teto após o 30º dia.',phase:null};
  if(!['intermediate','stable'].includes(phase))throw new Error('Após o 5º dia, selecione fase intermediária ou crescimento estável.');
  const max=phase==='intermediate'&&term?170:160;
  return {max,reference:`Tabela ${phase==='intermediate'?2:3} · ${term?'RN a termo':'prematuro'} · ${phase==='intermediate'?'fase intermediária':'crescimento estável'}`,phase};
}
