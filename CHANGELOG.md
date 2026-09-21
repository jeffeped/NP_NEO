# Histórico de versões

Registro das mudanças publicadas do NP_NEO. O histórico detalhado e auditável permanece também nos commits do Git.

## 0.5.1 — 21/09/2026

- Em 21/09/2026, o responsável aprovou manter provisoriamente o método de osmolaridade da HV para testes e comparação com a fórmula clínica habitual. Eventual troca exigirá revisão explícita do método; não há substituição automática.
- Registra referências bibliográficas completas nas Notas e a procedência no código, distinguindo o método aditivo publicado da adaptação estequiométrica implementada.

- Acrescenta Exportar PDF à HV, com composição, parâmetros, osmolaridade e autoria de Jefferson P Guilherme.
- Exibe a osmolaridade calculada imediatamente após a concentração final de glicose na tela e no PDF.
- Acrescenta VT e vazão juntos na última linha dos resultados e do relatório.
- Estima a osmolaridade pela soma das contribuições dos componentes no volume final, com dissociação ideal dos sais e osmolaridades de bula ajustáveis para SG 5% e SG 50%. Explica fórmula, referências e limites nas Notas.
- Preserva cálculos de volume, VIG e doses e a regra de uma casa decimal com arredondamento para cima na apresentação.
- Impede exportação de mistura inviável e invalida PDFs após edição, inclusive durante a geração. Inclui o gerador no cache offline.

- Verificação local: 95 testes aprovados (HV, osmolaridade, exportação, invalidação, integração e PDFs); PDF renderizado e conferido visualmente.

## 0.5.0 — 19/09/2026

- Integra a enteral a uma fonte intravenosa explicitamente selecionada: sem IV, NP individualizada, NP padrão (Numeta) ou HV.
- Soma taxas hídrica, energética e proteica com precisão interna; Numeta usa a energia integral da bolsa e HV usa glicose × 4 kcal/g, sem proteína intravenosa.
- Identifica a fonte e o peso de seu cálculo na tela e no PDF. Não soma outras abas automaticamente.
- Exige cálculo atual válido da fonte; edições, fonte ausente e impedimentos já existentes não podem gerar/exportar totais obsoletos.
- Aplica a régua aprovada a NP individualizada e Numeta; mantém inativa com HV ou sem IV. Limiares inalterados.
- Atualiza Notas, documentação e cache. 305 testes aprovados, incluindo as quatro fontes, ambas as entradas de Numeta, fronteiras, invalidação, bloqueios e PDF.

## 0.4.4 — 19/09/2026

- Renomeia a interface, identificação de instalação e relatórios para GROW_NEO by Prof. Jefferson.
- Adiciona a logo aprovada no canto superior direito, preservando a identificação UEA.
- Retira o selo Avaliação do cabeçalho; mantém a orientação de conferência clínica no rodapé.
- Move Atualizar para abaixo da logo, sempre visível, com consulta de nova versão, mensagens de estado e confirmação antes de reiniciar.
- Organiza as seis abas em duas linhas no celular, sem quebrar palavras.
- Atualiza cache offline para incluir logo e módulo de atualização. Não altera cálculos ou regras clínicas.
- Verificação: 252 testes aprovados, incluindo atualização sem nova versão, cancelamento, ativação e falha de conexão.

## 0.4.3 — 19/09/2026

- Implementa a régua de transição PN → EN aprovada: ativa somente com EN >50 mL/kg/dia e PN presente; avalia separadamente energia total ≥110 kcal/kg/dia e proteína total ≥2,50 g/kg/dia.
- Compara valores internos sem arredondamento; mostra proteína com duas casas na tabela integrada e no PDF.
- Inclui a régua no PDF e os critérios nas Notas; mantém a integração com a última NP individualizada calculada na sessão.
- Invalida resultado/PDF enteral após edição enteral ou novo cálculo de PN e impede download de geração assíncrona obsoleta.
- Atualiza versão, lockfile e cache offline. Regressão: 247 testes aprovados; fronteiras, ausência de PN, interface e PDF cobertos.
- Não acrescenta regra de redução ou suspensão automática da PN.

