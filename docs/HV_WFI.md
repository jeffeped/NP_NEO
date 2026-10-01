# Água para injeção na HV

## Fluxo aprovado para a versão 0.7.6

Implementação baseada no GROW_NEO 0.7.5, commit `0aa220450b4470417725077b21336a4025c288ac`. O responsável autorizou a emissão de misturas com água mediante confirmação explícita do prescritor de que revisou composição, tonicidade e compatibilidade.

A opção **Incluir água para injetáveis como diluente quando necessário** é desmarcada por padrão. Com ela, o motor calcula uma composição com água quando a glicose solicitada é menor que a oferecida por todo o volume residual preenchido com SG 5%.

Toda composição que efetivamente contém água requer `wfiClinicalReviewAcknowledged = true` para `canPrepare = true`, desde que não haja outro impedimento. Sem confirmação, o PDF clínico e a integração intravenosa com enteral ficam bloqueados. A confirmação não valida automaticamente a formulação, não remove as demais travas e é revogada após alteração de entrada ou recálculo. Revogá-la também invalida a totalização enteral anterior. O PDF registra a declaração de revisão do prescritor e os avisos.

## Fórmulas e fronteiras

O peso de cálculo institucional foi preservado: peso ao nascer do D1 ao D7; peso atual a partir do D8. A entrada da interface permanece em gramas, com conversão para kg antes do motor.

- VT em mL = taxa hídrica em mL/kg/dia × peso de cálculo em kg
- G em g = VIG em mg/kg/min × peso em kg × 1440 / 1000
- Volume de cada sal = dose total em mEq / equivalência do rótulo em mEq/mL
- VR = VT - soma dos volumes dos sais
- Se G < 0,05 × VR: SG5 = G / 0,05; SG50 = 0; água = VR - SG5
- Se G = 0,05 × VR: SG5 = VR; SG50 = água = 0
- Se 0,05 × VR < G ≤ 0,5 × VR: SG50 = (G - 0,05 × VR) / 0,45; SG5 = VR - SG50; água = 0

As fronteiras usam aritmética racional decimal, sem arredondamentos intermediários. Entradas inválidas, VR não positivo, glicose acima da capacidade de SG50 e água isolada continuam bloqueados. Água com eletrólitos e VIG zero exige a mesma revisão explícita do prescritor; o aplicativo não sugere essa condição como tratamento.

A osmolaridade mantém a equação aditiva existente; a água contribui com zero osmoles no modelo ideal e integra o denominador VT. Na e K finais em mmol/L = mEq totais × 1000 / VT em mL. Não se calcula ou declara tonicidade efetiva. Os bloqueios existentes para acesso periférico, glicose final >12,5% ou osmolaridade estimada >900 mOsm/L, permanecem e impedem a exportação mesmo após confirmação.

## Exemplo sintético

Não é uma prescrição clínica. Peso de cálculo 2 kg, D8, TH 100 mL/kg/dia, VIG 2 mg/kg/min, Na 4, K 2, Ca 1 e Mg 0,2 mEq/kg/dia. Equivalências 1,7; 1,34; 0,5 e 0,8 mEq/mL.

| Resultado | Valor matemático |
| --- | ---: |
| NaCl 10% | 4,7058823529 mL |
| KCl 10% | 2,9850746269 mL |
| Gluconato de cálcio 10% | 4 mL |
| Sulfato de magnésio 10% | 0,5 mL |
| SG5 | 115,2 mL |
| SG50 | 0 mL |
| Água para injeção | 72,6090430202 mL |
| VT | 200 mL |
| Glicose total | 5,76 g |
| Glicose final | 2,88% |
| Na / K finais | 40 / 20 mmol/L |
| Osmolaridade estimada | 282,3248 mOsm/L |
| Vazão matemática em 24 h | 8,3333333333 mL/h |

Os valores de misturas com água são apresentados com até quatro casas decimais; volumes e ofertas efetivos após arredondamento exigem conferência no preparo. Um resultado de aproximadamente 282 mOsm/L não comprova tonicidade adequada, compatibilidade, estabilidade ou segurança clínica.

## Segurança e responsabilidade de revisão

Não foi adotado um limite osmolar inferior numérico para liberar formulações. A bula de água para injeção contraindica administração IV isolada por risco de hemólise e exige avaliação da compatibilidade; a referência norte-americana pede soluto suficiente para uma mistura aproximadamente isotônica. Osmolaridade e tonicidade não são intercambiáveis: a glicose é metabolizada, e uma solução isosmolar pode tornar-se fisiologicamente hipotônica.

O fluxo autorizado registra a confirmação individual do prescritor; não substitui o protocolo do serviço ou a conferência farmacêutica. Indicação, tonicidade, compatibilidade/estabilidade, apresentações, preparo, arredondamentos, via de acesso, monitorização e conduta clínica dependem dessa avaliação profissional.

## Verificação técnica

Os testes incluem conservação de volume/glicose/doses, fronteiras exatas e vizinhas de SG5 e SG50, D1/D7/D8, unidades, água isolada, entradas inválidas, limites periféricos e não finitude. Os fluxos de confirmação incluem alterações de entrada, revogação, geração assíncrona, repetição de clique, recálculo, reset, falha/nova tentativa, PDF clínico e invalidação da integração. O gerador de PDF recalcula as entradas antes de emitir o documento.

Consulte `RELEASE_0.7.6.md` para os totais finais da regressão combinada, auditorias independentes e limitações de testes. Testes técnicos não constituem validação clínica formal.

## Executar a conferência local

Com Node.js 20 ou superior: `npm ci --ignore-scripts` e `npm test` na pasta do projeto. Para conferir a interface, executar `python3 -m http.server 8765` e abrir `http://localhost:8765` em navegador local. Na aba HV, inserir apenas dados sintéticos, escolher a opção de água e calcular. O PDF permanece desabilitado até confirmação explícita do prescritor. Qualquer mudança de entrada ou revogação da confirmação invalida o arquivo anterior e os totais integrados.

## Fontes de segurança

1. Fresenius Kabi. Água para injeção, bula profissional BU09, atualização 2025. Administração IV isolada, hemólise e compatibilidade. https://www.fresenius-kabi.com/content/dam/fresenius-kabi/br/documents/bulas/medicamentos/%C3%81gua%20para%20Inje%C3%A7%C3%A3o%20-%20Bula%20Profissional%20de%20Sa%C3%BAde.pdf.coredownload.inline.pdf
2. DailyMed. Sterile Water for Injection. Necessidade de soluto para mistura aproximadamente isotônica. https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=e71c6c83-d518-496c-b2ab-efd5987e4783
3. NICE NG29. Intravenous fluid therapy in children and young people in hospital, recomendações. Distinção entre osmolaridade e tonicidade. https://www.nice.org.uk/guidance/ng29/chapter/recommendations
4. B. Braun. Glucose 5% solution for infusion, SmPC. Hipotonicidade fisiológica após metabolização. https://www.medicines.org.uk/emc/product/15143/smpc

Fontes consultadas em 1 de outubro de 2026. As evidências sustentam as advertências e a necessidade de revisão; não validam automaticamente esta formulação neonatal.
