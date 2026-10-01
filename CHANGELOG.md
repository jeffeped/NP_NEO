# Histórico de versões

## 0.7.4 · em revisão (pull request)

- NP individualizada: osmolaridade estimada acima de 900 mOsm/L em acesso periférico passa a bloquear prescrição e PDF. Em acesso central, segue como orientação. Decisão do responsável clínico em 01/10/2026.
- HV: acesso venoso (central ou periférico) passa a ser obrigatório. Em acesso periférico, glicose final acima de 12,5% (comparação exata, 125 mg/mL) ou osmolaridade estimada acima de 900 mOsm/L bloqueia composição e PDF. O PDF registra o acesso.
- CI: testes passam a rodar também em push para a `main`, não só em pull request.
- Corrige a paginação de Wang et al. (Pediatr Neonatol. 2020;61:331-337; PMID 32199865) em `alerts.js` e no README.
- Atualiza versão e cache para 0.7.4. 492 testes locais aprovados (480 anteriores, dois deles reescritos pela nova regra, e 12 novos).

## 0.7.3 — publicada em 30/09/2026 (Manaus)

- Retira o link do plotador externo da GROW_Fenton e suas instruções.
- Acrescenta PDF A4 de duas páginas: aporte nutricional total, metas e velocidade na primeira; gráfico oficial Fenton completo na segunda.
- Reutiliza os resultados da sessão, aplica as travas da fonte IV e o aceite de doses; edições invalidam relatórios e exportações em andamento.
- Montagem local, disponível offline com o gráfico já recebido na sessão; versão e cache coordenados.
- Evidências e limites em docs/FENTON_NUTRITION_REPORT.md. PR #28 integrado; 480 testes aprovados, sem falhas nem exclusões; implantação no GitHub Pages confirmada.

## 0.7.2 — publicada em 29/09/2026 (Manaus)

- Reorganiza as oito abas em duas colunas fixas: NP ind, NP padrão, HV e Resultados à esquerda; Enteral, GROW_Fenton, INTERGROWTH e Notas à direita. A ordem do teclado acompanha a disposição visual.
- Renomeia Crescimento para **GROW_Fenton** e Ambulatório para **INTERGROWTH**, inclusive nas instruções de navegação.
- Acrescenta cálculo local de velocidade ponderal **observada** entre duas avaliações selecionadas: variação em gramas, g/dia e g/kg/dia por Average2pt, com o intervalo exato de IPM em dias. Não atribui percentis, escores Z, metas ou classificação INTERGROWTH à velocidade.
- Documenta a pesquisa de fontes e os limites de interpretação; mantém separados os padrões antropométricos e o cálculo de velocidade entre medidas.
- Atualiza versão e cache para 0.7.2 e inclui o novo módulo no conjunto de arquivos offline. Publicada pela PR #27 após 458 testes locais aprovados e sucesso no GitHub Actions; conferidos a atualização para 0.7.2, o indicador de preparação offline, o cálculo e os dois PDFs no aplicativo oficial.

## 0.7.1 — 28/09/2026 (Manaus)

- Acrescenta **Curvas em 1 página** à aba Ambulatório: PDF A4 vertical com peso, comprimento e perímetro cefálico alinhados pela IPM, trajetórias de todas as medidas e resumo da última avaliação.
- Mantém a opção **Relatório detalhado**, com tabelas completas. A composição de uma página é própria do GROW_NEO e usa os mesmos cálculos e limites do padrão pós-natal INTERGROWTH-21st.
- Invalida os dois formatos após editar os dados e impede disponibilizar um PDF antigo se o formulário mudar durante a exportação.
- Atualiza versão e cache para 0.7.1.
- Publicada pela PR #26 após 436 testes aprovados; conferidos os dois PDFs no aplicativo oficial e o indicador de preparação para uso offline.

## 0.7.0 — 28/09/2026 (Manaus)

