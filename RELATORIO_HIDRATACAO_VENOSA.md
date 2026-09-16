# NP_NEO 0.2.0 — terceira aba: hidratação venosa

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
- A exibição utiliza até quatro casas decimais, com precisão adicional quando necessária para não apresentar um volume positivo como zero. Os volumes são teóricos; SG 5% completa o VT e a oferta precisa ser conferida após arredondamento de preparo.
- Qualquer alteração de entrada invalida a composição da HV, sem invalidar o resultado já calculado da NP.

## Arquivos alterados ou novos

| Arquivo | Finalidade |
|---|---|
| hydration.js | Motor isolado de HV, conversões, fórmulas e verificação matemática. |
| hydration-ui.js | Campos, unidade explícita, equivalências ajustáveis e apresentação do resultado. |
| index.html | Terceira aba e formulário/resultado da HV. |
| app.js | Navegação acessível entre três abas e inicialização da HV. |
| styles.css | Ajustes para a terceira aba e resultados. |
| engine.js | Apenas versão 0.2.0; cálculos de NP preservados. |
| sw.js | Cache 0.2.0 com os novos módulos. |
| package.json e package-lock.json | Versão 0.2.0, sem novas dependências. |
| tests/hydration.test.js | 46 testes do motor, unidades, conservação e limites. |
| tests/interface.test.js | Sete novos fluxos de interface e manutenção dos cinco anteriores. |
| README.md e este relatório | Fórmulas, uso, validação e limitações. |

## Resultado dos testes

**177 testes aprovados, zero falhas.** Os 124 testes anteriores continuam aprovados, incluindo as 12 regressões completas do motor de NP e os testes de PDF. Foram acrescentados 46 testes do motor de HV e sete fluxos de interface simulada. As verificações de sintaxe JavaScript e `git diff --check` também passaram.

Exemplo conferido: peso 2 kg; taxa 100 mL/kg/dia; VIG 5; doses Na 1,7, K 1,34, Ca 0,5 e Mg 0,8 mEq/kg/dia, com as equivalências iniciais. Cada sal ocupa 2 mL; VT = 200 mL; VR = 192 mL; gG = 14,4 g; SG 50% = 10,6666… mL; SG 5% = 181,3333… mL; VIG calculada = 5 mg/kg/min.

Nos testes de interface foi corrigida a seleção de opções no simulador de DOM, que não se comportava como um navegador ao desmarcar opções sequencialmente. Isso não exigiu alterar o comportamento do seletor no aplicativo.

**Conferência visual:** pendente. Na etapa anterior, a sessão de navegador deixou de responder após o diálogo de atualização do aplicativo. Os testes de DOM simulado não são apresentados como validação manual de navegador.

## Execução e publicação

Endereço do aplicativo: https://jeffeped.github.io/NP_NEO/. A terceira aba corresponde à versão 0.2.0; conferir o rodapé após a atualização.

Execução local: `python3 -m http.server 8765` (Windows: `py -m http.server 8765`), abrindo http://localhost:8765. Testes: Node.js 20 ou superior, `npm ci --ignore-scripts` e `npm test`.

Ao receber “Atualização disponível · reiniciar”, concluir ou anotar os parâmetros antes de reiniciar, pois os formulários serão descartados. Nenhuma nova biblioteca de execução foi adicionada.
