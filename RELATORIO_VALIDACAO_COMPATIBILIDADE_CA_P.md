# Validação do alerta de compatibilidade cálcio e fósforo

**Versão:** 0.5.3  
**Data:** 22/09/2026  
**Responsável clínico:** Jefferson P Guilherme

## Escopo

Validação do aviso de composição mineral da nutrição parenteral individualizada. O aviso é independente da relação molar Ca:P usada para avaliação nutricional e não classifica a solução como incompatível.

## Referência

Wang HJ et al. Use of Sodium Glycerophosphate in Neonatal Parenteral Nutrition Solutions to Increase Calcium and Phosphate Compatibility for Preterm Infants. *Pediatrics & Neonatology*. 2020;61:339-345. DOI 10.1016/j.pedneo.2020.02.004. PMID 32199865.

O estudo avaliou gluconato de cálcio a 50 mEq/L e glicerofosfato de sódio a 25 mmol/L em formulações neonatais com aminoácidos finais de 1% ou 4% e glicose final de 10% ou 20%. Esses valores representam uma composição diretamente estudada, não um limite universal de solubilidade.

## Cálculos

- Cálcio final (mEq/L) = cálcio efetivamente preparado (mEq) × 1000 ÷ volume final da bolsa (mL).
- Fósforo final (mmol/L) = fósforo efetivamente preparado (mmol) × 1000 ÷ volume final da bolsa (mL).
- Os cálculos usam os volumes de preparo arredondados pelo aplicativo e o volume final real da bolsa.

## Regra validada

- Gluconato de cálcio + glicerofosfato de sódio: orientar confirmação farmacêutica se Ca >50 mEq/L ou P >25 mmol/L.
- Igualdade em Ca =50 mEq/L e P =25 mmol/L não gera o aviso.
- Fosfato inorgânico associado ao cálcio: orientar conferência em curva específica da formulação, sem aplicar os cortes acima como garantia de compatibilidade.
- Sem associação simultânea de cálcio e fósforo, o aviso de precipitação Ca-P não é gerado.
- O aviso é informativo, não bloqueia cálculo nem exportação.

## Casos automatizados

| Caso | Resultado esperado e obtido |
| --- | --- |
| Ca 50 mEq/L e P 25 mmol/L | Sem alerta de extrapolação |
| Ca >50 mEq/L e P 25 mmol/L | Alerta pelo cálcio |
| Ca 50 mEq/L e P >25 mmol/L | Alerta pelo fósforo |
| Ca >50 mEq/L e P >25 mmol/L | Um único alerta combinado |
| Valor interno imediatamente acima do corte | Alerta preservado; exibição arredondada para cima |
| Fosfato inorgânico com cálcio | Solicitação de curva específica |
| Cálcio ou fósforo ausente | Sem alerta de associação Ca-P |

## Resultado

Suíte completa executada com `npm test`: 331 testes aprovados e nenhum teste reprovado. A regressão das funções anteriores permaneceu íntegra.