- Acrescenta a oitava aba, **Ambulatório**, com o padrão pós-natal INTERGROWTH-21st para prematuros, para peso, comprimento e perímetro cefálico por sexo, entre 27+0 e 64+0 semanas de idade pós-menstrual.
- Implementa localmente as equações publicadas por Villar et al. (2015), Apêndice 8, usando a IPM exata em semanas e dias. Calcula escores Z e percentis, desenha curvas e trajetórias de até 20 avaliações e gera PDF separado no aparelho.
- Rejeita extrapolação etária, IPM repetida ou decrescente e erros evidentes de unidade. Alterações de entrada invalidam resultados e arquivos anteriores. A nova aba não transmite medidas nem mantém histórico de pacientes.
- Documenta as fontes, equações, conferência com tabelas oficiais, população de origem e limites de uso. Não há transição automática para curvas OMS após 64 semanas de IPM.
- Atualiza o cache offline para incluir os módulos da nova aba; preserva a política de conexão específica da integração Fenton.
- Confere no navegador os gráficos, resultados, download do PDF, invalidação por edição e rejeição de IPM fora da faixa. Página de teste responsivo cobre larguras de 320, 390 e 720 pixels, com rolagem horizontal limitada aos gráficos.

## 0.6.8 — correção da conexão Fenton (28/09/2026)

- Corrige a política de segurança da página (CSP): `connect-src 'self'` bloqueava a chamada ao Worker, mesmo com os endpoints e o CORS funcionando. A política agora permite também a origem HTTPS exata do Worker configurado.
- Atualiza a versão do cache offline para que aparelhos instalados recebam a política corrigida.
- Acrescenta teste de regressão que relaciona o endereço configurado à política da página, impedindo a omissão do Worker ou a liberação de destinos adicionais.

## 0.6.7 — publicada em 28/09/2026

- Prepara formulário de medidas seriadas da Fenton 2025 na aba Crescimento, com gráfico JPG exibido no app, PDF e tabela de escores Z em CSV. O formulário aparece somente após configurar o endereço HTTPS do serviço intermediário.
- Acrescenta código de Worker para enviar à Fenton apenas sexo, IG ao nascer, IPM e medidas, guardando a chave em segredo privado. Valida entrada, limita consultas, restringe origens, impede que URLs de gráficos apontem a outro servidor e não inclui identificadores ou data de nascimento no CSV.
- Mantém o link externo da Fenton enquanto o serviço intermediário não for implantado e testado com credencial configurada fora do repositório.

## 0.6.6 — em revisão

- Orienta, logo abaixo do link do plotador Fenton 2025 na aba Crescimento, a rolar até o bloco “Measurements” para informar medidas individuais.

## 0.6.5 — em revisão

- Acrescenta à NP padrão a escolha da apresentação Numeta G13%E 2:1 (240 mL, sem fração lipídica), além da 3:1 (300 mL). Calcula proteína, glicose, energia, sódio, fósforo e demais ofertas pelos valores da bolsa inteira correspondente, exibindo também a composição por 100 mL na tela e no PDF.
- Aplica os limites próprios da bula para volume, vazão e osmolaridade de cada apresentação; mantém teto do projeto de 3,5 g/kg/dia de aminoácidos. A 2:1 não calcula oferta de lipídios, alerta que lipídios administrados à parte ficam fora dos totais e atualiza a energia integrada à enteral.
- Referência: Baxter, SmPC Numeta G13%E Preterm, seções 2 e 4.2, atualizado em 19/05/2026. Conferir correspondência da apresentação com o produto local antes do uso clínico.
- Disponibiliza na aba Crescimento o link externo para o plotador oficial Fenton 2025 (fentongrowth.ca), sem transferência automática dos parâmetros do app.

## 0.6.4 — em revisão