## 0.4.2 — 18/09/2026

- Torna os alertas de resultado mais objetivos, aproveitando a aba Notas para explicações fixas.
- Remove peso e dia de vida repetidos das mensagens de alerta.
- Simplifica os alertas de osmolaridade, aminoácidos e lipídios.
- Remove a frase sobre teto lipídico dos alertas habituais; o teto permanece explícito quando realmente ultrapassado.
- Não altera regras ou cálculos clínicos.

## 0.4.1 — 18/09/2026

- Corrige a apresentação responsiva da tabela de oferta nutricional total em telas de celular.
- Preserva a última NP individualizada válida durante a navegação para a aba Enteral, permitindo a soma PN + enteral.
- Acrescenta testes de regressão específicos para ambas as correções.
- Não altera regras ou fórmulas clínicas.

## 0.4.0 — 18/09/2026

- Marco de expansão do NP_NEO em direção ao GROW_NEO.
- Adiciona o módulo de dieta enteral com LMO, LHOP, FPT e FP.
- Estima energia e proteína do LMO conforme fase da lactação e permite composição conhecida/analisada.
- Inclui fortificação com FM85 e cálculo da oferta enteral em kcal/kg/dia e g de proteína/kg/dia.
- Integra nutrição parenteral e enteral em um quadro de aporte nutricional total: taxa hídrica, energia e proteína.
- Adiciona exportação do aporte nutricional total em PDF, sem identificação do paciente.
- Adiciona casos de verificação do módulo enteral, testes de interface, teste do PDF e integração contínua automatizada.
- Mantém a versão como instrumento de avaliação; validação clínica formal ainda não realizada.

## 0.3.6 — 18/09/2026

- Adiciona a aba “Notas importantes” com bases dos cálculos, limitações, segurança, privacidade e referências.
- Transfere explicações fixas sobre osmolaridade, fatores energéticos e arredondamentos para a nova aba.
- Mantém nas telas de resultado somente valores, avisos contextuais e bloqueios de segurança.
- Amplia a navegação acessível por teclado para cinco abas.

## 0.3.5 — 18/09/2026

- Corrige as doses de zinco e selênio conforme ESPGHAN/ESPEN/ESPR/CSPEN 2018.
- Passa a distinguir prematuros e recém-nascidos a termo pela idade gestacional ao nascer, sem usar peso de 1.500 g como substituto de prematuridade.
- Prematuros: zinco selecionável entre 400–500 mcg/kg/dia e selênio automático de 7 mcg/kg/dia.
- Recém-nascidos a termo: zinco automático de 250 mcg/kg/dia e selênio selecionável entre 2–3 mcg/kg/dia.
- Aplica os máximos de 5 mg/dia de zinco e 100 mcg/dia de selênio, inclusive após o arredondamento dos volumes.
- Mantém o desconto do zinco já fornecido pela solução de oligoelementos.
- Amplia a suíte para 201 testes, incluindo as fronteiras de 36 semanas + 6 dias e 37 semanas.

## 0.3.4 — 18/09/2026

- Exibe a relação molar Ca/P na prescrição individualizada e na NP padrão, inclusive no PDF.
- Inclui a osmolaridade estimada e a orientação de acesso venoso central acima de 900 mOsm/L.

## 0.3.1 — 16/09/2026

- Padroniza a apresentação da NP padrão e do PDF com uma casa decimal.

## 0.3.0 — 16/09/2026

- Adiciona a aba de NP padrão com Numeta G13%E.
- Permite calcular pela taxa hídrica ou pela oferta proteica e exportar o resultado em PDF.

## 0.2.1 — 16/09/2026

- Padroniza as casas decimais dos volumes na hidratação venosa.

## 0.2.0 — 16/09/2026

- Adiciona a calculadora de hidratação venosa.

## 0.1.3 — 16/09/2026

- Publica os alertas neonatais confirmados para glicose, aminoácidos e lipídios.
- Adota VIG em mg/kg/min em toda a interface e nos relatórios.

## 0.1.2

- Consolida a versão inicial de avaliação da calculadora de NP neonatal individualizada.
