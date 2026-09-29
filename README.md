# GROW_NEO by Prof. Jefferson

Instrumento de apoio à terapia nutricional neonatal, com nutrição parenteral, hidratação venosa, avaliação da dieta enteral e acompanhamento do crescimento. Versão de avaliação 0.7.0.

As mudanças de cada versão estão documentadas em [CHANGELOG.md](CHANGELOG.md), além do histórico auditável de commits do repositório.

O médico informa os parâmetros; o app calcula volumes, avalia a oferta enteral, integra o aporte nutricional parenteral + enteral e gera relatórios PDF no próprio aparelho. Não há cadastro de pacientes nem histórico de casos.

## Instalar no celular

- Android: abra o app no Chrome e selecione Instalar app ou Adicionar à tela inicial.
- iPhone: abra no Safari, toque em Compartilhar e em Adicionar à Tela de Início.
- Aguarde o indicador Pronto para usar offline antes de usar sem internet.
- Após a atualização do aplicativo, se o atalho ainda mostrar NP_NEO, remova o atalho instalado e adicione o app novamente para receber o ícone GROW_NEO.

Esta versão passou por verificações técnicas locais; não foi realizada validação clínica formal. Confira os resultados antes do uso assistencial.

Na aba Crescimento, o médico pode solicitar um gráfico JPG ou PDF e um CSV de
escores Z à Fenton 2025. A solicitação explícita envia sexo, idade gestacional
ao nascer e medidas seriadas por um Worker com a chave privada; não inclui
identificadores ou data de nascimento. Também há um link para o plotador oficial
(https://fentongrowth.ca/) em nova aba. A calculadora de velocidade do GROW_NEO
continua local. Consulte o [registro técnico da integração](docs/FENTON_INTEGRATION.md)
para fluxo, privacidade, verificação e pendências de validação clínica.

Responsável pelas definições: Jefferson Guilherme. O registro metodológico e as fontes de desenvolvimento são mantidos no projeto local.

## Ambulatório — oitava aba

Curvas pós-natais INTERGROWTH-21st para prematuros, com peso, comprimento e perímetro cefálico por sexo, escores Z e percentis. As avaliações usam **idade pós-menstrual (IPM) de 27 semanas + 0 dias a 64 semanas + 0 dias**, inclusive; a IPM é a idade gestacional ao nascer somada ao tempo decorrido desde o nascimento. Não informar idade corrigida nesse campo. Esta aba não cobre todo o seguimento ambulatorial depois de 64 semanas de IPM e não faz transição automática para outro padrão.

Informe de 1 a 20 avaliações, em ordem crescente de IPM, com pelo menos uma medida em cada avaliação. Peso em gramas; comprimento e perímetro cefálico em centímetros. O resultado exibe trajetórias e permite baixar um PDF separado. Cálculo, gráficos e PDF são locais e funcionam offline após o aplicativo indicar que está pronto; as medidas não são enviadas a um serviço externo nem mantidas entre sessões.

As equações foram implementadas a partir do Apêndice 8 de Villar et al. (2015), com conferência nas tabelas oficiais. O padrão provém de uma coorte selecionada e teve poucos participantes nascidos antes de 33 semanas. A implementação não equivale a validação clínica ou endosso do consórcio. Fontes, fórmulas, unidades, verificações e limitações estão no [registro técnico INTERGROWTH](docs/INTERGROWTH_INTEGRATION.md).

Biblioteca PDF: pdf-lib 1.17.1, licença MIT em vendor/pdf-lib-LICENSE.md.

## Executar e testar

Sem dependências de instalação ou compilação. Na pasta do projeto:

```sh
python3 -m http.server 8765
```

Abra http://localhost:8765. No Windows, pode usar `py -m http.server 8765`.
Use um servidor HTTP local; abrir `index.html` diretamente pode impedir os módulos JavaScript.

Para os testes, use Node.js 20 ou superior e execute `npm ci --ignore-scripts` e depois `npm test`.
A única dependência de desenvolvimento é `linkedom`, usada para simular a interface; o app não carrega essa biblioteca nem depende de Node.js para funcionar.
Os testes comparam todas as saídas anteriores do motor com amostras congeladas da versão 0.1.2.

## Alertas da bolsa individualizada

- VIG: velocidade de infusão de glicose, em mg/kg/min; fórmula preservada. Acima de 12 mg/kg/min na dose solicitada ou efetiva, bloqueia prescrição e PDF.
- Glicose final >20%: cautela também no acesso central; acima de 25%, bloqueio em ambos os acessos.
- Aminoácidos: referência de 2,0 g/kg/dia no dia 1; 3,0 após o dia 1; teto bloqueante de 3,5 g/kg/dia para todos os recém-nascidos, na solicitação ou na oferta efetiva, e de 4% na concentração final da NP individualizada.
- Lipídios: referência de 2,0 g/kg/dia no dia 1; 3,0 a partir do dia 2; teto de 4,0.
- Relação Ca:P sempre molar (mmol de Ca ÷ mmol de P). No dia 1, alvo 0,8–1,0:1, com atenção fora da faixa. Após o dia 1, faixa preferencial 0,8–1,2:1, orientação entre 1,2 e 1,3:1 e atenção abaixo de 0,8 ou acima de 1,3:1.
- Orientação e atenção continuam informativas; doses e concentrações acima dos tetos bloqueantes exigem novos parâmetros e recálculo antes da exportação.
- Doses solicitadas e efetivas são conferidas. Arredondar volumes de preparo pode elevar a oferta efetiva acima do teto, mesmo se a solicitação estiver no limite.
- A glicose >12,5% em acesso periférico continua bloqueante. Se os componentes excederem o volume solicitado, o aplicativo sinaliza em amarelo, usa a soma dos componentes como volume efetivo, com água q.s.p. zero, e recalcula a vazão e as concentrações; não imprime um volume fisicamente impossível.

Na infusão contínua de 24 horas, o limite lipídico bloqueante é 4 g/kg/dia, que corresponde exatamente a 4 ÷ 24 g/kg/h (aproximadamente 0,167 g/kg/h na tela). Uma oferta efetiva ligeiramente acima do limite pode surgir após arredondar o volume de preparo. A diretriz ESPGHAN/ESPEN/ESPR/CSPEN de lipídios recomenda infusão contínua por 24 horas e não ultrapassar 4 g/kg/dia em recém-nascidos (Lapillonne et al., Clin Nutr. 2018;37:2324–2336, doi:10.1016/j.clnu.2018.06.946). Os limites de concentração da bolsa de 4% e 25% são decisões do responsável clínico do projeto.

O teto bloqueante de VIG de 12 mg/kg/min segue o máximo preferencial para carboidratos parenterais da diretriz ESPGHAN/ESPEN/ESPR/CSPEN (Mesotten et al., Clin Nutr. 2018;37:2337–2343, doi:10.1016/j.clnu.2018.06.947). A solicitação e a oferta real após arredondar SG 50% são verificadas; o protocolo deste app transforma a recomendação preferencial em bloqueio.

**Taxa hídrica da NPP:** nos dias 1–5, o máximo da Tabela 1 de Jochum et al. (Clin Nutr. 2018;37:2344–2353; doi:10.1016/j.clnu.2018.06.948) depende do dia, prematuridade e faixa de peso ao nascer. De D6 a D30, a fase intermediária ou estável deve ser selecionada pelo médico (Tabelas 2–3). A taxa solicitada e a efetiva, inclusive após ajuste amarelo do VT, são comparadas ao máximo; ultrapassá-lo bloqueia prescrição e PDF. Após D30 há apenas aviso, pois as tabelas neonatais não fixam teto nessa faixa. A fonte reconhece variações clínicas importantes (recomendação 6.13); o app não integra outras fontes de água para esta trava.
**Erros evidentes de entrada:** peso atual fora de 100–20.000 g, peso ao nascer fora de 100–10.000 g, idade gestacional ao nascer fora de 18–45 semanas, dia de vida acima de 365 e taxa hídrica acima de 500 mL/kg/dia exigem revisão antes do cálculo. Essas faixas largas verificam digitação e unidade; não são valores recomendados de prescrição. As doses de eletrólitos permanecem para revisão clínica específica.

**Abaixo de 80 mL/kg/dia:** a taxa solicitada ou efetiva aciona aviso amarelo para considerar glicerofosfato de sódio quando houver cálcio e fósforo, em lugar de fosfato de potássio. O limiar de 80 é uma decisão do protocolo do projeto, não um ponto de corte da diretriz. Fosfato orgânico reduz o risco de precipitação cálcio-fósforo, segundo ESPGHAN/ESPEN/ESPR/CSPEN (Complications, Clin Nutr. 2018;37:2418–2429, recomendação 14.15); a compatibilidade da mistura exige conferência farmacêutica individual.
O peso é informado e exibido em **gramas** em NP individualizada, NP padrão, HV, Enteral e Crescimento. Os motores de NP e HV convertem gramas para kg antes de aplicar fórmulas e limites por kg. O nascimento é o dia 1 de vida.
Na entrada de peso, “1.000” corresponde a mil gramas; a vírgula é usada para frações de grama. A conversão para kg ocorre antes do cálculo.

Após atualizar a versão hospedada, use “Atualização disponível · reiniciar” no app para trocar o cache offline. Os parâmetros do formulário são descartados ao reiniciar.
Consulte `RELATORIO_ALERTAS_NP.md` para alterações, verificação e limitações.

## Hidratação venosa — terceira aba

O médico informa peso em g, taxa hídrica em mL/kg/dia, VIG em mg/kg/min e as doses de Na, K, Ca e Mg. Não há doses ou VIG preenchidas automaticamente. A unidade dos eletrólitos deve ser escolhida: mEq/kg/dia ou mEq totais em 24 horas; ao trocá-la, as doses são apagadas para evitar reinterpretar os mesmos números em outra unidade.

Soluções: NaCl 10%, KCl 10%, gluconato de cálcio 10%, sulfato de magnésio 10%, SG 5% e SG 50%. As equivalências iniciais de eletrólitos vêm do cadastro existente (respectivamente 1,7; 1,34; 0,5; 0,8 mEq/mL), ficam visíveis e podem ser ajustadas conforme o rótulo. Não são tratadas como universais para todo fabricante; mudar uma equivalência na HV não modifica a NP.

Fórmulas confirmadas pelo responsável:

```text
VT (mL/24 h) = taxa hídrica (mL/kg/dia) × [peso informado (g) / 1000]
gG (g/24 h) = VIG (mg/kg/min) × [peso informado (g) / 1000] × 60 × 24 / 1000
Volume de cada eletrólito (mL) = mEq totais em 24 h / equivalência (mEq/mL)
VR (mL) = VT − soma dos volumes dos eletrólitos
SG 50% (mL) = [gG − (VR × 0,05)] / 0,45
SG 5% (mL) = VR − SG 50%
Vazão (mL/h) = VT / 24
```

As comparações de viabilidade usam aritmética decimal racional, sem arredondamento intermediário. VT, vazão e volumes dos componentes são exibidos com uma casa decimal, arredondados para cima somente na apresentação; os cálculos internos preservam a precisão completa. SG 5% completa o VT. A oferta deve ser conferida após o arredondamento de preparo.

Não há composição quando os eletrólitos consomem todo o VT ou quando a VIG exige SG 5% ou SG 50% negativo. A faixa possível informada é uma restrição matemática das duas soluções, não uma meta clínica. O módulo não acrescenta limites de dose, regras de acesso ou validação de compatibilidade físico-química da mistura. Formulários e resultados da NP e da HV são independentes. A NP individualizada e a NP padrão possuem exportação PDF independente.

Verificação local: 177 testes aprovados, incluindo os 124 anteriores, 46 testes novos do motor de HV e 7 novos fluxos de interface simulada. Consulte `RELATORIO_HIDRATACAO_VENOSA.md` para o registro da entrega.

### NP padrão (0.6.5)

A quarta aba usa Numeta G13%E sem diluição, com escolha explícita entre
três câmaras ativadas (3:1, 300 mL) e duas câmaras ativadas (2:1, 240 mL;
câmara lipídica fechada). Entradas: peso, dia de vida, acesso, apresentação
e taxa destinada ao Numeta (mL/kg/dia) ou proteína (g/kg/dia). No segundo modo,
taxa = proteína × volume da apresentação / 9,4.
As ofertas são calculadas a partir dos valores por bolsa inteira; não se usa
concentração por 100 mL arredondada para inverter a dose. Na apresentação 2:1,
o total de 240 mL fornece 9,4 g de aminoácidos, 40 g de glicose, zero lipídios,
198 kcal (160 kcal não proteicas), Na 6,4 mEq e P 3,2 mmol. Na 3:1, o total
de 300 mL fornece 9,4 g de aminoácidos, 40 g de glicose, 7,5 g de lipídios,
273 kcal (235 kcal não proteicas), Na 6,6 mEq e P 3,8 mmol. A diferença de
fósforo na 3:1 inclui fosfolipídios da emulsão. A tela e o PDF apresentam a
composição por 100 mL derivada dos totais completos, além da oferta diária.
Volume = taxa × peso;
vazão média = volume / 24. Resultados têm precisão interna completa e uma
casa decimal na oferta diária (até duas na composição por 100 mL). Volume e
vazão são arredondados para cima, como na HV.

A apresentação acompanha a NP individualizada: composição, contexto,
resumo e detalhamento de ofertas. A exportação PDF inclui composição, indicadores fixos e variáveis, ofertas
e alertas. Entradas alteradas invalidam o PDF e bloqueios impedem exportar. Vitaminas, oligoelementos, diluição e outros aportes não são calculados.
Acesso periférico e volume acima do máximo de bula da apresentação selecionada
(2:1: 102,3 mL/kg/dia e 5,1 mL/kg/h; 3:1: 127,9 mL/kg/dia e 6,4 mL/kg/h)
impedem apresentar o texto de prescrição, mantendo os cálculos visíveis para
revisão. Os alertas do projeto sobre proteína e lipídios são sinalizados
separadamente dos limites de bula; para 2:1, lipídios da bolsa são zero.
A solução 2:1 sem diluição tem osmolaridade aproximada de 1.400 mOsm/L,
contra 1.150 mOsm/L da 3:1. Lipídios infundidos por outra via não entram nas
ofertas da bolsa nem no total integrado PN + enteral e exigem cálculo separado.

Fonte da composição e limites: Baxter, SmPC Numeta G13%E, atualizado em
19/05/2026, seções 2 e 4.2; consulta em 16/09/2026:
https://www.medicines.org.uk/emc/product/7400/smpc
A composição deverá ser confrontada com a apresentação local antes da liberação.

### Zinco e selênio por idade gestacional (0.3.5)

Na NP individualizada, prematuros recebem referência de zinco de 400–500 mcg/kg/dia e selênio de 7 mcg/kg/dia. Recém-nascidos a termo recebem zinco de 250 mcg/kg/dia e selênio selecionável entre 2–3 mcg/kg/dia. A classificação usa a idade gestacional ao nascer, sem empregar peso de 1.500 g como substituto de prematuridade. Aplicam-se os máximos de 5 mg/dia de zinco e 100 mcg/dia de selênio, conforme Domellöf et al., Clinical Nutrition 2018;37:2354–2359.

### Relação Ca/P na prescrição (0.3.4)

A tela e o PDF mostram a relação molar Ca/P (mmol/mmol) logo abaixo de proteína/calorias não proteicas, tanto na NP individualizada quanto na padrão. A individualizada usa as ofertas efetivas após arredondamento dos volumes: (Ca em mEq ÷ 2) ÷ P em mmol. Sem fósforo, informa “Não calculável (P = 0)”. Exibição com uma casa decimal.

### Concentrações finais de cálcio e fósforo (0.5.3)

Na NP individualizada, a tela e o PDF mostram cálcio em mEq/L e fósforo em mmol/L, calculados com as quantidades efetivamente preparadas e o volume final da bolsa. Com gluconato de cálcio e glicerofosfato de sódio, valores acima de 50 mEq/L de cálcio ou 25 mmol/L de fósforo geram orientação para confirmar a compatibilidade físico-química com a farmácia. Esses valores correspondem à composição estudada por Wang et al. (Pediatr Neonatol. 2020;61:339-345; DOI 10.1016/j.pedneo.2020.02.004) e não constituem limite universal de solubilidade. Quando há cálcio associado a fosfato inorgânico, o aplicativo solicita conferência em curva específica da formulação. Os avisos não bloqueiam o cálculo ou a exportação.

## Integração intravenosa + enteral e metas de transição PN → EN — v0.5.0

Critérios operacionais aprovados pelo responsável clínico em 19/09/2026:

| Condição | Comportamento |
| --- | --- |
| EN ≤50 mL/kg/dia ou ausência de PN | Metas de transição não avaliadas |
| EN >50 mL/kg/dia com PN presente | Avalia os totais PN + EN |
| Energia total ≥110 kcal/kg/dia | Meta energética atingida |
| Proteína total ≥2,50 g/kg/dia | Meta proteica atingida |

As comparações usam os valores internos sem arredondamento. Na aba Enteral, selecione explicitamente uma única fonte: sem aporte intravenoso, NP individualizada, NP padrão (Numeta) ou HV. A fonte precisa ter um cálculo atual válido, sem bloqueios, na aba correspondente. Alterações invalidam o resultado e exigem recálculo. A presença de PN exige fonte individualizada ou padrão com volume positivo. HV fornece volume e energia da glicose (4 kcal/g, fator já usado no app), sem proteína; com HV ou sem aporte intravenoso, as metas de transição não são avaliadas. As metas são informativas; não determinam redução/suspensão da PN. Tela e PDF usam a mesma avaliação. Os critérios estão também na aba Notas.

Ver [relatório de verificação](RELATORIO_TRANSICAO_PN_EN.md). Executar `npm ci` e `npm test` para a regressão completa.

Ver [verificação da integração v0.5.0](RELATORIO_INTEGRACAO_IV_EN.md).