- Padroniza a entrada e a exibição dos pesos em gramas na NP individualizada, NP padrão, HV e integração enteral, mantendo conversão interna para kg nas fórmulas e limites por peso; PDFs também usam gramas para os pesos. Entradas de peso fora de 100–20.000 g são rejeitadas nas três modalidades intravenosas para evitar interpretação de valores antigos em kg.
- Renomeia a régua nutricional como “Metas de transição PN / EN” na tela e no PDF, sem alterar seus critérios.
- Substitui os ícones de instalação NP_NEO pela logo atual GROW_NEO, inclusive no atalho do iPhone e na variante maskable do Android; arquivos com novos nomes evitam ícones antigos em cache.
- Bloqueia a NP individualizada e o PDF se a VIG solicitada ou efetiva após arredondar SG 50% ultrapassar 12 mg/kg/min; mostra a VIG efetiva na tela e no PDF.
- Rejeita erros evidentes de unidade ou digitação em peso atual (0,1–20 kg), peso ao nascer (0,1–10 kg), idade gestacional (18–45 semanas), dia de vida (1–365) e taxa hídrica acima de 500 mL/kg/dia. Destaca o campo em vermelho e exige recálculo; essas faixas são barreiras amplas de entrada, não metas clínicas.
- Abaixo de 80 mL/kg/dia solicitados ou efetivos, mostra aviso amarelo sobre considerar glicerofosfato de sódio no lugar de fosfato de potássio quando houver cálcio e fósforo. Não bloqueia PDF e solicita conferência farmacêutica da compatibilidade.
- Na NP individualizada, bloqueia a prescrição e o PDF se aminoácidos solicitados ou efetivos ultrapassarem 3,5 g/kg/dia, se a concentração final de aminoácidos ultrapassar 4%, se a concentração final de glicose ultrapassar 25% ou se a infusão lipídica efetiva ultrapassar 4 g/kg/dia em 24 horas (limite horário exato de 4/24 g/kg/h).
- Aplica o teto de aminoácidos de 3,5 g/kg/dia também à NP padrão, independentemente do peso; preserva os alertas de referência e a cautela de glicose acima de 20%.
- Se os componentes excederem o volume solicitado, mostra aviso amarelo e usa a soma efetiva dos componentes como volume total, com água q.s.p. zero. Exibe solicitado e efetivo, recalcula vazão, taxa hídrica e concentrações, e permite PDF se as demais regras estiverem atendidas.
- Mostra na tela e no PDF as concentrações finais de aminoácidos e glicose e a taxa efetiva de lipídios; os bloqueios usam valores internos após o arredondamento de preparo.
- Aplica o máximo de fluidos da diretriz ESPGHAN/ESPEN nos dias 1–5 conforme prematuridade e peso ao nascer, e em D6–D30 conforme fase intermediária ou estável selecionada pelo médico. Taxa solicitada ou efetiva acima da referência bloqueia; após D30 exibe apenas aviso. Mantém a referência identificada na tela e no PDF.


## 0.6.3 — em revisão

- Na aba Enteral, oferece a opção de FM85 em dietas alternadas de igual volume: 1 g por 25 mL em metade das dietas equivale, em média, a 0,5 g por 25 mL ou 2 g por 100 mL do leite total.
- Usa g/25 mL para as opções e o campo personalizado, convertendo internamente para g/100 mL. Explicita que a dose personalizada é a média sobre todo o leite do dia e que a composição analisada deve ser informada antes da adição do FM85; valores já fortificados exigem selecionar “Não”.
- Exige preenchimento da dose personalizada, sem interpretá-la silenciosamente como ausência de FM85.
- Limpa a concentração do FM85 ao trocar leite humano por fórmula e impede que o motor acrescente FM85 diretamente a uma fórmula.
- Mostra proteína enteral com duas casas decimais na tela e no PDF, como na tabela de aportes totais.

## 0.6.2 — em revisão

