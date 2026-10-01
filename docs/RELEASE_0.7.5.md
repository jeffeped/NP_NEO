# GROW_NEO 0.7.5 — 01/10/2026

## Estado

Implementação e testes locais concluídos. Publicação autorizada pelo responsável em 01/10/2026 às 12:35 (Manaus), mas NÃO executada. O conector recusou a criação do branch `release/0.7.5-birth-weight-pdf-date` com `MCP tool call requires approval, but approval policy is never`. Nenhum branch, commit remoto ou PR foi criado nessa tentativa.

## Regra solicitada pelo responsável

NP individualizada, Numeta e HV usam PN de D1 a D7 inclusive, independentemente da perda ou ganho de peso. Em D8 passam ao peso atual. Todos os cálculos, doses por kg, volumes, VIG e ofertas efetivas dessas abas usam a mesma base. Os formulários mantêm peso atual e PN separados; HV ganhou dia de vida e PN; Numeta ganhou PN. Falta de PN em D1-D7 impede cálculo, sem substituição silenciosa. O campo dia de vida existente começa em 1; não se introduziu contagem D0.

O peso atual mantém sua função antropométrica. A variação percentual é calculada com os pesos medidos; Fenton, INTERGROWTH e velocidade de crescimento não recebem o PN no lugar de medições. Enteral trabalha com taxas por kg; a integração recebe a base de peso da fonte IV e a identifica no resultado e no PDF.

## Caso que motivou a alteração

Peso atual 920 g; PN 990 g; Na solicitado 2 mEq/kg/dia; fósforo pelo glicerofosfato 1 mmol/kg/dia. Até D7: 1,0 mL de glicerofosfato após arredondamento, sódio 2,0202 mEq/kg/dia, NaCl zero. Em D8, com peso atual ainda 920 g: glicerofosfato 0,9 mL, sódio 1,9565 mEq/kg/dia, complemento de NaCl calculado 0,023529 mL que arredonda a zero. O segundo caso mostra o resíduo omitido e exige aceite do total efetivo na interface. Não se aumentou automaticamente nenhuma dose. A exceção só cobre resíduo do arredondamento quando a contribuição não arredondada do glicerofosfato já atingia a meta; doses pequenas genuínas permanecem bloqueadas.

## PDFs

Data/hora visível, fuso America/Manaus, em cada página dos sete relatórios locais: NP individualizada, HV, NP padrão, enteral, aporte + Fenton, INTERGROWTH detalhado e prancha. Data da exportação também registrada nos metadados. O PDF original recebido da Fenton não foi modificado, conforme esclarecimento do responsável.

## Validação e limites

526 testes automatizados aprovados, zero falhas, incluindo regressões, entradas obrigatórias, limites D7/D8, aceite e sua invalidação, integração e datas. PDFs de teste gerados e 14 páginas renderizadas e inspecionadas. Gráfico Fenton usado nos testes é uma pequena imagem sintética: não houve consulta à API nem validação clínica. Não houve implantação ou teste do site público 0.7.5.

O código local incorporou as alterações de main 0.7.4 antes desta implementação. As travas de acesso periférico da NP e HV existentes em main foram preservadas; testes antigos foram ajustados a esse comportamento. Ícones oficiais ausentes na cópia local foram obtidos do repositório somente para testes; não fazem parte do pacote de alterações.

## Publicação

Enviar o conteúdo de ARQUIVOS_PARA_GITHUB à raiz de jeffeped/NP_NEO, preservando as subpastas tests e docs, em um único commit. Não apagar nem substituir assets, vendor, workers ou arquivos ausentes do pacote. Após o commit, verificar GitHub Actions, implantação Pages e versão 0.7.5 no botão Atualizar. A cópia local tem histórico reconstruído: não fazer force-push dela.
