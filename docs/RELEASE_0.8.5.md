# GROW_NEO 0.8.5 — integração nutricional INTERGROWTH

Responsável pelas decisões e autoria: Jefferson Guilherme. Data: 14/10/2026 (Manaus). Base: 0.8.4, main dec6d899504d053e036ee391def4465bd4fd913e. Publicação pendente.

## Pedido e implementação

O usuário solicitou as mesmas funções da Fenton na aba INTERGROWTH e confirmou incluir acompanhamento, alerta e simulação. A aba passa a integrar os cálculos atuais de Enteral e fonte IV selecionada, incluindo NP/HV combinadas e seus aceites, com as medidas INTERGROWTH e o relato manual. Reutiliza o modelo nutricional Fenton para evitar fórmulas ou critérios divergentes; cálculos antropométricos continuam exclusivamente nas equações INTERGROWTH já implementadas.

O PDF tem exatamente duas páginas A4: aporte, metas, velocidade do intervalo selecionado (se calculada), tabela de todas as medidas com VC serial e relato de até cinco linhas na primeira; os três gráficos vetoriais e resumo da última avaliação na segunda. Texto excedente é recusado, sem corte. PDFs avulsos existentes são preservados. Autor PDF: Jefferson Guilherme. CSV tem escores e VC das medidas reais, com ausências e percentis extremos explicitados.

O arquivo próprio INTERGROWTH salva sexo, medidas, IG opcional ao nascer e relato, sem resultados como válidos, parâmetros de aporte ou projeções. A abertura valida todo o conteúdo antes de substituir campos e exige recalcular os resultados. Não há salvamento automático ou identificação de pacientes.

## Regras metodológicas preservadas

- Fonte dos escores: equações do Apêndice 8, Villar et al. 2015; padrão pós-natal para prematuros, distinto dos padrões de tamanho ao nascer/fetais. [Materiais oficiais](https://intergrowth21.com/tools-resources/postnatal-growth-preterm-infants); [proveniência e equações](INTERGROWTH_INTEGRATION.md).
- IPM exata, inclusive 27+0 a 64+0; sem extrapolação ou mudança automática de referência.
- VC serial = 1000 × diferença de peso / (peso médio × intervalo em dias), pulando avaliações sem peso. Resumo usa o par escolhido pelo médico.
- Alerta definido pelo responsável: queda estrita >2 Z do peso desde o nascimento; exige IG explícita e pesagem correspondente. Fora da faixa, o app informa indisponibilidade; não substitui nascimento pela primeira consulta nem mistura escores Fenton. Comparação descritiva, sem classificação automática do tamanho ao nascer, diagnóstico ou ajuste de doses.
- Simulação: W(t) = W0 × exp(VC × t/1000), t=14/28 dias; VC das duas últimas pesagens válidas. Hipótese de crescimento proporcional constante, sem validação de prognóstico. Peso e IPM fora dos limites ficam sem Z/percentil. Pontos vazados e linha tracejada no gráfico separado; não entram na tabela real, no arquivo ou PDF integrado.

## Verificação

796 testes locais passaram, sem falhas. Incluem regressões de reabertura de peso com três casas decimais, exportação SVG e de percentis extremos no PDF. Revisão independente verificou as duas correções e não apontou bloqueios restantes.

Navegador Chrome local: 20 medidas fictícias, cinco linhas de relato, alerta, simulação, CSV, salvar/reabrir, invalidação de PDF após edição e larguras 320/390/768 sem transbordamento. Recarga offline, reabertura e PDF offline passaram; nenhuma requisição Fenton nessa sequência, nenhum erro JavaScript ou armazenamento automático de caso. PDFs gerados foram reabertos e renderizados para inspeção. Esses testes comprovam o funcionamento técnico; não constituem validação clínica da curva ou prognóstico.

Evidências locais: `update085/tests-final.txt` e `update085/evidence/`. Confirmar a publicação separadamente; testes locais não demonstram alteração do app público.