- Quando o glicerofosfato de sódio fornece sódio, exibe a dose solicitada e a oferta total efetiva, discriminando a parcela do glicerofosfato e a do NaCl ou acetato após o arredondamento dos volumes.
- Exige aceite explícito da oferta total de sódio antes da exportação do PDF, inclusive se o fósforo fornecer mais sódio que o solicitado ou se não houver sal complementar. Novo cálculo exige novo aceite.
- Registra a discriminação do sódio no PDF e conserva os cálculos e aceites já existentes para potássio e demais nutrientes.

## 0.6.1 — em revisão

- Reforça visualmente os limites das abas, com borda, fundo e relevo próprios de botão, preservando o destaque verde da aba selecionada.
- Inclui o último cálculo válido da aba Crescimento no PDF de aporte nutricional total.
- Impede a conclusão de uma exportação se o cálculo de crescimento for alterado enquanto o PDF estiver sendo gerado.
- Libera a edição da dose de selênio em prematuros, mantendo 7 mcg/kg/dia como sugestão e exibindo aviso não bloqueante quando a dose informada for diferente.

## 0.6.0 — 22/09/2026

- Acrescenta a aba Crescimento com velocidade ponderal pelo método do peso médio do período, em g/kg/dia, além do ganho total e em g/dia.
- Calcula a idade pós-menstrual média a partir da IG ao nascer e dos dias de vida inicial e final.
- Compara descritivamente com a mediana específica por sexo e faixa de idade pós-menstrual da referência Fenton 2025 (22–49 semanas).
- Antes da recuperação do peso de nascimento, exibe a mensagem clínica acordada e não calcula o percentual da referência.
- Sinaliza intervalos inferiores a 5 dias, sem classificar crescimento como adequado, lento ou rápido e sem aplicar o critério de ΔZ >0,67.
- Inclui validação automatizada do método, limites das faixas, cronologia, recuperação do peso e interface.

## 0.5.3 — 22/09/2026

- Exibe as concentrações finais de cálcio em mEq/L e fósforo em mmol/L na NP individualizada e no PDF.
- Orienta confirmação farmacêutica quando gluconato de cálcio e glicerofosfato de sódio ultrapassam a composição estudada de 50 mEq/L e 25 mmol/L, respectivamente.
- Para cálcio associado a fosfato inorgânico, orienta conferência em curva específica da formulação.
- Mantém o alerta de compatibilidade separado da relação molar Ca:P e sem bloqueio de cálculo ou exportação.
- Referência: Wang et al., Pediatrics & Neonatology, 2020; DOI 10.1016/j.pedneo.2020.02.004.

Registro das mudanças publicadas do NP_NEO. O histórico detalhado e auditável permanece também nos commits do Git.

## 0.5.2 — 21/09/2026

- Acrescenta seleção manual de fase clínica: oligoanúria, transição ou crescimento.
- Acrescenta peso e idade gestacional ao nascer, sem inferir esses dados de outras abas.
- Para crescimento estável, compara HV + enteral ou enteral isolada à referência ESPGHAN 2022/2023 somente em prematuros com peso ao nascer <1800 g. Exibe distância aos limites antes do arredondamento.
- Nas fases iniciais, mostra referências parenterais contextualizadas de D1/D2 (ESPGHAN 2018), sem criar faixas por fase ou classificar proteína enteral pela faixa parenteral.
- Mantém a régua PN / EN independente. Acrescenta referências ao PDF e bibliografia às Notas; edição dos campos invalida os resultados.
- Verificação local: 99 testes aprovados; relatório de crescimento com duas páginas renderizado e inspecionado. Publicação autorizada em 21/09/2026. Sem verificação visual em navegador nesta etapa.

## 0.5.1 — 21/09/2026

- Em 21/09/2026, o responsável aprovou manter provisoriamente o método de osmolaridade da HV para testes e comparação com a fórmula clínica habitual. Eventual troca exigirá revisão explícita do método; não há substituição automática.
- Registra referências bibliográficas completas nas Notas e a procedência no código, distinguindo o método aditivo publicado da adaptação estequiométrica implementada.

