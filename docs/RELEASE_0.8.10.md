# GROW_NEO 0.8.10 — estatísticas de uso preparadas

01/11/2026. Coleta desativada; implantação Cloudflare pendente.

Adiciona módulo independente para aberturas e ações por função, fila offline com retries deduplicados, identificador diário e opção de desativação. O servidor separado usa D1 e painel protegido por chave privada, com consultas diárias e exportação CSV. Não altera regras clínicas ou cálculos.

Validação local: 835 testes passaram, sem falhas (817 preexistentes e 18 novos). Inclui testes do Worker com SQLite real, fila/retry/datas, múltiplas abas, rejeição de campos clínicos e execução do JavaScript do painel em DOM simulado. Verificações de sintaxe e diff sem erros. Sem teste em navegador real ou produção Cloudflare.

Revisão independente: corrigidos persistência/opt-out entre abas e registro de simulação INTERGROWTH. Nenhum bloqueador crítico/importante remanescente; limitação de primeira identificação simultânea em navegadores sem Web Locks documentada.

Para ativar, executar o [guia de implantação](USAGE_METRICS.md), registrar o endereço real do Worker, liberar apenas essa origem na CSP e renovar a revisão do cache. A data de início da coleta será a data de ativação verificada. Não apresentar contagens de teste como usuários reais.
