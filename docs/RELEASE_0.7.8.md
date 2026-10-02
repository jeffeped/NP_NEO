# GROW_NEO 0.7.8 — relatório integrado com antropometria Fenton

- O PDF combinado mantém duas páginas: avaliação nutricional e tabela antropométrica na primeira; gráfico recebido da Fenton na segunda.
- A primeira página mostra a perda ponderal percentual quando o peso medido é inferior ao nascimento. Quando há NP/HV, usa o peso atual medido e o peso de nascimento do cálculo intravenoso, mesmo entre D1 e D7; quando há apenas resultado de crescimento, identifica o peso final informado nessa aba. Não usa o peso institucional de cálculo como se fosse o peso medido.
- Ao gerar o gráfico, o app solicita também o CSV de escores à integração Fenton. A tabela apresenta peso, perímetro cefálico e comprimento com os escores Z e percentis recebidos, sem estimá-los localmente. Os dados do CSV são confrontados com sexo, IG e medidas enviados ao gráfico.
- Se o CSV falhar ou não conferir, o gráfico permanece disponível. O PDF combinado solicita uma tabela válida para evitar emitir valores ausentes ou trocados; o botão separado de escores permite tentar novamente.
- O cache offline inclui o leitor do CSV. Consultas novas ao serviço Fenton continuam a exigir conexão.

Verificações locais: parser com CSV fictício da integração, testes do PDF com até 20 medidas, perda ponderal em D7, falha da tabela preservando o gráfico e suíte automatizada. A imagem mínima usada nos testes de PDF valida incorporação e layout, não constitui referência clínica para o gráfico. Os testes intermitentes da integração externa serão investigados separadamente.
