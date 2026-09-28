# Integração privada Fenton 2025 — implantada

O GROW_NEO é publicado pelo GitHub Pages e **não consegue guardar uma chave de API**.
Este Worker recebe apenas sexo, idade gestacional ao nascer e medidas seriadas
(idade pós-menstrual, peso, perímetro cefálico e comprimento); monta um CSV sem
identificador nem data de nascimento, acrescenta a credencial privada na chamada
à Fenton e devolve imagem JPG, PDF ou arquivo CSV de escores Z ao navegador.

## Implantação

1. Criar uma conta Cloudflare em nome do responsável pelo projeto e um Worker
   chamado `grow-neo-fenton-proxy`. No painel do Worker, adicionar o segredo
   `FENTON_API_KEY` com a chave recebida **diretamente do e-mail original**.
   Não colar a chave no GitHub, no chat, em scripts, em URLs ou em arquivos do projeto.
2. Conectar o repositório `jeffeped/NP_NEO` em Workers Builds, selecionar a branch
   `main` e definir `/workers/fenton-proxy/` como diretório
   raiz. O comando de implantação é `npx wrangler deploy`. O arquivo `wrangler.jsonc`
   declara que o segredo é obrigatório e configura o limite inicial de 30
   consultas por minuto por IP. Cada novo commit na branch aciona o build.
3. Testar o Worker com **dados fictícios** nas três rotas (`/chart`,
   `/chart-pdf`, `/zscores`), conferir o preflight CORS e inspecionar os arquivos
   retornados. Repetir a prova quando houver mudança do contrato da API.
4. Manter apenas o endereço público HTTPS do Worker em `fenton-config.js`,
   executar `npm test` e publicar o app. O formulário da aba Crescimento aparece
   quando esse endereço está configurado. O link ao plotador oficial permanece.


> Estado em 28/09/2026: Worker implantado; GROW NEO 0.6.7 publicado após
> mesclagem da PR #22. Teste com medidas fictícias confirmou CSV de escores Z,
> JPG (2550 × 3300), PDF (2 páginas) e preflight CORS. O gráfico JPG foi
> inspecionado visualmente. O teste clínico comparativo e a checagem ponta a
> ponta em um Edge local ainda estão pendentes. Em Workers Builds, conferir a
> troca da branch de produção `feature/fenton-secure-proxy` para `main`.

## Segurança e limites

- O Worker recusa requisições de outras origens, conteúdos inesperados e campos
  extras como nomes e datas. A política de origem é uma barreira para páginas
  de outros sites, **não uma autenticação** de quem executa a requisição.
- O limite por IP é apenas uma medida inicial contra abuso. Redes hospitalares
  podem compartilhar um único IP; para uso público amplo, avaliar cotas,
  supervisão operacional e acesso por usuário antes de ampliar a capacidade.
- Não registrar em logs a chave, os valores das medidas ou os URLs dos arquivos
  gerados. O Worker não persiste os dados, mas é preciso confirmar com a equipe
  Fenton as condições de uso, a retenção e o acesso aos arquivos no servidor dela.
- Se o Worker não estiver configurado, o GROW_NEO mantém apenas o link externo.
  Nenhum dado é enviado por esta integração sem ação explícita do usuário.

Documentação técnica: [segredos dos Workers](https://developers.cloudflare.com/workers/configuration/secrets/),
[limites de requisição](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
e [manual Fenton 2025](https://fentongrowth.ca/docs/Fenton2025PlotterUsersManual.pdf).

Fluxo, contrato de dados, resultados dos testes e perguntas para a equipe da
Dra. Fenton: [registro técnico da integração](../../docs/FENTON_INTEGRATION.md).
