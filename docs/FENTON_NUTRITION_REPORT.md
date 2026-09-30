# Aporte total e Fenton em duas páginas - 0.7.3

Solicitação de Jefferson Guilherme em 30/09/2026. Alteração de apresentação e exportação; fórmulas clínicas preservadas. Preparada para revisão, sem publicação nesta etapa.

## Requisitos e decisões

- R-027 / D-024 (pedido do usuário): retirar da GROW_Fenton o botão de abrir o plotador externo e suas instruções; manter a integração oficial dentro do app.
- R-028 / D-025 (pedido do usuário): exportar um relatório com exatamente duas páginas A4: aporte total na primeira e gráfico Fenton na segunda.
- R-029 / D-026 (decisão técnica): reutilizar os objetos atuais da integração nutricional, da velocidade ponderal e a imagem oficial recebida de Fenton. O relatório não recalcula aportes, curvas ou velocidade.
- R-030 / D-027 (decisão técnica): invalidar downloads e exportações em andamento quando dados ou resultados mudarem. Revalidar impedimentos da fonte IV e aceite de doses da NP individualizada no novo botão.
- R-031 / D-028 (decisão técnica): montagem local do PDF com a imagem JPG já recebida. O PDF nativo da API pode conter duas páginas próprias; concatená-lo não garantiria o total solicitado. A imagem é inserida inteira, proporcional e sem recorte, preservando créditos originais.

## Uso e conteúdo

1. Calcular a fonte IV em uso e o aporte total na aba Enteral (inclui opção sem IV).
2. Opcionalmente calcular a velocidade ponderal na GROW_Fenton.
3. Informar medidas seriadas e clicar em **Ver gráfico Fenton**.
4. Clicar em **Exportar aporte total + Fenton em PDF**.

A primeira página inclui fonte IV, peso utilizado quando disponível, dieta e composição, FM85, tabela de taxa hídrica/energia/proteína por via e total, metas de transição, velocidade quando calculada e referências da fase clínica selecionada. Numeta 2:1 conserva o aviso sobre lipídios separados. Sem velocidade calculada, o relatório informa a ausência. Sexo ou IG discordantes entre velocidade e gráfico impedem combinar os resultados.

A segunda página contém a imagem oficial, contexto de sexo/IG/IPM e número de medidas. Os dados nutricionais não são enviados a Fenton. A integração externa permanece limitada ao contrato antropométrico existente.

O gráfico exige internet para geração. Com ele já disponível na memória da sessão, a montagem do relatório funciona offline. Recarregar descarta medidas, gráfico e relatório, inclusive offline. Não há persistência de casos nem cache de gráficos.

## Verificação técnica

- 15 testes do novo PDF aprovados localmente: quatro fontes nutricionais, três fases clínicas, ausência de velocidade, dados obrigatórios e discordância de contexto. Os testes verificam duas páginas, metadados, valores esperados, limites de texto e preservação dos objetos calculados.
- Suíte local sem dependência de DOM: 373 testes executados; cinco falharam inicialmente por ausência local do logo UEA. O arquivo original foi recuperado da cópia local e seu SHA Git conferido contra o repositório; os testes afetados passaram na repetição dirigida (7 testes).
- Navegador Chrome/Windows headless: botão e download, ausência de cálculo/gráfico, invalidação após edição, larguras de 320/390/768 px, geração offline com gráfico na memória, recarga offline e armazenamento local vazio aprovados. Nenhuma exceção JavaScript.
- Duas páginas do PDF sintético renderizadas com Poppler e inspecionadas: sem cortes, sobreposição ou perda da borda da imagem.
- Os sete novos testes de interface cobrem geração, ausência de entradas, invalidação, corrida assíncrona e aceite de doses. Sua execução completa está a cargo do CI junto com a suíte existente.

### Limitações

O serviço Fenton e os arquivos de marca não alterados foram simulados no ensaio local de navegador; o JPG de teste contém identificação explícita de simulação e as mesmas dimensões 2550 x 3300 registradas para a API. O transporte real já existente não foi modificado. Não foi realizada nova consulta real à API nesta etapa, nem teste em celular físico. Verificação técnica não equivale a validação clínica.

Nenhum PDF ou dado de paciente faz parte deste registro ou do repositório.


## Verifica??o final e estado de entrega

- Su?te local final: **479 testes aprovados, zero falhas**. Foi exclu?do somente o teste de dimens?es dos ?cones de marca, que n?o foram modificados nem estavam dispon?veis nesta c?pia de trabalho.
- Para os testes DOM foi utilizada a distribui??o oficial autocontida worker.js do linkedom v0.18.12, obtida do reposit?rio WebReflection/linkedom; vers?o id?ntica ? depend?ncia fixada. N?o houve altera??o de depend?ncias do aplicativo.
- Cria??o de branch e tree no GitHub recusadas pela ferramenta: `MCP tool call requires approval, but approval policy is never`. Nenhuma branch, PR, commit remoto ou publica??o foi criada. CI remoto n?o executado.
- A implementa??o e os testes permanecem na branch Git local feature/fenton-nutrition-pdf. Base p?blica consultada: 758eb81c7c3f4fbf50ae02798e6ad3fb98d7110d.
