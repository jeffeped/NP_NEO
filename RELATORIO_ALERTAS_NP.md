# NP_NEO by Prof. Jeffe — alertas de NP, versão 0.1.3

Data: 16/09/2026. Repositório: https://github.com/jeffeped/NP_NEO.

**Estado: implementado e testado na cópia local do repositório; não enviado ao GitHub.** A integração recusou a criação de uma branch de backup com HTTP 403, “Resource not accessible by integration”. Nenhum arquivo remoto foi alterado. A versão publicada observada no navegador permanece 0.1.2.

## 1. Inspeção, recuperação e arquivos

Base preservada: `767c8bcb214b0f8788da1afdfb40825a5d8bbc06` (0.1.2). Não havia alterações locais, instruções AGENTS.md no projeto, package.json ou suíte de testes. Antes da primeira alteração foram criados uma branch local de backup (`backup/pre-alertas-2026-09-16`), um bundle Git e a branch de trabalho `feature/alertas-np-2026-09-16`.

A arquitetura estática foi preservada: módulos JavaScript no navegador, cálculo local, ausência de histórico de pacientes, PDF local, instalação PWA e cache offline. Não houve migração de framework, mudança de aparência geral ou alteração de eletrólitos, vitaminas, oligoelementos ou fatores energéticos.

| Arquivo | Alteração |
|---|---|
| `alerts.js` | Novo módulo de referências, classificação, mensagens e comparações de limites. |
| `engine.js` | Integra os alertas e identifica a versão 0.1.3; fórmulas e bloqueios anteriores preservados. |
| `app.js` | Ajuda conforme peso/dia e apresentação dos três níveis de alerta. |
| `styles.css` | Estilo de orientação e quebra de textos de alerta. |
| `pdf.js` | Inclui os alertas em página própria, mantendo o relatório anterior. |
| `sw.js` | Cache 0.1.3, incluindo alerts.js, para atualização offline. |
| `package.json`, `package-lock.json` | Comando npm test e dependência de desenvolvimento linkedom, fixada em 0.18.12. |
| `.gitignore` | Exclui node_modules do controle de versão. |
| `tests/alerts.test.js` | Testes clínicos, limites, entradas inválidas e regressão. |
| `tests/interface.test.js` | Cinco fluxos do app real executados em DOM simulado. |
| `tests/pdf.test.js` | Geração de PDF com alertas e recusa do bloqueio periférico existente. |
| `tests/fixtures/baseline-0.1.2.json` | Saídas completas de 12 cenários da versão original, com SHA de origem. |
| `README.md` | Execução, testes, atualização offline e escopo das regras. |
| `RELATORIO_ALERTAS_NP.md` | Este relatório. |

## 2. Regras implementadas

**Glicose:** VIG já era usada na versão original; não havia sigla GIR nos arquivos do aplicativo. Foi acrescentada sua definição completa na ajuda e no PDF, sem alterar a fórmula `volume de glicose 50% (mL) = VIG (mg/kg/min) × peso (kg) × 1440 / 500`. Concentração final estritamente >20% gera cautela nos dois acessos. Exatamente 20% não gera esse alerta.

**Aminoácidos:** 2,0 g/kg/dia como referência no dia 1; 3,0 após o dia 1. Teto 3,5 somente com peso atual <1 kg. Para peso ≥1 kg, doses acima da referência geram cautela, sem atribuir teto 3,5 ao grupo. O teto não é apresentado como meta. A solicitação e a oferta efetiva são verificadas.

**Lipídios:** 2,0 g/kg/dia no dia 1; 3,0 a partir do dia 2; teto 4,0. Oferta solicitada ou efetiva acima de 4,0 gera alerta de teto. Exatamente no teto, sem ultrapassagem efetiva, não gera classificação de ultrapassagem.

**Níveis:** ORIENTAÇÃO quando a solicitação corresponde à referência; ATENÇÃO quando fica abaixo/acima da referência habitual ou a glicose supera 20%; ACIMA DO TETO quando ultrapassa um teto definido. Todos os novos alertas são não bloqueantes. Cada mensagem apresenta dose solicitada/efetiva ou concentração calculada, referência, motivo, peso e dia; glicose informa também acesso.

**Regra antiga preservada:** glicose >12,5% exige acesso central e bloqueia exportação em acesso periférico. Trata de indicação de via e não conflita com a cautela >20%. Os demais impedimentos matemáticos e as confirmações de contribuição de outros componentes também permanecem.

## 3. Mensagens adicionadas

Os valores são preenchidos dinamicamente. Exemplos:

- “ATENÇÃO: concentração final de glicose superior a 20%. Calculada: 20,15%. Recomenda-se cautela e revisão da prescrição, mesmo em acesso venoso central. Acesso selecionado: central. Peso atual: 1,0 kg; dia de vida: 2.”
- “ORIENTAÇÃO: Aminoácidos: dose solicitada 2,0 g/kg/dia; dose efetiva calculada 2,0 g/kg/dia. Referência inicial no 1º dia de vida: 2,0 g/kg/dia. Dose solicitada na referência habitual. Teto: 3,5 g/kg/dia, somente para RN com peso <1000 g; este teto não é uma meta de oferta. Peso atual: 0,8 kg; dia de vida: 1.”
- Para desvios: “Dose solicitada abaixo/acima da referência habitual; revisar conforme o contexto clínico.”
- Para AA em peso ≥1 kg: “Para RN com peso ≥1000 g, a referência de progressão é 3,0 g/kg/dia; não foi definido um teto máximo neste protocolo.”
- Para ultrapassagem lipídica: “ACIMA DO TETO: Lipídios: dose solicitada 4,1 g/kg/dia; dose efetiva calculada 4,1 g/kg/dia. Referência de progressão após o 1º dia de vida: 3,0 g/kg/dia. A dose solicitada e efetiva ultrapassa o teto de 4,0 g/kg/dia. Revise a prescrição. Peso atual: 1,0 kg; dia de vida: 2.”
- Quando apenas o preparo ultrapassa o teto: “A dose efetiva após arredondamento dos volumes de preparo ultrapassa o teto…”

