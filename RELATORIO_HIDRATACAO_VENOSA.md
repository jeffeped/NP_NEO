# NP_NEO 0.2.1 — terceira aba: hidratação venosa

Data: 16/09/2026. Responsável pelas fórmulas: Jefferson Guilherme.

## Escopo e preservação

Acrescentada a terceira aba “Hidratação venosa”, mantendo “Parâmetros” e “Resultado” da NP, o motor de NP e seu PDF. O módulo novo utiliza JavaScript local, sem cadastro de pacientes, sem histórico e sem envio dos campos ao servidor. O cache offline inclui os dois novos módulos.

Base preservada: `9ccf8f9b83eecf53eee9e72aabfbede3b6327136`, versão publicada 0.1.3. Antes das alterações foram criados a branch `backup/pre-hidratacao-2026-09-16`, um bundle Git e a branch `feature/hidratacao-venosa-2026-09-16`.

## Parâmetros e fórmulas

O médico escolhe peso em kg, taxa hídrica em mL/kg/dia, VIG em mg/kg/min e doses de Na, K, Ca e Mg. Não são sugeridas doses. A unidade dos eletrólitos é explícita: mEq/kg/dia ou mEq totais em 24 horas. Trocar a unidade limpa as quatro doses para evitar reinterpretar os mesmos números.

Soluções utilizadas: NaCl 10%, KCl 10%, gluconato de cálcio 10%, sulfato de magnésio 10%, SG 5% e SG 50%.

```text
VT = taxa hídrica × peso (kg)
gG = VIG × peso (kg) × 60 × 24 / 1000
Volume do eletrólito = mEq totais / equivalência em mEq/mL
VR = VT − soma dos volumes dos eletrólitos
SG 50% (mL) = [gG − (VR × 0,05)] / 0,45
SG 5% (mL) = VR − volume de SG 50%
Vazão (mL/h) = VT / 24
```

Toda a diferença `gG − (VR × 0,05)` está no numerador. As contribuições de SG 5% e SG 50% são somadas para conferir a VIG e a concentração final. VT, gG, soma dos eletrólitos e VR aparecem no resultado, inclusive quando a mistura não é possível.

## Equivalências e limites do módulo

Valores iniciais do cadastro anterior, exibidos e editáveis na HV: NaCl 1,7; KCl 1,34; gluconato de cálcio 0,5; sulfato de magnésio 0,8 mEq/mL. Devem corresponder ao rótulo da apresentação efetivamente usada. A concentração percentual não determina sozinha os mEq do íon para qualquer apresentação de um sal. Alterar uma equivalência na HV não muda as constantes da NP.

