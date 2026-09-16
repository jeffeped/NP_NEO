# NP_NEO by Prof. Jeffe

Calculadora de apoio à nutrição parenteral neonatal. Versão de avaliação 0.1.3.

O médico informa os parâmetros; o app calcula volumes e gera um relatório PDF no próprio aparelho. Não há cadastro de pacientes nem histórico de casos.

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
- Orientação, atenção e ultrapassagem do teto são níveis informativos, sem acrescentar impedimentos à exportação.
- Doses solicitadas e efetivas são conferidas. Arredondar volumes de preparo pode elevar a oferta efetiva acima do teto, mesmo se a solicitação estiver no limite.
- Os bloqueios anteriores, incluindo glicose >12,5% em acesso periférico e volume inviável, permanecem.

O teto máximo de aminoácidos para peso ≥1 kg não foi definido nas regras recebidas. Acima da referência habitual há cautela, sem aplicar o teto de 3,5 g/kg/dia a esse grupo.
O app já utiliza **peso atual em kg** e **dia de vida**, com nascimento = dia 1; estes critérios foram preservados.

Após atualizar a versão hospedada, use “Atualização disponível · reiniciar” no app para trocar o cache offline. Os parâmetros do formulário são descartados ao reiniciar.
Consulte `RELATORIO_ALERTAS_NP.md` para alterações, verificação e limitações.
