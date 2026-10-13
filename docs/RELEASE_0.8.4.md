# GROW_NEO 0.8.4 — avaliação, sem congelamento

Correção do leitor da tabela oficial Fenton: o serviço usa `~` para medidas não informadas. O app agora reconhece esse marcador apenas nas métricas ausentes na solicitação. Valores inesperados e divergências de sexo, idade, peso e escores continuam rejeitados. Isso permite consultar apenas pesagens e obter escores das projeções.

Responsável pelas definições: Jefferson Guilherme. Mantém o alerta >2 Z desde o nascimento e a simulação em 14/28 dias com a VC das duas últimas pesagens, conforme versão 0.8.3. A simulação é condicional e o alerta não estabelece diagnóstico automático.

Verificações locais: regressão reproduzida antes da correção; novos testes de ausência e rejeição de marcador em dados obrigatórios; suíte completa de testes. Consulta pública real e publicação documentadas no registro local de entrega.
