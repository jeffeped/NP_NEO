// Parse the CSV returned by the official Fenton service. Values are never estimated locally.
const HEADER=['GA_weeks','Weight_g','W_Z','W_changeZ','W_%','Head_cm','H_Z','H_changeZ','H_%','Length_cm','L_Z','L_changeZ','L_%'];
const number=value=>{const clean=value.trim();return clean===''||clean==='~'?null:Number(clean);};

export function parseFentonScores(csv,data){
 const lines=String(csv).replace(/^\uFEFF/,'').trim().split(/\r?\n/).map(line=>line.split(','));
 const header=lines.findIndex(row=>row.join(',')===HEADER.join(','));
 if(header<0||lines[header+1]?.length!==HEADER.length)throw new Error('Formato da tabela Fenton não reconhecido.');
 const meta=lines.slice(0,header);
 if(meta.find(row=>row[0].startsWith('Sex:'))?.[0]?.slice(4).trim()!==data.sex)throw new Error('Sexo diferente entre gráfico e tabela Fenton.');
 const birth=Number(meta.find(row=>row[0].startsWith('GA at Birth:'))?.[0]?.slice(12).trim());
 if(!Number.isFinite(birth)||Math.abs(birth-(data.birthGaWeeks+data.birthGaDays/7))>.0001)throw new Error('IG ao nascer diferente entre gráfico e tabela Fenton.');
 const rows=lines.slice(header+1).filter(row=>row.some(cell=>cell.trim()));
 if(rows.length!==data.measurements.length)throw new Error('Número de medidas diferente entre gráfico e tabela Fenton.');
 return rows.map((cells,index)=>{
  if(cells.length!==HEADER.length)throw new Error('Linha incompleta na tabela Fenton.');
  const values=cells.map(number),measurement=data.measurements[index];
  const age=measurement.weeks+measurement.days/7;
  if(!Number.isFinite(values[0])||Math.abs(values[0]-age)>.0001)throw new Error('Idade diferente entre gráfico e tabela Fenton.');
  const fields=[['weightGrams',1,2,4],['headCm',5,6,8],['lengthCm',9,10,12]];
  const scores={ageWeeks:values[0]};
  for(const [name,valueColumn,zColumn,pColumn] of fields){
   const measured=measurement[name],value=values[valueColumn],z=values[zColumn],percentile=values[pColumn];
   if(measured==null){if(value!==null||z!==null||percentile!==null)throw new Error('Medida extra na tabela Fenton.');scores[name]=null;continue;}
   if(!Number.isFinite(value)||Math.abs(value-measured)>.011||!Number.isFinite(z)||!Number.isFinite(percentile)||percentile<0||percentile>100)throw new Error('Medida ou escore incompatível na tabela Fenton.');
   scores[name]={value,z,percentile};
  }
  return scores;
 });
}
