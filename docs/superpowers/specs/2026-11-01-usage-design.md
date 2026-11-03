# Medição de uso do GROW_NEO

Objetivo autorizado: acompanhar uso diário, acessos e funções utilizadas, sem enviar dados clínicos.

## Abordagens e decisão de implementação
- Analytics externo pronto: exige nova conta/serviço e pode coletar mais metadados que o necessário.
- Reutilizar o Worker Fenton: reduz infraestrutura, mas acopla estatísticas à integração clínica.
- Worker Cloudflare separado com D1: escolhido pelo implementador; aproveita o provedor existente e mantém falhas isoladas.

## Contrato
Um módulo independente observa apenas IDs fixos de formulários/botões. Registra abertura do app e solicitação de cálculo, gráfico, simulação ou relatório. Não lê inputs, texto clínico, resultados, URL da página ou informações do dispositivo. Solicitação não significa cálculo concluído nem atendimento clínico.

Cada navegador recebe identificador aleatório renovado a cada dia civil em America/Manaus. Usuários ativos/dia = identificadores distintos com pelo menos uma ação; visitantes/dia inclui apenas abertura. Aberturas = carregamentos, não sessões nem pessoas identificadas. Vários dispositivos podem representar uma pessoa; dispositivos compartilhados podem representar várias.

Fila local de até 200 eventos, preservados por até 7 dias para envio quando voltar a conexão. Retries usam mesmo ID e são deduplicados no servidor. Preferência de desativação, DNT e GPC são respeitados; desativar apaga fila/identificador. Sem armazenamento local disponível, não medir (evitar contagens duplicadas). Falhas nunca interrompem o app.

Servidor aceita esquema fechado, apenas ações/funções previstas, sem campos extras. Guarda IDs diários somente após hash, não grava IP/user agent/referer. Provedor de hospedagem ainda processa metadados de rede; não prometer anonimato absoluto. Limite por IP usado somente transitoriamente para abuso; origem CORS não autentica clientes e métricas podem ser artificialmente infladas.

Retenção de eventos por 90 dias, limpeza diária. Relatório retorna somente agregados dos últimos 30 dias por padrão, incluindo dias sem registros. Sem registros não comprova ausência de uso (offline, opt-out, bloqueadores, versões antigas, limites e fila cheia).

Painel protegido por segredo Bearer de pelo menos 32 caracteres, informado no formulário e mantido apenas em memória; nunca em query string, GitHub ou armazenamento do navegador. Página do painel é pública, dados não. HTTPS, respostas sem cache e CSP restrita.

## Implantação e limite da sessão
GitHub Pages permanece como está. Worker, D1, segredo privado e endpoint real precisam ser configurados na conta Cloudflare do responsável. Não há conector Cloudflare disponível nesta sessão. Entregar implementação testada e PR; configuração do cliente fica desativada até endpoint verificado. Não inventar URL de produção nem afirmar coleta ativa antes da prova ponta a ponta.
