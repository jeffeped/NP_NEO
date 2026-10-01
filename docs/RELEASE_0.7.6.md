# GROW_NEO 0.7.6

## Escopo de 1 de outubro de 2026

Esta versão reúne somente as mudanças funcionais autorizadas:

1. Energia enteral analisada negativa: preservar o valor digitado, sinalizar informação inválida e usar zero no cálculo, pedindo revisão e recálculo sem bloqueio exclusivo por essa condição.
2. Proteína enteral analisada negativa: aplicar a mesma regra. Energia e proteína do FM85 são acrescentadas separadamente. A condição inválida acompanha a totalização e os PDFs, sem apresentar o zero calculado como medição.
3. HV com água para injetáveis: permitir o diluente quando necessário para atingir a VIG. Exigir confirmação explícita do prescritor de que revisou composição, tonicidade e compatibilidade antes de PDF ou integração enteral. Edição de parâmetros, recálculo ou revogação retiram a confirmação e invalidam downloads/totais anteriores.

Água para injetáveis é componente de mistura, nunca de infusão isolada. Permanecem bloqueados: água isolada, entradas inválidas ou não finitas, ausência de volume e demais impossibilidades, glicose final >12,5% ou osmolaridade estimada >900 mOsm/L em acesso periférico. Não foi introduzido um limiar osmolar inferior numérico. O aplicativo informa osmolaridade estimada, glicose e Na/K finais; não confirma automaticamente tonicidade, compatibilidade ou segurança.

Não foram alterados o arredondamento de acetato, INTERGROWTH, fatores energéticos 4/9/4, doses, dados de composição de Numeta ou outros critérios clínicos. Peso ao nascer no D1–D7 e peso atual desde D8 permanecem. A versão e o cache foram atualizados para 0.7.6.

## Base e verificação

Base reconciliada: `0aa220450b4470417725077b21336a4025c288ac`, versão 0.7.5, na `main` antes desta atualização. As mudanças foram aplicadas sobre os arquivos exatos dessa base, preservando os demais arquivos do repositório.

- Regressão local combinada: 638 testes, incluindo 526 anteriores e 112 novos testes, sem falhas.
- Os testes cobrem nutrientes negativos isolados/conjuntos, zero/positivos, FM85, totais, mensagens, PDFs, limites de HV, conservação, peso, confirmação e revogação, downloads assíncronos, integração e coerência da versão/cache.
- Os PDFs reais foram gerados e renderizados, incluindo HV com confirmação e situações de nutrientes negativos nos relatórios Enteral e Fenton. O gráfico Fenton usado nos ensaios é uma fixture sintética, não uma avaliação do serviço externo.
- Auditoria independente de HV com água: 5.506 cenários e 87.439 comparações, zero divergências. Auditoria independente de energia/proteína: 7.872 cenários e 110.924 verificações, zero divergências. Varredura de 200 PDFs nutricionais com 2.600 verificações, zero falhas; todos os textos extraídos apresentam a versão 0.7.6 e os avisos correspondentes. Os resultados detalhados acompanham o pacote de verificação; não constituem validação clínica.
- A prévia local em navegador da nuvem foi recusada com `ERR_BLOCKED_BY_CLIENT`; testes DOM não substituem inspeção visual em navegador/dispositivo. A implantação e seus fluxos devem ser conferidos no endereço publicado.

A confirmação do prescritor registra revisão profissional individual. Ela não constitui validação automática físico-química pelo aplicativo. Detalhes e referências de água para injetáveis estão em [HV_WFI.md](HV_WFI.md).
