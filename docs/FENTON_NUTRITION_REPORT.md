# Aporte total e Fenton em duas páginas - 0.7.3

Solicitação de Jefferson Guilherme em 30/09/2026. Alteração de apresentação e exportação; fórmulas clínicas preservadas. Publicada em 30/09/2026 após a verificação descrita ao final.

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


## Verificação final e estado de entrega

- Suíte local final registrada em 30/09/2026: **479 testes aprovados, zero falhas**. Foi excluído somente o teste de dimensões dos ícones de marca, que não foram modificados nem estavam disponíveis naquela cópia de trabalho.
- Para os testes DOM foi utilizada a distribuição oficial autocontida worker.js do linkedom v0.18.12, obtida do repositório WebReflection/linkedom; versão idêntica à dependência fixada. Não houve alteração de dependências do aplicativo.
- Na etapa local, a criação de branch e tree foi recusada pela ferramenta, impedindo a publicação naquele momento.
- Retomada: os 18 arquivos previstos foram enviados à branch feature/fenton-nutrition-pdf-073 em dois commits, 81db312b7e4a00d62e71538eb083510819689381 e d8ae7634106c5be25fce8966df3bb2ef26c5da5a. A comparação com a base pública 758eb81c7c3f4fbf50ae02798e6ad3fb98d7110d confirmou os caminhos previstos e a preservação dos assets.
- PR #28 integrado após **480 testes aprovados, zero falhas, zero exclusões**, no commit 743ed90154a1eed920f2ec1336d87e8e3fc85d04. Evidência: https://github.com/jeffeped/NP_NEO/actions/runs/36773885324.
- Commit de integração/publicação: ab264267aefaf002d4a8d03719f69c85ed4ac72c. Implantação GitHub Pages concluída com sucesso: https://github.com/jeffeped/NP_NEO/actions/runs/36773998578.
- Verificação pública após a implantação: engine.js informa 0.7.3; sw.js informa cache 0.7.3 e inclui os dois módulos novos; index.html contém o botão do relatório combinado e não contém o antigo link “Abrir plotador Fenton”.
- Endereço: https://jeffeped.github.io/NP_NEO/. Publicação autorizada por Jefferson Guilherme.
- Limite desta conferência remota: não foi feita interação de navegador com a API Fenton real nem geração de um PDF em produção. Permanecem válidos os ensaios técnicos anteriores com resposta simulada; não equivalem à validação clínica.
