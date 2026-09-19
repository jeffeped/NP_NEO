# NP_NEO by Prof. Jeffe

Instrumento de apoio à terapia nutricional neonatal, com nutrição parenteral, hidratação venosa e avaliação da dieta enteral. Versão de avaliação 0.4.0.

As mudanças de cada versão estão documentadas em [CHANGELOG.md](CHANGELOG.md), além do histórico auditável de commits do repositório.

O médico informa os parâmetros; o app calcula volumes, avalia a oferta enteral, integra o aporte nutricional parenteral + enteral e gera relatórios PDF no próprio aparelho. Não há cadastro de pacientes nem histórico de casos.

## Instalar no celular

- Android: abra o app no Chrome e selecione Instalar app ou Adicionar à tela inicial.
- iPhone: abra no Safari, toque em Compartilhar e em Adicionar à Tela de Início.
- Aguarde o indicador Pronto para usar offline antes de usar sem internet.

Esta versão passou por verificações técnicas locais; não foi realizada validação clínica formal. Confira os resultados antes do uso assistencial.

Responsável pelas definições: Jefferson Guilherme. O registro metodológico e as fontes de desenvolvimento são mantidos no projeto local.

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

- VIG: velocidade de infusão de glicose, em mg/kg/min; fórmula preservada.
- Glicose final >20%: cautela também no acesso central, sem novo bloqueio.
- Aminoácidos: referência de 2,0 g/kg/dia no dia 1; 3,0 após o dia 1; teto de 3,5 somente para peso atual <1 kg.
- Lipídios: referência de 2,0 g/kg/dia no dia 1; 3,0 a partir do dia 2; teto de 4,0.
- Relação Ca:P sempre molar (mmol de Ca ÷ mmol de P). No dia 1, alvo 0,8–1,0:1, com atenção fora da faixa. Após o dia 1, faixa preferencial 0,8–1,2:1, orientação entre 1,2 e 1,3:1 e atenção abaixo de 0,8 ou acima de 1,3:1.
- Orientação, atenção e ultrapassagem do teto são níveis informativos, sem acrescentar impedimentos à exportação.
- Doses solicitadas e efetivas são conferidas. Arredondar volumes de preparo pode elevar a oferta efetiva acima do teto, mesmo se a solicitação estiver no limite.
- Os bloqueios anteriores, incluindo glicose >12,5% em acesso periférico e volume inviável, permanecem.

O teto máximo de aminoácidos para peso ≥1 kg não foi definido nas regras recebidas. Acima da referência habitual há cautela, sem aplicar o teto de 3,5 g/kg/dia a esse grupo.
O app já utiliza **peso atual em kg** e **dia de vida**, com nascimento = dia 1; estes critérios foram preservados.

Após atualizar a versão hospedada, use “Atualização disponível · reiniciar” no app para trocar o cache offline. Os parâmetros do formulário são descartados ao reiniciar.
Consulte `RELATORIO_ALERTAS_NP.md` para alterações, verificação e limitações.

## Hidratação venosa — terceira aba

O médico informa peso em kg, taxa hídrica em mL/kg/dia, VIG em mg/kg/min e as doses de Na, K, Ca e Mg. Não há doses ou VIG preenchidas automaticamente. A unidade dos eletrólitos deve ser escolhida: mEq/kg/dia ou mEq totais em 24 horas; ao trocá-la, as doses são apagadas para evitar reinterpretar os mesmos números em outra unidade.

Soluções: NaCl 10%, KCl 10%, gluconato de cálcio 10%, sulfato de magnésio 10%, SG 5% e SG 50%. As equivalências iniciais de eletrólitos vêm do cadastro existente (respectivamente 1,7; 1,34; 0,5; 0,8 mEq/mL), ficam visíveis e podem ser ajustadas conforme o rótulo. Não são tratadas como universais para todo fabricante; mudar uma equivalência na HV não modifica a NP.

Fórmulas confirmadas pelo responsável:

```text
VT (mL/24 h) = taxa hídrica (mL/kg/dia) × peso (kg)
gG (g/24 h) = VIG (mg/kg/min) × peso (kg) × 60 × 24 / 1000
Volume de cada eletrólito (mL) = mEq totais em 24 h / equivalência (mEq/mL)
VR (mL) = VT − soma dos volumes dos eletrólitos
SG 50% (mL) = [gG − (VR × 0,05)] / 0,45
SG 5% (mL) = VR − SG 50%
Vazão (mL/h) = VT / 24
```

As comparações de viabilidade usam aritmética decimal racional, sem arredondamento intermediário. VT, vazão e volumes dos componentes são exibidos com uma casa decimal, arredondados para cima somente na apresentação; os cálculos internos preservam a precisão completa. SG 5% completa o VT. A oferta deve ser conferida após o arredondamento de preparo.

