# GROW_NEO 0.7.9 — tabela Fenton no PDF integrado

Quando o CSV de escores falha ou não é reconhecido, o app consulta o PDF oficial com as mesmas medidas e extrai sua tabela da segunda página. A página 1 do relatório integrado recebe medidas, escores Z e percentis; a página 2 mantém o gráfico completo.

O parser confere sexo, IG ao nascer, idades e valores de todas as medidas. A coluna dZ não substitui Z. Edições invalidam resultados e downloads. O leitor PDF.js 5.6.205 é hospedado junto ao app, com licença Apache-2.0, sem CDN. Nenhuma fórmula nutricional, chave ou proxy mudou.

O formato foi conferido em um PDF oficial fornecido pelo usuário (API_build 2.1.3.0). O arquivo e suas medidas não integram o repositório. O teste de navegador usa dados, escores e gráfico fictícios, com o mesmo formato de tabela, e simula falha 502 no CSV. Verifica duas páginas, valores, exportação offline, invalidação e larguras de tela. Resultados completos ficam nos artefatos do GitHub Actions. Esses testes não equivalem à validação clínica ou à confirmação de acesso real ao serviço Fenton.

Verificação em 02/10/2026: 682 testes aprovados, zero falhas. Navegador Chromium: recuperação da tabela após CSV 502, valores Z/percentis e idade fracionária, perda ponderal de 7,9% no exemplo fictício, PDF de exatamente duas páginas, exportação offline, invalidação após edição, larguras 320/390/768, cache do leitor e ausência de persistência de casos. As duas páginas foram renderizadas e inspecionadas, sem cortes nem sobreposições.

Evidência inicial: https://github.com/jeffeped/NP_NEO/actions/runs/37035002445. A conferência do commit final deve constar dos checks da PR. O fluxo de verificação compara o leitor empacotado com a distribuição npm fixada e usa apenas permissão de leitura do repositório.
