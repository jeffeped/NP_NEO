# Estatísticas de uso — implantação e interpretação

Estado desta entrega: implementação preparada; **coleta desativada** em `usage-config.js` até configurar e testar o serviço. Não existe histórico recuperado. Não interpretar testes locais como uso real.

## O que será medido

| Métrica | Definição |
|---|---|
| Visitantes/dia | Navegadores com abertura ou ação registrada |
| Ativos/dia | Navegadores com solicitação de cálculo, gráfico, simulação ou relatório |
| Aberturas | Carregamentos do app, inclusive recargas |
| Ações por função | Solicitações em NP individualizada, NP padrão, HV, Enteral, GROW_Fenton e INTERGROWTH |

As ações incluem tentativas que podem terminar com erro de validação ou falha de serviço. Não demonstram cálculo concluído, uso assistencial, número de profissionais ou número de pacientes. O identificador muda diariamente e não permite medir retenção por usuário. Em navegadores sem Web Locks, duas abas abertas exatamente ao mesmo tempo na primeira medição do dia podem gerar identificadores distintos e supercontar visitantes. Um aparelho compartilhado pode subcontar pessoas; vários aparelhos da mesma pessoa podem supercontar. Não somar ativos diários para obter pessoas únicas do período.

Dia civil: America/Manaus (UTC−4). Dados por 90 dias. Dias sem registros aparecem como zero; isso também pode ocorrer por versões antigas, opt-out, bloqueadores, falhas, filas cheias ou offline por mais de 7 dias. A fila guarda até 200 eventos por navegador e o envio ocorre em lotes de 25. A atualização do painel deve ser solicitada novamente para receber eventos tardios.

## Privacidade e segurança

- Coleta independente dos módulos clínicos. Observa somente IDs fixos de botões/formulários e não lê seus valores.
- Evento: UUID aleatório, data civil, UUID de navegador daquele dia, tipo e função enumerados. O servidor recusa campos extras, inclusive informações clínicas.
- Identificador do navegador é gravado no D1 apenas após SHA-256 com a data. IP, user agent e referrer não são persistidos pelo código. A infraestrutura Cloudflare processa metadados de conexão; não se promete anonimato absoluto.
- Fila e preferência ficam no armazenamento local. Ao desativar, fila/identificador são apagados. DNT e GPC são respeitados. Se o armazenamento estiver indisponível, a medição é desativada.
- Segredo `DASHBOARD_TOKEN`: pelo menos 32 caracteres aleatórios, até 256. Gerar/guardar em gerenciador de senhas e inserir diretamente no segredo Cloudflare. Nunca colar no chat, no GitHub, em URL ou em comandos com o valor literal.
- O HTML do painel pode ser aberto publicamente; os dados exigem Bearer token. O formulário guarda o token apenas na memória da página. Respostas não usam cache. Sair apaga o token da memória da aplicação.
- CORS e limite de 120 requisições/minuto/IP reduzem abuso; não autenticam visitantes. Métricas são aproximadas e podem sofrer inflação artificial. IP compartilhado por hospital pode sofrer limitação. Não usar como registro auditável de atendimento.
- A rotina diária exclui eventos fora da janela de 90 dias. Cópias de segurança/Time Travel do provedor podem ter política adicional de retenção: conferir na conta. Logs de observabilidade estão desativados na configuração; não habilitar captura de corpo nem de Authorization.

## Configuração Cloudflare

Usar Worker novo `grow-neo-usage`, separado de `grow-neo-fenton-proxy`. Não alterar a chave ou rotas Fenton.

Na pasta `workers/usage`, com Wrangler atual autenticado na conta do responsável:

1. Criar o D1 e registrar o ID real retornado em `wrangler.jsonc` (não existe ID fictício no projeto):

   ```sh
   npx wrangler d1 create grow-neo-usage --binding USAGE_DB --update-config
   ```

   Conferir que há **uma única** entrada D1, binding `USAGE_DB`, `database_name` correto e `database_id` igual ao retornado. Se o recurso já existir, reutilizar o ID real em vez de criar outro.

2. Inicializar a tabela:

   ```sh
   npx wrangler d1 execute grow-neo-usage --remote --file schema.sql
   ```

3. Inserir a chave privada no prompt seguro (sem valor em argumentos):

   ```sh
   npx wrangler secret put DASHBOARD_TOKEN
   ```

4. Publicar:

   ```sh
   npx wrangler deploy
   ```

5. Anotar a URL HTTPS **retornada pela Cloudflare**. `/health` deve responder `{"ready":true}`; a página inicial deve abrir o painel. Chave incorreta deve negar consulta; chave correta deve mostrar dias sem registros. O cron `15 4 * * *` executa às 00:15 de Manaus.

Opcionalmente conectar Workers Builds ao repositório, branch escolhida e diretório `/workers/usage/`. Só fazer depois que D1 e segredo estiverem prontos; conferir se o deploy preserva os bindings. O arquivo de configuração com o ID real pode ser versionado; o segredo jamais.

Referências oficiais consultadas em 01/11/2026: [comandos D1](https://developers.cloudflare.com/d1/wrangler-commands/), [bindings e batch](https://developers.cloudflare.com/d1/worker-api/d1-database/), [configuração Wrangler](https://developers.cloudflare.com/workers/wrangler/configuration/), [limite de requisições](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

## Ativar no aplicativo, somente depois da prova do serviço

1. Em `usage-config.js`, definir `USAGE_ENDPOINT` como a origem HTTPS real, sem caminho, query, credencial ou fragmento. Não inventar subdomínio.
2. Em `index.html`, acrescentar **somente essa origem real** à diretiva `connect-src` existente. Preservar a origem Fenton e todas as demais restrições da CSP.
3. Incrementar a revisão do cache `sw.js` para invalidar cópias instaladas da configuração vazia; manter versão/cache/teste de release coerentes.
4. Executar `npm ci --ignore-scripts` e `npm test` (testes do banco usam Python 3/SQLite, disponível no runner Ubuntu).
5. Publicar a alteração aprovada no GitHub Pages e clicar Atualizar no aplicativo. Conferir rede: `/events` deve ter status 204 e apenas os campos documentados, sem dados dos formulários.
6. Usar um navegador de teste: abrir o app e solicitar um cálculo fictício. No painel, conferir abertura, ativo e função correspondentes. Reenviar o mesmo ID deve manter contagens. Desativar estatísticas e conferir ausência de novos envios. Testar offline e retomada de conexão.
7. Registrar data da ativação e testes sintéticos no relatório de implantação. Os testes ponta a ponta entram na contagem; anotar isso para interpretação.

Não foi executada ativação em produção nesta sessão: depende do acesso à conta Cloudflare, do D1 e do segredo. A branch/PR pode ser revisada antes; não existe razão para modificar a integração clínica enquanto isso.

## Consulta

Abrir a URL do Worker, inserir a chave privada no formulário, escolher 7/30/90 dias e, se desejar, baixar CSV. O painel mostra ativos de hoje, média dos ativos/dia e aberturas totais, além das tabelas diárias e por função. Não requer alterar o código para cada consulta.
