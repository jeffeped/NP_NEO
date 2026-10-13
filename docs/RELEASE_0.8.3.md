# GROW_NEO0.8.3 — avaliação, sem congelamento

Responsável pelas definições: Jefferson Guilherme. Requisitos e escolhas confirmados no chat em12/10/2026.

## Alerta

Queda do Z do peso **superior a2pontos**, comparando a última pesagem válida com a medida na IPM exata do nascimento. A medida posterior nunca substitui a referência ao nascimento. Escores precisam corresponder aos pesos e às idades atuais. Sem referência/escores, informar indisponibilidade. Texto: risco deRCEU; avaliar aporteproteico-calórico e discutir o caso com especialista. Limiar operacional definido pelo responsável; não é diagnóstico automático/universal. Artefatos de subtração binária são removidos sem usar o arredondamento da exibição como decisão.

## Projeção

VC das duas últimas pesagens válidas da tabela Fenton, pelo peso médio. Simulação proporcional constante: W(t)=W(atual)×exp(VC×t/1000), t14/28dias. Hipótese matemática; não é modelo prognóstico clínico validado. Pesos estimados arredondados ao grama são consultados no serviço para obter Z/P e gráfico separado, claramente marcado como hipotético. Não acrescentar à tabela real, arquivos de acompanhamento ou PDF integrado. Não projetar PC/comprimento. Fora22–50semanas/100–20000g ou valor não finito: explicar indisponibilidade e não consultar valores inválidos.

## Verificações

-783testes locais aprovados, zero falhas/exclusões. Testes falharam antes das implementações. Regressões da revisão reproduzidas e corrigidas: corte estrito2Z e nova consulta antes da resposta antiga, inclusive preservação diante de rejeição tardia.
- Revisão independente:9testes direcionados reexecutados após correções, nenhum defeito importante pendente.
- Chrome local com resposta Fenton simulada: alerta2,10 desde nascimento; posições14/28 com peso/Z/P e gráfico hipotético; dados e gráfico real preservados; projeções não entram no arquivo salvo; edição descarta simulação e permite nova consulta antes da resposta antiga.390px sem transbordamento da página, tabela horizontal legível e gráfico inteiro. Nenhum erro JavaScript.
- PDFs de HV/integrado e acompanhamento offline anteriores continuam verificados no navegador; autoria Jefferson Guilherme e duas páginas do integrado conferidas nos arquivos salvos. Os novos recursos são da tela, sem alteração do PDF integrado.
- Teste real na origem local bloqueado pela restrição de origem do proxy, que aceita apenas o endereço público do app. Conferência pública será documentada no registro local de publicação, sem confundir teste simulado com consulta real.

## Referências e decisões

ESPGHAN2022/2023seçãoGROWTH: https://onlinelibrary.wiley.com/doi/full/10.1097/MPG.0000000000003642. Discute trajetória e limitações da mudança deZ; não estabelece este limiar2Z como diagnóstico universal. Peila2020 https://pubmed.ncbi.nlm.nih.gov/32357530/ descreve definições transversais/longitudinais heterogêneas; Maiocco2020 https://pubmed.ncbi.nlm.nih.gov/33330271/ avalia proposta pós-perda. Esses dados foram discutidos com o responsável, que escolheu explicitamente a referência ao nascimento e o limiar de alerta2Z.

A fórmula exponencial aqui é uma hipótese de simulação; a manutenção futura da VC não é garantida. Nenhuma recomendação de aumentar aporte em percentual foi automatizada. O exemplo clínico enviado pelo usuário contextualiza a decisão médica e permanece separado dos cálculos do app.
