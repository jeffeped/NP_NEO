# GROW_NEO 0.8.8 — prancha única no relatório integrado INTERGROWTH

Alteração local solicitada por Jefferson Guilherme em 15/10/2026: substituir os três gráficos da segunda página pela nova prancha aprovada, preservando a primeira página e todos os cálculos. Base: 0.8.7 publicada. Alteração inicialmente preparada localmente como 0.8.8 e incluída na publicação 0.8.9.

O adaptador INTERGROWTH passa a utilizar o gerador da prancha integrada na segunda página. O gerador compartilhado da primeira página (`fenton-nutrition-pdf.js`), as equações antropométricas e os cálculos nutricionais permanecem byte a byte inalterados. A indicação da versão acompanha a atualização 0.8.8.

A prancha recebe redução uniforme de 4%, com proporção mantida, para reservar o rodapé de emissão do relatório. A página é identificada como 2/2 e a data é aplicada uma única vez pelo montador existente. Código opcional vai só para a página gráfica; editar o código invalida o relatório. PDF avulso e visualização da aba mantêm sua apresentação 0.8.7.

Regressão baseada na saída original 0.8.7, capturada antes da mudança: comparação de todos os textos, posições, fontes, cores, linhas e retângulos da primeira página em cinco cenários (ambos os sexos com 20 consultas, limites/ausências, valores fora da grade e velocidade). O número da versão é a única normalização admitida. Os mesmos fluxos de conteúdo da página 1 também foram conferidos byte a byte antes da alteração do número de versão.

Validação final: 810 testes aprovados; fluxo real no navegador para os cinco cenários e geração offline; 11 PDFs salvos reabertos e renderizados, com duas páginas, autoria Jefferson Guilherme e rodapé conferido. Revisão visual das duas páginas do caso masculino com 20 consultas e da segunda página dos casos feminino, limites, fora da grade e velocidade. Revisão independente do código sem achados acionáveis. Esta alteração integra a publicação 0.8.9.
