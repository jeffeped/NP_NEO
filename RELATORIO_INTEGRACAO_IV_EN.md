# Integração IV + EN — v0.5.0

Data: 19/09/2026. Base: v0.4.4, commit 7092fe5. Escopo aprovado: seleção exclusiva de sem aporte intravenoso, NP individualizada, NP padrão ou HV na aba Enteral; integração na tela e no PDF.

## Regras implementadas

- Nenhuma fonte pré-selecionada: seleção explícita obrigatória.
- PN individualizada: ofertas efetivas e energia do motor existente.
- Numeta: taxa e proteína com precisão interna e energia integral da bolsa já definida no módulo padrão. Ambos os modos (taxa/proteína) funcionam.
- HV: taxa hídrica calculada; glicose em g/dia × 4 kcal/g ÷ peso; proteína zero. Fator energético já usado no aplicativo, sem nova recomendação clínica.
- Sem IV: apenas enteral, ignorando todos os cálculos IV existentes.
- Régua: ativa apenas com NP individualizada/padrão de volume positivo e EN >50 mL/kg/dia. Metas totais ≥110 kcal/kg/dia e ≥2,50 g/kg/dia, inalteradas. HV não ativa a régua.
- Fonte não calculada, editada ou bloqueada: exige cálculo válido; não substitui por zero nem mantém exportação antiga.
- Cada aba mantém somente seu cálculo atual em memória. Mudar parâmetros da fonte selecionada invalida a integração; navegar entre abas preserva o cálculo atual.

## Verificação

305 testes aprovados, zero falhas e zero ignorados. Regressão de NP, HV, Numeta, enteral, interface, atualização e PDFs preservada. Testes de fronteira cobrem 50/50,1, 109,9/110 e 2,49/2,50 nas quatro fontes.

Exemplos independentes com LHOP 80 mL/kg/dia (52 kcal/kg/dia; 0,96 g/kg/dia):

| Fonte IV | Total hídrico | Energia total | Proteína total | Régua |
| --- | --- | --- | --- | --- |
| Sem IV | 80 | 52 | 0,96 | Inativa |
| Numeta 60 mL/kg/dia | 140 | 106,6 | 2,84 | Ativa: energia abaixo, proteína atingida |
| HV 60 mL/kg/dia, VIG 5 | 140 | 80,8 | 0,96 | Inativa |

Unidades: mL/kg/dia, kcal/kg/dia, g/kg/dia. Energia HV conferida em pesos 0,8, 1 e 2 kg. Seleção exclusiva testada com três cálculos IV existentes simultaneamente. Bloqueios periféricos de Numeta e HV matematicamente impossível preservados.

PDFs Numeta+EN e HV+EN renderizados e inspecionados: fonte explícita, tabela legível, sem cortes/sobreposição. As quatro fontes são cobertas no gerador de PDF, com verificação de texto e autoria. Interface testada em DOM simulado; testes de software não equivalem à validação clínica.
