# GROW_NEO 0.7.7 — correções pós-auditoria

Preparada em 02/10/2026. Candidata para revisão; este registro não declara
publicação ou validação clínica. Base: 0.7.6, commit
`af5a90e9617798c05ba52bf6ef0ebce534ac3f1b` de `jeffeped/NP_NEO`.
A fonte e os resultados da auditoria original foram preservados.

## Correções e exemplos reproduzíveis

- **D1 — composição enteral inválida:** selecionar LHOP, taxa 100 mL/kg/dia,
  informar `NaN` e `Infinity` em energia/proteína analisadas. Agora há erro
  explícito, sem estimativa silenciosa e sem resultado exportável. Somente dois
  campos ausentes autorizam composição estimada; um par incompleto é rejeitado.
  Valores negativos permanecem informados, sinalizados e substituídos por zero
  na contribuição, sem bloqueio exclusivo por negatividade. FM85 válido é somado
  separadamente. A API também rejeita FM85 não finito.
- **D2 — apresentação da HV:** com 1.000 g, D8, taxa 100 mL/kg/dia, VIG 4,
  Na 0,001 mEq/kg/dia e concentração 1,7 mEq/mL, o volume de Na passa de
  0,1 mL para 0,000588235294118 mL. O valor anterior correspondia a 170 vezes
  a dose. Tela/PDF usam 12 algarismos significativos para os volumes calculados,
  sem teto em 0,1 mL. Isso não define volume mensurável de preparo: permanece
  necessária a conferência de precisão/diluição. A matemática interna da HV
  e o formato específico de NP padrão não foram modificados.
- **Aceites de NP:** calcular NP com glicerofosfato e aceite de sódio pendente;
  selecionar essa NP no aporte total. Agora a integração exige o aceite também
  nessa rota, incluindo os dois PDFs nutricionais. Edição, recálculo ou mudança
  de aceite invalidam resultados/downloads derivados. A troca de aceite durante
  geração assíncrona do PDF impede disponibilizar o arquivo antigo.

## NP + HV + enteral

Na aba Enteral, selecionar **NP individualizada + HV** ou **NP padrão (Numeta)
+ HV**. Calcular cada fonte com seu próprio volume, sem duplicar líquidos.
As fontes precisam estar válidas, com o mesmo dia de vida, base e peso de cálculo;
aplicam-se os aceites e bloqueios de cada fonte. Após editar, recalcule o total.

A tabela e os PDFs discriminam NP, HV, enteral e total para taxa hídrica,
energia e proteína. Somatório sem arredondamento intermediário. Exemplo:
NP 60 + HV 40 + EN 50 = **150 mL/kg/dia**. Em NP individualizada com AA 2,
lipídios 1 e VIG 3; HV VIG 2; LHOP estimado 65 kcal/100 mL e 1,2 g/100 mL:
**78,22 kcal/kg/dia e 2,60 g/kg/dia**, com peso de cálculo de 1 kg.
HV contribui energia da glicose e zero proteína. Numeta 2:1 mantém indicação
de que lipídios infundidos separadamente não estão incluídos.

## Verificação executada

- **662 testes automatizados**, todos aprovados, incluindo regressões de núcleo,
  interface simulada, edição/aceites, concorrência na exportação e PDFs.
- **3.500 casos originais**, semente **20261001**, sete grupos de IG, sem pós-termo:
  **92.544 comparações**, nenhuma divergente no subconjunto original.
- **1.432 desses casos** tinham NP e HV simultâneas: **2.864 cenários** antes/depois
  da confirmação de HV, **8.312 comparações complementares**, nenhuma divergente.
  Não são casos novos; não se somam ao denominador de 3.500.
- Bateria dirigida original: **580 comparações**, nenhuma divergente.
- Edge headless: **32 verificações**, todas aprovadas; **8 PDFs reais** gerados,
  com extração dos valores relevantes. Conferência visual das primeiras páginas
  dos PDFs de HV e dos totais das duas modalidades de NP, além da tela em 390 px.
- PDF nutricional com Fenton: testes locais com imagem de teste explicitamente
  fictícia, incluindo as duas novas combinações. Serviço Fenton externo não
  validado nesta regressão.

Critério do caso aleatório: falha se qualquer comparação obrigatória coberta
falhar; saídas ausentes contam como falha. Tolerância numérica original:
máximo de 1e-6 absoluto e 1e-6 relativo; booleanos exatos. Oráculo Decimal
independente da auditoria conservado. Protocolo complementar registrado antes
de executar a soma tripla; usa soma das contribuições esperadas originais.

Resultado: 0/3.500 casos com falha **no escopo numérico coberto**. Intervalo
binomial exato bilateral 95%: 0 a 0,105341%; limite superior unilateral 95%:
0,085556%. Por grupo, 0/500: 0 a 0,735061% bilateral e 0,597355% unilateral.
O agregado pressupõe modelo binomial de risco comum e é apenas descritivo desta
distribuição simulada; não expressa probabilidade de segurança clínica.

## Reproduzir e interpretar

No repositório, Node >=20: `npm ci` e `npm test`. Não usar os arquivos de testes
duplicados na raiz como suíte alternativa; a suíte oficial é `tests/*.test.js`.
O pacote de evidências contém casos, executores, oráculo, resultados CSV/JSON,
protocolo e instruções para repetir a coorte e as verificações de navegador.

Expectativas antigas que exigiam teto de volume HV foram substituídas por
preservação de dose/volume/massa. Expectativas que toleravam composição parcial
ou não numérica foram substituídas por rejeição explícita. Isso é alteração
intencional do comportamento corrigido, não mudança retroativa dos critérios
da auditoria original. Falhas de configuração dos executores foram registradas
separadamente; não tratadas como aprovação do aplicativo.

Atende aos critérios de correção e regressão aqui descritos. Permanecem os
limites de cobertura da auditoria: não houve validação clínica integral,
validação físico-química de misturas, confirmação de todas as apresentações
comerciais nem verificação do serviço externo/curvas Fenton contra dados
primários completos. Não foi criada trava osmolar inferior; ausência de trava
e confirmação do prescritor não comprovam segurança da mistura. Os fatores
gerais 4/4/9, a composição específica de produtos e a regra institucional
PN D1–D7 / peso atual desde D8 permanecem diferenciados e preservados.
