# GROW_NEO 0.7.8 - relatório integrado

Responsável clínico: Jefferson Guilherme. Preparada em 02/10/2026 (Manaus).
Base publicada: 0.7.7, commit b8489222a5674b51d119ac04eb1adb2a0499b7de.
Estado: candidata; envio e publicação pendentes.

## Comportamento

O PDF de aporte total + Fenton contém exatamente duas páginas. A primeira reúne
aportes, metas, velocidade de crescimento, perda ponderal quando o peso atual
está abaixo do peso ao nascer e a tabela de antropometria com Z e percentil.
A segunda preserva o gráfico oficial inteiro, inclusive créditos.

A perda percentual é (peso ao nascer - peso medido) / peso ao nascer × 100.
Usa os pesos e dia do resultado nutricional quando disponíveis; usa a avaliação
de crescimento quando não há esse contexto. Não usa o peso de cálculo da NP
como substituto do peso medido. Pesos inválidos ou já acima do PN não geram perda.
Não permite inferir uma recuperação anterior seguida de nova perda a partir de
somente dois pesos; por isso a frase é «abaixo do peso ao nascer».

O gráfico e o CSV são requisitados para as mesmas medidas. O app lê os valores
recebidos, confere IPM, antropometria e número de linhas, exclui mudanças de Z
como substitutas do Z absoluto e não estima percentis. A tabela pode conter
até 20 avaliações; campos antropométricos não informados aparecem como «-».
Inconsistências impedem combinar a tabela com o gráfico. Edições revogam os
resultados derivados; a falha no CSV mantém o gráfico disponível e explicita
que a tabela precisa ser gerada antes do PDF integrado.

O relatório de aporte total da aba Enteral também mostra a perda ponderal.
Não foram alteradas doses, composições, fatores energéticos, trava de acesso,
aceites, regra D7/D8, segredo da API ou código do proxy.

## Verificações e limites

Suíte automática local: 672 testes aprovados, zero falhas, zero exclusões.
Navegador: exportação, invalidação por edição, uso offline com gráfico e tabela
em memória, recarga offline sem dados do paciente e larguras 320/390/768.
Conferência visual das duas páginas, inclusive 20 medidas na primeira, com
escores fictícios: tabela, perda percentual, imagem inteira e rodapés sem cortes.
O esquema com colunas de medida, Z, percentil e mudança de Z foi conferido no
manual oficial: https://fentongrowth.ca/docs/Fenton2025PlotterUsersManual.pdf,
páginas 8-9, consultado em 02/10/2026.

As chamadas reais ao serviço não puderam ser executadas neste ambiente:
rede local recusada com EACCES/ERR_NETWORK_ACCESS_DENIED. O gráfico de teste e
os escores usados nos ensaios locais são simulados e identificados como fictícios.
Não equivalem a validação clínica ou teste real da disponibilidade da API.
Após o envio, verificar no app publicado um caso fictício com peso, comprimento
e PC, a tabela recebida e o PDF integrado. A chave privada não deve ser enviada.

Tentativa de create_tree pelo conector GitHub recusada:
«MCP tool call requires approval, but approval policy is never».
Nenhum arquivo, commit ou PR remoto foi criado por esta sessão.
