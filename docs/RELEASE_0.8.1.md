# GROW_NEO 0.8.1 — avaliação, sem congelamento

Responsável pelas definições: Jefferson Guilherme. Atualização solicitada em 12/10/2026, incluindo escolha expressa de uma casa decimal para volumes e vazão da HV.

## Alterações

- HV: apresentação com uma casa decimal na tela e no PDF. Volumes positivos inferiores a 0,05 mL conservam a precisão anterior para não se tornarem zero. Fórmulas, totais internos, concentrações dos frascos, doses informadas e decisões de viabilidade foram preservados. A nota de preparo explicita a diferença entre apresentação e cálculo interno.
- Salvar/abrir acompanhamento: arquivo local versionado com sexo/IG, medidas Fenton, campos de velocidade e relato. A importação valida antes de substituir entradas, descarta leituras durante as quais houve edição e invalida gráficos/relatórios anteriores. Não há salvamento automático nem parâmetros de NP/HV no arquivo. Não há envio do relato à Fenton. O limite existente de 20 medidas permanece.
- Campo opcional de avaliação nutricional breve: história dirigida relevante, conduta e programação. Reserva de cinco linhas na página 1 A4; quebras de linha e acentos preservados. Texto maior gera aviso sem corte. A página 2 mantém o gráfico inteiro e seus créditos.

## Verificações

- Base local comparada com todos os 145 blobs da árvore remota `703ea8b80ba5f4c3dcbc89e3d632ed2b7da0b05e`, commit `b56bd649b272ebecfb0a54fadf5194c1c29457b1`: idêntica antes das alterações.
- Testes demonstraram as falhas antes das implementações. Suíte final: 769 testes, 769 aprovados, zero falhas, zero exclusões. Cobertura inclui importação inválida, medidas parciais, invalidação do PDF, relato alterado durante geração e vinte medidas com relato, NP 2:1 e avisos de nutrientes, inclusive valores extremos.
- Chrome local: salvar arquivo, rejeitar versão desconhecida preservando entradas, recarregar offline, reabrir acompanhamento offline, acrescentar medida e salvar offline; gerar PDF integrado com 20 medidas e cinco linhas; recusar sexta linha sem cortar; nenhum erro JavaScript.
- Cache 0.8.1 conferido incluindo `followup.js`; tela em 390 px sem transbordamento horizontal.
- PDFs salvos e reabertos: HV com uma página e relatório integrado com duas. Autor `Jefferson Guilherme` conferido nos arquivos finais. Páginas renderizadas e inspecionadas visualmente, sem corte nem sobreposição no cenário verificado.
- Revisão independente de código e testes concluída sem defeitos importantes pendentes.

O ensaio de navegador usa resposta Fenton **simulada**, com gráfico explicitamente rotulado como teste e escores fictícios. Verifica integração e diagramação; não constitui nova consulta real ao serviço, teste em aparelho físico ou validação clínica.

Esta versão permanece em avaliação. Evidências completas são mantidas localmente em `fix081/` no projeto APP_NPP_NEO.