- Acrescenta Exportar PDF à HV, com composição, parâmetros, osmolaridade e autoria de Jefferson P Guilherme.
- Exibe a osmolaridade calculada imediatamente após a concentração final de glicose na tela e no PDF.
- Acrescenta VT e vazão juntos na última linha dos resultados e do relatório.
- Estima a osmolaridade pela soma das contribuições dos componentes no volume final, com dissociação ideal dos sais e osmolaridades de bula ajustáveis para SG 5% e SG 50%. Explica fórmula, referências e limites nas Notas.
- Preserva cálculos de volume, VIG e doses e a regra de uma casa decimal com arredondamento para cima na apresentação.
- Impede exportação de mistura inviável e invalida PDFs após edição, inclusive durante a geração. Inclui o gerador no cache offline.

- Verificação local: 95 testes aprovados (HV, osmolaridade, exportação, invalidação, integração e PDFs); PDF renderizado e conferido visualmente.

## 0.5.0 — 19/09/2026

- Integra a enteral a uma fonte intravenosa explicitamente selecionada: sem IV, NP individualizada, NP padrão (Numeta) ou HV.
- Soma taxas hídrica, energética e proteica com precisão interna; Numeta usa a energia integral da bolsa e HV usa glicose × 4 kcal/g, sem proteína intravenosa.
- Identifica a fonte e o peso de seu cálculo na tela e no PDF. Não soma outras abas automaticamente.
- Exige cálculo atual válido da fonte; edições, fonte ausente e impedimentos já existentes não podem gerar/exportar totais obsoletos.
- Aplica a régua aprovada a NP individualizada e Numeta; mantém inativa com HV ou sem IV. Limiares inalterados.
- Atualiza Notas, documentação e cache. 305 testes aprovados, incluindo as quatro fontes, ambas as entradas de Numeta, fronteiras, invalidação, bloqueios e PDF.

## 0.4.4 — 19/09/2026

- Renomeia a interface, identificação de instalação e relatórios para GROW_NEO by Prof. Jefferson.
- Adiciona a logo aprovada no canto superior direito, preservando a identificação UEA.
- Retira o selo Avaliação do cabeçalho; mantém a orientação de conferência clínica no rodapé.
- Move Atualizar para abaixo da logo, sempre visível, com consulta de nova versão, mensagens de estado e confirmação antes de reiniciar.
- Organiza as seis abas em duas linhas no celular, sem quebrar palavras.
- Atualiza cache offline para incluir logo e módulo de atualização. Não altera cálculos ou regras clínicas.
- Verificação: 252 testes aprovados, incluindo atualização sem nova versão, cancelamento, ativação e falha de conexão.

## 0.4.3 — 19/09/2026

- Implementa a régua de transição PN → EN aprovada: ativa somente com EN >50 mL/kg/dia e PN presente; avalia separadamente energia total ≥110 kcal/kg/dia e proteína total ≥2,50 g/kg/dia.
- Compara valores internos sem arredondamento; mostra proteína com duas casas na tabela integrada e no PDF.
- Inclui a régua no PDF e os critérios nas Notas; mantém a integração com a última NP individualizada calculada na sessão.
- Invalida resultado/PDF enteral após edição enteral ou novo cálculo de PN e impede download de geração assíncrona obsoleta.
- Atualiza versão, lockfile e cache offline. Regressão: 247 testes aprovados; fronteiras, ausência de PN, interface e PDF cobertos.
- Não acrescenta regra de redução ou suspensão automática da PN.

## 0.4.2 — 18/09/2026

