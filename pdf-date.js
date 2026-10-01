export function formatIssueDate(date=new Date()){
 return 'Emissão: '+new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Manaus',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date).replace(',', '')+' (Manaus)';
}
// Applied at export time to every page of reports authored by GROW_NEO.
// The original Fenton service PDF retains its own issuance date unchanged.
export async function stampPdfIssueDate(doc,date=new Date()){
 const {StandardFonts,rgb}=globalThis.PDFLib;
 const font=await doc.embedFont(StandardFonts.Helvetica),label=formatIssueDate(date);
 doc.setCreationDate(date);doc.setModificationDate(date);
 for(const page of doc.getPages())page.drawText(label,{x:38,y:14,size:8,font,color:rgb(.32,.39,.35)});
}
