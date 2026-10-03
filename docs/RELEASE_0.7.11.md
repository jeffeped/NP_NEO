# GROW_NEO 0.7.11 — segurança clínica da NP

Candidata preparada em 02/10/2026, a partir de `a2e0c44` (0.7.10). Publicação pendente. Responsável pelas regras e confirmação do critério operacional de hipofosfatemia: Jefferson Guilherme.

## Comportamento

Na NP individualizada, ureia plasmática e triglicerídeos são opcionais, em mg/dL, aceitam vírgula ou ponto e começam vazios. A ureia não é BUN. Os exames são registrados no resultado/PDF quando informados; entradas inválidas geram aviso de que não foram interpretadas, sem substituir silenciosamente o exame por zero. Alterar qualquer campo ou o checkbox de ceftriaxona invalida o cálculo/PDF e o aporte integrado anterior.

| Condição | Resposta |
| --- | --- |
| Ureia ≤34 mg/dL | Sem alerta de ureia |
| Ureia >34 mg/dL | Amarelo; avaliar hidratação, função renal e energia concomitante antes de considerar mudança da proteína |
| TG <250 mg/dL | Sem alerta de TG |
| TG 250–265 mg/dL, inclusive | Amarelo; reavaliar progressão da emulsão lipídica |
| TG >265 mg/dL | Amarelo; evitar progressão e considerar redução conforme contexto/protocolo |
| Ceftriaxona marcada e cálcio efetivamente presente | Alerta crítico visual, não bloqueante, sobre precipitação cálcio-ceftriaxona, inclusive em linhas separadas |
| AA efetivos ≥3 g/kg/dia e energia não proteica >0, com P efetivo <1 mmol/kg/dia ou Ca:P acima da faixa vigente | Alerta de risco de hipofosfatemia anabólica; conferir P, K e Mg séricos e Ca:P |
| Osmolaridade >900 mOsm/L e acesso periférico | Trava já existente preservada; “Esta osmolaridade exige acesso venoso central.” |
| Osmolaridade >900 mOsm/L e acesso central | Orientação; não há trava global por esse valor |

O alerta anabólico usa as ofertas efetivas após arredondar o preparo. Ca:P continua molar, com Ca em mEq dividido por 2: limite superior já adotado de 1 no D1 e 1,3 após D1. O gatilho é triagem operacional aprovada para o app, não um escore validado nem diagnóstico de síndrome de realimentação. Não usa concentração sérica de fósforo porque esse exame não é um campo desta etapa.

A referência de ureia deriva de recomendação **enteral**, condicional e com evidência limitada para o corte. Não reduz automaticamente aminoácidos da NP. Os cortes de TG são faixas operacionais conservadoras e vêm acompanhados da ressalva de ausência de consenso universal. Nenhuma nova regra altera doses, volumes, cálculos, aceites existentes ou bloqueia exportação por si só.

Notas fixas de fotoproteção de solução e sistema durante toda a infusão, monitorização metabólica completa, ceftriaxona/cálcio, situações que podem exigir individualização e transição nutricional acompanham NP individualizada e NP padrão na tela e no PDF. O número de páginas pode aumentar para acomodar o conteúdo integral.

Na integração, as metas continuam a usar energia e proteína **totais**, incluindo NP + enteral e HV quando selecionada, antes do arredondamento. Preserva os critérios existentes: NP presente, enteral >50 mL/kg/dia, energia mínima 110 kcal/kg/dia e proteína mínima 2,5 g/kg/dia. Uma meta não atingida acrescenta aviso de risco de déficit antes de reduzir a NP; volume enteral alto não substitui essas metas.

## Verificação

- Suíte original aprovada antes das alterações; suíte atual: **742 testes, zero falhas, zero exclusões** (51 testes adicionais).
- Fronteiras: ureia 34/34,1; TG 249,9/250/265/265,1; osmolaridade efetiva 900/900,1 nas vias central e periférica, calculada pelo motor real com glicose <12,5%.
- Triagem anabólica: AA/P baixos e altos, Ca:P, ausência de energia, omissões e efeito do arredondamento de preparo; ceftriaxona com/sem cálcio e sem seleção.
- Interface real no Chrome: campos opcionais, avisos, exportação liberada, invalidação após edição, larguras 320/390/768 px sem transbordamento horizontal, recarga sem persistir casos e PDF Numeta offline. Dados de teste inteiramente sintéticos.
- PDFs de NP e Numeta reabertos, autoria conferida como Jefferson Guilherme; conteúdo e limites da página testados, páginas renderizadas e inspecionadas visualmente.
- Reprodução: `node --test tests/*.test.js`. Navegador: `GROW_QA_MODULES` aponta para Playwright; `GROW_QA_CHROME` opcional; `GROW_QA_OUT` define a pasta das evidências; executar `node scripts/verify-clinical-safety.cjs`.

Os testes verificam o comportamento do software e a implementação das regras aprovadas; não constituem validação clínica prospectiva.

## Rastreabilidade das fontes

O resumo da revisão bibliográfica fornecido pelo responsável foi a especificação desta etapa. Os PDFs privados da pasta do projeto não estão neste checkout e não foram adicionados ao repositório. Foram conferidos os textos públicos abaixo:

- [Embleton et al., ESPGHAN Position Paper 2022/2023](https://eprints.soton.ac.uk/475322/1/Enteral_Nutrition_in_Preterm_Infants_2022_A.204.pdf): seção proteína, conclusão C4 e recomendação R2; corte de ureia e limitações em nutrição enteral.
- [Alur e Ramarao, 2025](https://www.frontiersin.org/journals/pediatrics/articles/10.3389/fped.2025.1658550/full): transição nutricional e descrição de progressão lipídica com TG <265 mg/dL; não estabelece consenso universal para as faixas do app.
- [Baxter, Numeta G13%E, SmPC](https://www.medicines.org.uk/emc/product/7400/smpc): seções 4.2–4.5; fotoproteção, cálcio/ceftriaxona, monitorização e condições clínicas especiais.
- [Mihatsch et al., 2018 — Ca, P e Mg](https://www.espen.org/files/ESPEN-Guidelines/Pediatrics/ESPGHAN_ESPEN_ESPR_CSPEN-guidelines-on-pediatric-parenteral-nutrition-Calcium-phosphorus-and-magnesium.pdf): base fisiológica para a associação entre anabolismo, fósforo e Ca:P. Os números do gatilho operacional foram confirmados separadamente pelo responsável.

Não foram criadas regras com os cortes mais agressivos do documento de desabastecimento da SBP, nem a partir do resumo da diretriz ASPEN 2023/corrigenda 2024.
