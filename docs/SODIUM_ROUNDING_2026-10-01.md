# Sodium rounding correction — local draft, not published

Reported case: current weight 920 g, birth weight 990 g, requested total sodium 2 mEq/kg/day and phosphate 1 mmol/kg/day as sodium glycerophosphate. The published 0.7.4 engine uses the current weight. Phosphate volume rounds from 0.92 to 0.9 mL, providing 1.8 mEq/day of sodium (1.9565217 mEq/kg/day). The remaining 0.04 mEq/day implies 0.0235294 mL NaCl 10%, rounding to zero and previously blocking export.

The local change discloses this omitted complement through result notices (also consumed by the existing PDF generator). Export in the interface still requires acceptance of the actual total sodium. No delivered volumes or doses were increased. A help text explains that the sodium input means total sodium, including phosphate contribution.

The exception applies only when unrounded glycerophosphate already covers the sodium target, rounded phosphate supplies positive sodium, and its resulting complement rounds to zero. Genuine tiny sodium supplements, absent phosphate contributions, tiny phosphate doses, measurable complements, and other clinical blocks keep their existing behavior. This is a rounding workflow change, not a determination that a dose is clinically appropriate.

Validation: 153 engine/alerts/PDF tests and 3 targeted interface tests passed. Tests cover the reported case, distinct current and birth weights, acceptance and its reset after edits, genuine tiny doses, measurable residuals, and independent blocks. No clinical validation or live deployment was performed.

This correction is now included in the prepared 0.7.5 release together with the institutional dosing-weight protocol and PDF issuance dates. The source was reconciled with remote 0.7.4 before implementing the release. See RELEASE_0.7.5.md for the current handoff and publication status.
