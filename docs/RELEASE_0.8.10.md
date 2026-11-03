# GROW_NEO 0.8.10 — estatísticas de uso preparadas

01/11/2026. Coleta desativada; implantação Cloudflare pendente.

Adiciona módulo independente para aberturas e ações por função, fila offline com retries deduplicados, identificador diário e opção de desativação. O servidor separado usa D1 e painel protegido por chave privada, com consultas diárias e exportação CSV. Não altera regras clínicas ou cálculos.

Validação local: 835 testes passaram, sem falhas (817 preexistentes e 18 novos). Inclui testes do Worker com SQLite real, fila/retry/datas, múltiplas abas, rejeição de campos clínicos e execução do JavaScript do painel em DOM simulado. Verificações de sintaxe e diff sem erros. Sem teste em navegador real ou produção Cloudflare.

Revisão independente: corrigidos persistência/opt-out entre abas e registro de simulação INTERGROWTH. Nenhum bloqueador crítico/importante remanescente; limitação de primeira identificação simultânea em navegadores sem Web Locks documentada.

Para ativar, executar o [guia de implantação](USAGE_METRICS.md), registrar o endereço real do Worker, liberar apenas essa origem na CSP e renovar a revisão do cache. A data de início da coleta será a data de ativação verificada. Não apresentar contagens de teste como usuários reais.

## Ativação em 02/11/2026

Worker publicado e verificado em https://grow-neo-usage.jeffeped.workers.dev, versão c2e6fbbe-174d-4857-b92f-fdb9bc9f3165. D1 configurado e segredo privado instalado. Endpoint público incluído no app, origem exata acrescentada à CSP preservando Fenton, revisão do cache 0.8.10-usage1. Publicação da ativação autorizada pelo usuário.

Serviço real: health, autenticação, rejeição de campos extras/origem, ingestão e deduplicação aprovados. Painel publicado executado em DOM simulado com consulta real: CSV e logout aprovados. Seis eventos sintéticos em 02/11/2026 representam dois visitantes fictícios, duas aberturas e quatro ações (HV/Enteral); não interpretar como uso real. A integração/configuração Fenton não foi alterada.