Não há composição quando os eletrólitos consomem todo o VT ou quando a VIG exige SG 5% ou SG 50% negativo. A faixa possível informada é uma restrição matemática das duas soluções, não uma meta clínica. O módulo não acrescenta limites de dose, regras de acesso ou validação de compatibilidade físico-química da mistura. Formulários e resultados da NP e da HV são independentes. A NP individualizada e a NP padrão possuem exportação PDF independente.

Verificação local: 177 testes aprovados, incluindo os 124 anteriores, 46 testes novos do motor de HV e 7 novos fluxos de interface simulada. Consulte `RELATORIO_HIDRATACAO_VENOSA.md` para o registro da entrega.

### NP padrão (0.3.1)

A quarta aba usa Numeta G13%E, três câmaras ativadas (300 mL), sem diluição.
Entradas: peso, dia de vida, acesso e taxa destinada ao Numeta (mL/kg/dia)
ou proteína (g/kg/dia). No segundo modo, taxa = proteína × 300 / 9,4.
As ofertas são calculadas a partir dos valores por bolsa inteira; não se usa
3,1 g/100 mL arredondado para inverter a dose. Volume = taxa × peso;
vazão média = volume / 24. Resultados têm precisão interna completa e uma
casa decimal na exibição. Volume e vazão são arredondados para cima, como na HV.

A apresentação acompanha a NP individualizada: composição, contexto,
resumo e detalhamento de ofertas. A exportação PDF inclui composição, indicadores fixos e variáveis, ofertas
e alertas. Entradas alteradas invalidam o PDF e bloqueios impedem exportar. Vitaminas, oligoelementos, diluição e outros aportes não são calculados.
Acesso periférico e volume acima do máximo de bula impedem apresentar o texto
de prescrição, mantendo os cálculos visíveis para revisão. Os alertas do projeto
sobre proteína e lipídios são sinalizados separadamente dos limites de bula.

Fonte da composição e limites: Baxter, SmPC Numeta G13%E, atualizado em
19/05/2026, seções 2 e 4.2; consulta em 16/09/2026:
https://www.medicines.org.uk/emc/product/7400/smpc
A composição deverá ser confrontada com a apresentação local antes da liberação.

### Zinco e selênio por idade gestacional (0.3.5)

Na NP individualizada, prematuros recebem referência de zinco de 400–500 mcg/kg/dia e selênio de 7 mcg/kg/dia. Recém-nascidos a termo recebem zinco de 250 mcg/kg/dia e selênio selecionável entre 2–3 mcg/kg/dia. A classificação usa a idade gestacional ao nascer, sem empregar peso de 1.500 g como substituto de prematuridade. Aplicam-se os máximos de 5 mg/dia de zinco e 100 mcg/dia de selênio, conforme Domellöf et al., Clinical Nutrition 2018;37:2354–2359.

### Relação Ca/P na prescrição (0.3.4)

A tela e o PDF mostram a relação molar Ca/P (mmol/mmol) logo abaixo de proteína/calorias não proteicas, tanto na NP individualizada quanto na padrão. A individualizada usa as ofertas efetivas após arredondamento dos volumes: (Ca em mEq ÷ 2) ÷ P em mmol. Sem fósforo, informa “Não calculável (P = 0)”. Exibição com uma casa decimal.

## Integração intravenosa + enteral e régua PN → EN — v0.5.0

Critérios operacionais aprovados pelo responsável clínico em 19/09/2026:

| Condição | Comportamento |
| --- | --- |
| EN ≤50 mL/kg/dia ou ausência de PN | Régua inativa |
| EN >50 mL/kg/dia com PN presente | Avalia os totais PN + EN |
| Energia total ≥110 kcal/kg/dia | Meta energética atingida |
| Proteína total ≥2,50 g/kg/dia | Meta proteica atingida |

As comparações usam os valores internos sem arredondamento. Na aba Enteral, selecione explicitamente uma única fonte: sem aporte intravenoso, NP individualizada, NP padrão (Numeta) ou HV. A fonte precisa ter um cálculo atual válido, sem bloqueios, na aba correspondente. Alterações invalidam o resultado e exigem recálculo. A presença de PN exige fonte individualizada ou padrão com volume positivo. HV fornece volume e energia da glicose (4 kcal/g, fator já usado no app), sem proteína; com HV ou sem aporte intravenoso, a régua fica inativa. A régua é informativa; não determina redução/suspensão da PN. Tela e PDF usam a mesma avaliação. Os critérios estão também na aba Notas.

Ver [relatório de verificação](RELATORIO_TRANSICAO_PN_EN.md). Executar `npm ci` e `npm test` para a regressão completa.

Ver [verificação da integração v0.5.0](RELATORIO_INTEGRACAO_IV_EN.md).
