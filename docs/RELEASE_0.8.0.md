# GROW_NEO 0.8.0 — correções da auditoria

Preparada em 11/10/2026 a partir da versão 0.7.11, commit `5c92ba779f01f097f7c7f81f44d441a188943255`. Versão de avaliação, **sem congelamento**. Publicação autorizada por Jefferson Guilherme em 11/10/2026. Responsável pelas definições: Jefferson Guilherme.

## Correções

| Achado | Comportamento corrigido |
| --- | --- |
| A-01: pesos com separador de milhar | `1.000`, `1.100` e `1.300` são interpretados como 1000, 1100 e 1300 g no crescimento. O peso ao nascer Enteral `2.000` é interpretado como 2000 g. Usa o parser de pesos já existente no motor. |
| A-02: PDF Enteral desatualizado | Editar ou recalcular crescimento remove o link do PDF anterior, mantendo os totais nutricionais. A geração confere resultado, crescimento e revisão antes de publicar o arquivo ou processar um erro. O download continua validando a fonte intravenosa. |
| A-03: crescimento sobreposto ao rodapé | O bloco de crescimento permanece inteiro e recebe uma página de continuação quando o espaço restante não comporta seu conteúdo acima do rodapé. As páginas de dados recebem rodapé e data de emissão. |
| A-04: autoria dos PDFs | Metadados Author padronizados como Jefferson Guilherme em Enteral, HV e INTERGROWTH, incluindo a prancha. Creator do Enteral também padronizado; identificadores de produto dos demais geradores preservados. |
| A-05: excesso de capacidade numérica | Resultados não finitos são recusados no cálculo Enteral, na integração e na avaliação das metas. Não acrescenta limites clínicos arbitrários; mantém o tratamento e os avisos existentes para composição negativa. |

Versão sincronizada em motor, pacote, lock, README e cache offline. As regras clínicas e os fatores energéticos vigentes foram preservados.

## Verificação

- Base antes das alterações: 742 testes aprovados. Versão final: **757 testes aprovados, zero falhas, zero exclusões**, Node 24.19.0.
- Testes de regressão reproduziram os cinco achados antes da implementação. Dois testes posteriores reproduziram uma falha tardia de exportação e a necessidade de preservar a invalidação da fonte IV.
- Chrome: pesos agrupados, inaplicabilidade da referência abaixo de 1800 g para peso ao nascer de 2000 g, link invalidado após editar/recalcular crescimento, PDF novo offline e bloqueio de excesso numérico; nenhum erro JavaScript registrado.
- O PDF anterior apresenta 16,7 g/kg/dia; o PDF novo, gerado após editar o peso final de 1300 para 1400 g, apresenta 24,0 g/kg/dia.
- Verificações existentes de avisos clínicos, não persistência dos casos, exportação offline e larguras 320/390/768 px aprovadas.
- Fluxo integrado Fenton aprovado com resposta de transporte, gráfico e escores **simulados**, incluindo falha CSV e recuperação pelo PDF, cache offline e invalidação após edição.
- 14 PDFs salvos e reabertos com autoria Jefferson Guilherme. PDF Enteral com Numeta 2:1, avisos negativos e crescimento: duas páginas de dados, sem linhas do corpo na área reservada ao rodapé; ambas renderizadas e inspecionadas.
- Revisão independente: 15 casos adicionais de parser e 240 combinações de PDF conferidas pelo revisor; achado de erro tardio corrigido e aprovado na revisão final.

Reproduzir a suíte: `node --test tests/*.test.js`. Scripts de navegador existentes: `scripts/verify-clinical-safety.cjs` e `scripts/verify-fenton-pdf.cjs`, com Playwright e Chrome configurados conforme seus comentários iniciais.

## Limites da verificação

A entrega foi verificada localmente no Chrome e no Node. O teste Fenton usa dados sintéticos e não comprova conectividade atual com o serviço externo nem validade científica dos escores simulados. Não foi realizada validação clínica prospectiva nem instalação em dispositivos iOS/Android físicos. A publicação mantém o status de avaliação; o congelamento não foi autorizado.