- Torna os alertas de resultado mais objetivos, aproveitando a aba Notas para explicações fixas.
- Remove peso e dia de vida repetidos das mensagens de alerta.
- Simplifica os alertas de osmolaridade, aminoácidos e lipídios.
- Remove a frase sobre teto lipídico dos alertas habituais; o teto permanece explícito quando realmente ultrapassado.
- Não altera regras ou cálculos clínicos.

## 0.4.1 — 18/09/2026

- Corrige a apresentação responsiva da tabela de oferta nutricional total em telas de celular.
- Preserva a última NP individualizada válida durante a navegação para a aba Enteral, permitindo a soma PN + enteral.
- Acrescenta testes de regressão específicos para ambas as correções.
- Não altera regras ou fórmulas clínicas.

## 0.4.0 — 18/09/2026

- Marco de expansão do NP_NEO em direção ao GROW_NEO.
- Adiciona o módulo de dieta enteral com LMO, LHOP, FPT e FP.
- Estima energia e proteína do LMO conforme fase da lactação e permite composição conhecida/analisada.
- Inclui fortificação com FM85 e cálculo da oferta enteral em kcal/kg/dia e g de proteína/kg/dia.
- Integra nutrição parenteral e enteral em um quadro de aporte nutricional total: taxa hídrica, energia e proteína.
- Adiciona exportação do aporte nutricional total em PDF, sem identificação do paciente.
- Adiciona casos de verificação do módulo enteral, testes de interface, teste do PDF e integração contínua automatizada.
- Mantém a versão como instrumento de avaliação; validação clínica formal ainda não realizada.

## 0.3.6 — 18/09/2026

- Adiciona a aba “Notas importantes” com bases dos cálculos, limitações, segurança, privacidade e referências.
- Transfere explicações fixas sobre osmolaridade, fatores energéticos e arredondamentos para a nova aba.
- Mantém nas telas de resultado somente valores, avisos contextuais e bloqueios de segurança.
- Amplia a navegação acessível por teclado para cinco abas.

## 0.3.5 — 18/09/2026

- Corrige as doses de zinco e selênio conforme ESPGHAN/ESPEN/ESPR/CSPEN 2018.
- Passa a distinguir prematuros e recém-nascidos a termo pela idade gestacional ao nascer, sem usar peso de 1.500 g como substituto de prematuridade.
- Prematuros: zinco selecionável entre 400–500 mcg/kg/dia e selênio automático de 7 mcg/kg/dia.
- Recém-nascidos a termo: zinco automático de 250 mcg/kg/dia e selênio selecionável entre 2–3 mcg/kg/dia.
- Aplica os máximos de 5 mg/dia de zinco e 100 mcg/dia de selênio, inclusive após o arredondamento dos volumes.
- Mantém o desconto do zinco já fornecido pela solução de oligoelementos.
- Amplia a suíte para 201 testes, incluindo as fronteiras de 36 semanas + 6 dias e 37 semanas.

## 0.3.4 — 18/09/2026

- Exibe a relação molar Ca/P na prescrição individualizada e na NP padrão, inclusive no PDF.
- Inclui a osmolaridade estimada e a orientação de acesso venoso central acima de 900 mOsm/L.

## 0.3.1 — 16/09/2026

- Padroniza a apresentação da NP padrão e do PDF com uma casa decimal.

## 0.3.0 — 16/09/2026

- Adiciona a aba de NP padrão com Numeta G13%E.
- Permite calcular pela taxa hídrica ou pela oferta proteica e exportar o resultado em PDF.

## 0.2.1 — 16/09/2026

- Padroniza as casas decimais dos volumes na hidratação venosa.

## 0.2.0 — 16/09/2026

- Adiciona a calculadora de hidratação venosa.

## 0.1.3 — 16/09/2026

- Publica os alertas neonatais confirmados para glicose, aminoácidos e lipídios.
- Adota VIG em mg/kg/min em toda a interface e nos relatórios.

## 0.1.2

- Consolida a versão inicial de avaliação da calculadora de NP neonatal individualizada.