## 4. Testes criados

- Glicose abaixo, exatamente e imediatamente acima de 20%, com acesso central e periférico. Exemplo: 20,022247…% aparece como 20,0% no resumo, mas corretamente mantém o alerta.
- Incremento decimal mínimo representável acima do limite, sem tolerância que elimine a ultrapassagem.
- AA: pesos 0,8 / 0,999 / 1,0 / 1,2 kg; dias 1 / 2 / 8; ofertas 0 / 2 / 3 / 3,5 / 3,6 g/kg/dia. Inclui o valor exatamente de 1000 g.
- Lipídios: dias 1 / 2 / 8; ofertas 0 / 2 / 2,1 / 3 / 4 / 4,1 g/kg/dia.
- Ofertas efetivas que superam teto após arredondamento físico dos volumes e igualdade real com ruído binário.
- Vírgulas decimais, unidades, doses omitidas, valores inválidos, volume inviável e bloqueio periférico de 12,5%.
- Doze regressões de todas as saídas anteriores: volumes, ofertas, totais, linhas, ajustes, avisos, bloqueios e exportação. Apenas versão e campo novo alerts são excluídos da comparação.
- Cinco testes de interface: referência inicial, desvio inicial, coexistência dos três grupos, ausência de teto 3,5 em ≥1000 g, mudança de 20% para >20% e troca de acesso com exportação/invalidação.
- PDF com alertas não bloqueantes e rejeição de resultado com bloqueio pré-existente.

## 5. Resultado da verificação

**124 testes aprovados; zero falhas.** Node.js 24.19.0. Sintaxe dos módulos e git diff --check aprovados. Não existia suíte anterior; as regressões usam saídas obtidas do commit original antes das alterações.

Um PDF de três páginas, gerado pelo código atualizado com dados sintéticos, foi renderizado e inspecionado página a página: sem cortes, sobreposições ou glifos inválidos; alertas presentes e dados de autoria preservados.

**Limitação de interface:** os cinco testes utilizam DOM simulado; não equivalem à validação manual em navegador. O servidor local foi iniciado, mas o navegador remoto recusou localhost com `ERR_BLOCKED_BY_CLIENT`. O app publicado foi aberto e identificado como 0.1.2. A recusa de gravação do GitHub impediu disponibilizar a versão nova para o teste manual. Portanto, a validação manual de pelo menos um cenário de cada grupo na versão 0.1.3 permanece pendente.

## 6. Lacunas corrigidas e segurança numérica

- Acrescentados os alertas clínicos ausentes, inclusive glicose >20% com acesso central.
- Alertas incluídos também no PDF e módulo incluído no cache offline; evita funcionar online e falhar por ausência do módulo offline.
- Comparação das doses solicitadas usa o número antes do arredondamento visual. Concentração e doses efetivas são comparadas por produtos decimais exatos, evitando falsos excessos causados por ponto flutuante.
- O arredondamento de **preparo** já existente foi preservado (0,1 mL na maioria dos componentes; 0,01 mL para zinco/selênio). Ele é distinto do arredondamento visual. Exemplo: 3,5 g/kg/dia de AA em 999 g resulta em 35,0 mL de AA 10% e oferta efetiva de aproximadamente 3,503504 g/kg/dia: cabe cautela de teto efetivo, não uma alegação de que a solicitação excedeu 3,5.
- Não houve correção ou alteração das fórmulas originais; a regressão confirmou sua preservação.

## 7. Decisão clínica ainda aberta

O teto máximo de AA para RN com peso ≥1000 g não foi definido pelo usuário. Não foi inventado: foi mantida a referência habitual de 3,0, com cautela para desvios. Caso se deseje um teto formal para esse grupo, deve ser definido pelo responsável clínico.

Foram mantidos **peso atual** e **dia de vida** (nascimento = dia 1), já usados na interface. Não foi criada uma regra diferente baseada em peso ao nascer ou dia de início da NP. Os novos testes são verificação técnica e não validação clínica formal.

## 8. Como executar e concluir a integração

Na cópia atualizada do projeto, execute `python3 -m http.server 8765` (Windows: `py -m http.server 8765`) e abra http://localhost:8765. Não há etapa de build nem dependência de runtime a instalar.

Para testes: Node.js ≥20; `npm ci --ignore-scripts`; `npm test`.

Para aplicar o pacote de recuperação ao repositório, siga INSTRUCOES.md dentro do ZIP; ele contém o patch integral e exige uma cópia limpa da base registrada. Não substitui silenciosamente uma versão remota mais nova.

Para concluir no GitHub, a integração precisa ter permissão de escrita no repositório jeffeped/NP_NEO. A recusa observada foi do GitHub; não foi rejeição do revisor automático de aprovações. Depois da integração, ainda é necessário validar manualmente os cenários na versão nova e conferir a atualização do cache offline antes de considerá-la entregue no endereço publicado.
