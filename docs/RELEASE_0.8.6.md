# GROW_NEO 0.8.6 — tabelas INTERGROWTH no celular

Responsável: Jefferson Guilherme. Data: 14/10/2026 (Manaus). Continuação do mesmo pedido de integração nutricional e equivalência funcional da Intergrowth, com publicação já autorizada. Base publicada: 0.8.5, main0b0381920a2a71e54a1f6356de5776d45a8c7381.

Na conferência visual do endereço público, a tabela da simulação quebrou os números em caracteres no celular. Causa: regra geral reservava70% da largura para a primeira coluna, enquanto a tabela de seis colunas não tinha as regras específicas usadas pela Fenton. A tabela de medidas reais ainda reservava100% para as quatro colunas anteriores à inclusão da VC.

Correção restrita ao CSS Intergrowth: tabelas com largura mínima e rolagem horizontal no respectivo quadro; números sem quebra na simulação; larguras explícitas das cinco colunas da tabela real; largura mínima do SVG da simulação. Nenhum cálculo, arquivo de acompanhamento ou layout de PDF alterado.

A verificação de navegador reproduziu a falha em320px antes da correção. Depois confirmou larguras legíveis, VC visível por rolagem, texto sem quebra por caractere e ausência de transbordamento da página em320/390/768px. O mesmo fluxo conferiu20medidas fictícias, alerta, projeções, PDF de duas páginas, relato de cinco linhas, CSV/SVG, salvar/reabrir e recarga/PDF offline, sem erros JavaScript.796testes locais aprovados. Revisão independente direcionada ao CSS. Estado da publicação: consultar histórico do GitHub e o registro local de publicação, sem confundir estes testes com uma validação clínica.
