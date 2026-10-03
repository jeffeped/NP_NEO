# GROW_NEO 0.7.10 — relatório integrado em um comando

Solicitação de Jefferson Guilherme em 02/10/2026, após conferir o PDF da 0.7.9: reduzir a sequência de cálculos, botões e links necessária para chegar ao relatório integrado. Base: `8d05092f1a85287ef292680ac353d731c507c0ff`.

## Comportamento

- **Gerar relatório integrado — 2 páginas** aparece antes do gráfico e prepara o aporte a partir dos campos atuais da Enteral. Não é necessário calcular ou exportar a Enteral separadamente.
- Campos de velocidade preenchidos são calculados pela rotina existente. Campos todos vazios permitem relatório sem velocidade; preenchimento parcial ou inválido exige correção.
- O comando obtém gráfico e escores Fenton automaticamente. Gráfico e tabela da mesma entrada são reutilizados, inclusive offline; uma consulta já em andamento é aguardada sem duplicação.
- **Ver gráfico Fenton** permanece como ação secundária. Os arquivos avulsos e o link de novo download ficam em **Outras opções de exportação**, inicialmente recolhidas.
- Fontes IV precisam continuar calculadas e confirmadas. Os bloqueios e os aceites de doses/água são preservados. Edições, recálculos ou retirada de confirmação invalidam o download e impedem concluir relatórios desatualizados.
- O gerador e a estrutura do PDF permanecem iguais: aporte, crescimento e tabela na página 1; gráfico na página 2. Fórmulas, fatores energéticos e envio de dados ao serviço Fenton não foram alterados.

## Verificação local

- 691 testes aprovados, zero falhas e zero exclusões, incluindo nove testes novos do fluxo integrado com os módulos reais de Enteral, crescimento e Fenton.
- Chrome 154: preenchimento sem cliques intermediários, download automático em duas páginas, extração de escores após CSV 502, atualização após edição, exportação offline com gráfico em memória, link de download alternativo, cache da versão e ausência de persistência de casos.
- Larguras 320, 390 e 768 px sem rolagem horizontal; ação principal antes do gráfico e opções avulsas recolhidas. Capturas de tela e páginas do PDF inspecionadas visualmente.
- Reprodução: `node --test tests/*.test.js`. Ensaio de navegador: `GROW_QA_MODULES` aponta para uma instalação de Playwright; executar `node scripts/verify-fenton-pdf.cjs`. `GROW_QA_CHROME` é opcional para usar um Chrome já instalado.

O ensaio de navegador usa transporte, gráfico, medidas e escores simulados, identificados no PDF de teste. Não confirma uma nova consulta real à API Fenton nem constitui validação clínica. Nenhum documento ou dado enviado pelo usuário foi incorporado ao repositório.