A necessidade de explicitar a apresentação foi confirmada pela diferença entre o cadastro de cálcio (0,5 mEq/mL) e apresentações que informam 0,465 mEq/mL, como a [informação do fabricante AdvaCare](https://www.advacarepharma.com/es/medicamentos/inyeccion-de-gluconato-de-calcio). Não houve substituição silenciosa das equivalências da NP por um fabricante diferente.

Não foram acrescentados tetos clínicos, doses habituais, regras de acesso venoso ou regras de compatibilidade físico-química à HV. A exportação PDF existente permanece própria da NP. O módulo novo entrega cálculo teórico de composição, sem validação clínica formal da mistura.

## Validações e segurança numérica

- Peso e taxa hídrica maiores que zero; VIG e doses não negativas; unidade escolhida e equivalências positivas obrigatórias.
- Campos vazios não são tratados como dose zero; o médico informa zero quando não deseja ofertar o eletrólito.
- Doses totais não são multiplicadas novamente pelo peso.
- Se os eletrólitos ocuparem todo o VT ou o ultrapassarem, nenhuma composição de SG é apresentada.
- Se a VIG exigir volume negativo de SG 5% ou SG 50%, o resultado explica a faixa matematicamente possível sem apresentá-la como recomendação clínica.
- As comparações usam frações decimais exatas, sem tolerância que absorva ultrapassagens pequenas. Não há arredondamento intermediário do VT.
- VT, vazão e volumes dos componentes são exibidos com uma casa decimal, arredondados para cima somente na apresentação. Os cálculos internos preservam a precisão completa. A formatação evita elevar indevidamente valores já exatos em décimos por ruído de ponto flutuante: 1,20 é exibido como 1,2 e 1,21 como 1,3. Os volumes são teóricos; SG 5% completa o VT e a oferta precisa ser conferida após arredondamento de preparo.
- Qualquer alteração de entrada invalida a composição da HV, sem invalidar o resultado já calculado da NP.

## Arquivos alterados ou novos

| Arquivo | Finalidade |
|---|---|
| hydration.js | Motor isolado de HV, conversões, fórmulas e verificação matemática. |
| hydration-ui.js | Campos, unidade explícita, equivalências ajustáveis e apresentação do resultado. |
| index.html | Terceira aba e formulário/resultado da HV. |
| app.js | Navegação acessível entre três abas e inicialização da HV. |
| styles.css | Ajustes para a terceira aba e resultados. |
| engine.js | Apenas versão 0.2.1; cálculos de NP preservados. |
| sw.js | Cache 0.2.1 com os novos módulos. |
| package.json e package-lock.json | Versão 0.2.1, sem novas dependências. |
| tests/hydration.test.js | 46 testes do motor, unidades, conservação e limites. |
| tests/interface.test.js | Sete novos fluxos de interface e manutenção dos cinco anteriores. |
| README.md e este relatório | Fórmulas, uso, validação e limitações. |

## Resultado dos testes

**178 testes aprovados, zero falhas.** Os 124 testes anteriores continuam aprovados, incluindo as 12 regressões completas do motor de NP e os testes de PDF. A HV possui 47 testes do motor e sete fluxos de interface simulada. As verificações de sintaxe JavaScript e `git diff --check` também passaram.

Exemplo conferido: peso 2 kg; taxa 100 mL/kg/dia; VIG 5; doses Na 1,7, K 1,34, Ca 0,5 e Mg 0,8 mEq/kg/dia, com as equivalências iniciais. Cada sal ocupa 2 mL; VT = 200 mL; VR = 192 mL; gG = 14,4 g; SG 50% = 10,6666… mL; SG 5% = 181,3333… mL; VIG calculada = 5 mg/kg/min.

Nos testes de interface foi corrigida a seleção de opções no simulador de DOM, que não se comportava como um navegador ao desmarcar opções sequencialmente. Isso não exigiu alterar o comportamento do seletor no aplicativo.

**Conferência visual:** pendente. Na etapa anterior, a sessão de navegador deixou de responder após o diálogo de atualização do aplicativo. Os testes de DOM simulado não são apresentados como validação manual de navegador.

## Execução e publicação

Endereço do aplicativo: https://jeffeped.github.io/NP_NEO/. A terceira aba corresponde à versão 0.2.1; conferir o rodapé após a atualização.

Execução local: `python3 -m http.server 8765` (Windows: `py -m http.server 8765`), abrindo http://localhost:8765. Testes: Node.js 20 ou superior, `npm ci --ignore-scripts` e `npm test`.

Ao receber “Atualização disponível · reiniciar”, concluir ou anotar os parâmetros antes de reiniciar, pois os formulários serão descartados. Nenhuma nova biblioteca de execução foi adicionada.

## Atualização 0.7.4 (01/10/2026): acesso venoso e bloqueios em acesso periférico

**Mudança de escopo.** A seção “Equivalências e limites do módulo” registrava que a HV não tinha regras de acesso venoso. Revisão de código em 01/10/2026 mostrou que uma HV de 1.000 g, 60 mL/kg/dia e VIG 10 mg/kg/min resultava em glicose final de 24,0% e osmolaridade de cerca de 1.317 mOsm/L sem nenhum alerta, com PDF liberado. Por decisão do responsável clínico, a HV passa a seguir a mesma regra da NP individualizada.

**Regras implementadas.**

- Acesso venoso (central ou periférico) obrigatório. Sem acesso selecionado, o cálculo não é feito e o campo é destacado.
- Em acesso periférico, bloqueiam composição e PDF: glicose final acima de 12,5% e osmolaridade estimada acima de 900 mOsm/L. Os dois bloqueios podem aparecer juntos.
- A glicose é comparada em aritmética racional exata (12,5% = 125 mg/mL), coerente com o restante do motor: 12,5% exatos são liberados; qualquer ultrapassagem bloqueia.
- A osmolaridade usa o método aditivo já existente (soluções glicosadas pela bula e sais por dissociação ideal); continua sendo estimativa, não medição.
- Em acesso central, nenhuma das duas regras bloqueia.
- O PDF registra o acesso selecionado. O motor recusa gerar PDF de mistura bloqueada.

**Arquivos alterados.** `hydration.js` (validação do acesso e bloqueios), `hydration-ui.js` (leitura do acesso), `hydration-pdf.js` (linha de acesso), `index.html` (campo de acesso e texto de ajuda), testes da HV (fixtures com `access: 'central'` para preservar o comportamento anterior e testes novos), README e CHANGELOG.

**Testes novos.** Fronteira exata de 12,5% (VIG 5 em 57,6 mL/kg/dia liberada; 57,5 mL/kg/dia bloqueada); osmolaridade acima de 900 com glicose em 12,5% exatos (bloqueio isolado da osmolaridade); ausência de bloqueio em acesso central nas mesmas misturas; ocorrência simultânea dos dois bloqueios; rejeição de acesso vazio, inválido ou ausente; fluxos de interface (bloqueio e campo obrigatório); PDF com a linha de acesso e recusa de mistura bloqueada.

**Verificação.** 492 testes aprovados no total, sem falhas; GitHub Actions aprovado; publicação pela PR #29 confirmada no endereço do aplicativo (versão 0.7.4).

**Pendências.** Conferência manual em navegador real ainda não realizada nesta etapa. Continua não havendo validação de compatibilidade físico-química da mistura.
