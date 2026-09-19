# Verificação da transição PN → EN — v0.4.3

Data: 19/09/2026. Base: commit 7f9ddc4 (v0.4.2). Responsável clínico: Prof. Jeffe.

## Escopo e regras preservadas

Implementa exclusivamente a régua aprovada: EN >50 mL/kg/dia com PN presente; energia PN+EN ≥110 kcal/kg/dia; proteína PN+EN ≥2,50 g/kg/dia. Não altera composição das dietas, fórmulas da NP/HV/Numeta ou limiares clínicos existentes. Não automatiza redução/suspensão da PN.

## Evidência de teste

Regressão anterior: 224/224. Regressão final local: 247/247, zero falhas, zero testes ignorados.

| Fronteira | Esperado | Resultado |
| --- | --- | --- |
| EN 50,0 com PN | Inativa | Aprovado |
| EN 50,1 com PN | Ativa | Aprovado |
| Energia 109,9 / 110 | Abaixo / atingida | Aprovado |
| Proteína 2,49 / 2,50 | Abaixo / atingida | Aprovado |
| EN sem PN: 0, 50, 50,1 e 150 | Inativa | Aprovado |
| Metas discordantes | Energia e proteína independentes | Aprovado |
| 109,9999 e 2,49999 | Abaixo; sem arredondar comparação | Aprovado |
| Alterar enteral ou recalcular PN | Ocultar resultado/PDF anterior | Aprovado |
| Entrada enteral inválida | Não manter resultado exportável | Aprovado |

As oito combinações das três fronteiras são testadas. Testes da interface executam os módulos reais em DOM simulado. Testes do PDF executam o gerador real, verificam texto desenhado, largura dos textos, autoria e uma página. PDF de fronteira inferior renderizado e inspecionado visualmente: tabela e régua legíveis, sem sobreposição/cortes. Casos com metas atingidas e régua inativa também gerados.

## Limites da verificação

Testes de software não constituem validação clínica. A integração mantém a última NP individualizada calculada na sessão; NP padrão e HV não entram na soma. Nenhum dado de paciente foi usado. A conferência visual foi do PDF; a interface foi exercitada em DOM simulado, sem ensaio manual em dispositivos físicos.

## Rastreabilidade

Mudanças registradas no CHANGELOG. Versão de aplicativo, package/lockfile e cache offline sincronizados em 0.4.3. Publicação deve ser confirmada pelo commit implantado e leitura dos arquivos servidos; o resultado é informado na entrega.
