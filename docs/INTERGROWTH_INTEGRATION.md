# INTERGROWTH 21st postnatal growth in GROW NEO

This record describes the scientific basis and verification inputs for the
ambulatory follow-up tab. The calculation uses the INTERGROWTH-21st **Postnatal
Growth Standards for Preterm Infants** published by Villar and colleagues in
2015. It evaluates weight, recumbent length and head circumference by sex and
exact postmenstrual age (PMA). It does not use the separate INTERGROWTH newborn
size-at-birth or fetal growth standards.

## Primary sources and provenance

1. Villar J, Giuliani F, Bhutta ZA, et al. Postnatal growth standards for preterm
   infants: the Preterm Postnatal Follow-up Study of the INTERGROWTH-21st Project.
   Lancet Glob Health. 2015;3:e681-e691.
   [DOI](https://doi.org/10.1016/S2214-109X(15)00163-1),
   [PubMed](https://pubmed.ncbi.nlm.nih.gov/26475015/),
   [original article hosted by the project](https://media.tghn.org/articles/PPFS_LancetGlobHealth.PUBLISHED.pdf).
2. [Publisher supplementary appendix](https://ars.els-cdn.com/content/image/1-s2.0-S2214109X15001631-mmc1.pdf),
   Appendix 8, printed pages 10-11 (PDF pages 11-12). These pages provide the
   regression coefficients, transformations and worked examples. The downloaded
   original was visually checked. SHA-256:
   `1654e2372a8242e425e24bffed02032802f9f3591985e34d37945f12e6c6a2b7`.
3. [Official postnatal resources](https://intergrowth21.com/tools-resources/postnatal-growth-preterm-infants):
   sex-specific numerical z-score and centile tables, charts, software and
   manuals. [Current scope description](https://intergrowth21.com/intergrowth-21st-applications-calculators)
   specifies birth at 27+0 to 36+6 weeks and follow-up through 64 weeks PMA.
4. [Oxford online calculator](https://intergrowth21.ndog.ox.ac.uk/preterm/pt/ManualEntry)
   and [official user guide](https://intergrowth21.com/sites/default/files/2023-02/preterm_app_-_instructions_faq_2017_04_13.pdf).
   The guide defines the supported observation range as 189-448 days PMA,
   equivalent to 27+0 through 64+0 weeks, and specifies kg and cm.

Sources and fixture PDFs were retrieved on 29 September 2026 (UTC). The local
calculation is an independent implementation of the published mathematical
equations. It does not digitise a plotted line or interpolate the rounded PDF
tables to obtain z scores.

## Population and interpretation limits

The source cohort included 201 singleton preterm infants from eight countries,
selected from low-risk pregnancies, without severe postnatal morbidity,
congenital malformations or evidence of fetal growth restriction. The protocol
considered births from 26 to less than 37 weeks, but the observed very preterm
subgroup contained only 12 infants born at 27-32 weeks. Most participants were
born at 34 weeks or later. The authors therefore emphasised greater robustness
for infants born at 33-36 weeks and growth assessment after 32 weeks PMA.

These are prescriptive standards from a selected cohort. A plotted position
does not diagnose malnutrition or prescribe a nutritional intervention. Use in
infants born earlier than the population represented, or with major morbidity,
requires explicit clinical judgment. The existence of an equation at a given
PMA does not by itself establish its validation in every birth-age subgroup.
The tab accepts directly entered PMA; it does not independently confirm the
infant's gestational age at birth or the absence of major morbidity.

## Age and units

- PMA in days = gestational age at birth in days + elapsed postnatal days.
- PMA in exact weeks = PMA in days / 7, or entered weeks + entered days / 7.
- The mathematical domain is inclusive: **27+0 to 64+0 weeks**. In particular,
  64+1 is outside the domain; do not round an out-of-range age back to 64.
- Weight enters the published model in **kg**. A user entry in grams must be
  divided by 1000 before evaluating the model.
- Recumbent length and head circumference enter in **cm**.
- Corrected age and PMA are different quantities. Corrected age, if shown for
  context, is PMA minus 40 weeks; it is not the age used by these equations.

The interface's broad input checks (100-20,000 g, 15-90 cm length and 10-60 cm
head circumference) are application checks for entry or unit errors. They are
not published INTERGROWTH reference intervals or clinical treatment thresholds.

Do not extrapolate or extend the curve past its limits. This feature does not
automatically switch to WHO standards after 64 weeks. A future WHO feature needs
its own documented age-selection policy. The original study recommends WHO
after 64 weeks PMA; the 2026
[GIGS guidance](https://doi.org/10.1111/1471-0528.70159) and its
[software documentation](https://docs.ropensci.org/gigs/reference/gigs_zscoring.html)
explicitly use uncorrected WHO ages thereafter. This record does not resolve or
silently change local clinical practice on age correction.

## Published equations

Let `x` be exact PMA in weeks and `s` be 1 for boys and 0 for girls. All logarithms
are natural logarithms. For weight and length, `mu` and `sigma` are on the natural
logarithmic measurement scale. For head circumference they are on the cm scale.

| Measurement | mu | sigma |
| --- | --- | --- |
| Weight in kg | `2.591277 - 0.01155*sqrt(x) - 2201.705/x^2 + 0.0911639*s` | `0.1470258 + 505.92394/x^2 - 140.0576*ln(x)/x^2` |
| Length in cm | `4.136244 - 547.0018/x^2 + 0.0026066*x + 0.0314961*s` | `0.050489 + 310.44761/x^2 - 90.0742*ln(x)/x^2` |
| Head circumference in cm | `55.53617 - 852.0059/x + 0.7957903*s` | `3.0582292 + 3910.05/x^2 - 180.5625/x` |

For a measurement `y`, compute:

- Weight or length: `z = (ln(y) - mu) / sigma`.
- Head circumference: `z = (y - mu) / sigma`.
- Percentile: `100 * Phi(z)`, using the standard normal cumulative distribution.

To draw a reference curve at a chosen z score:

- Weight or length: `y = exp(mu + z*sigma)`.
- Head circumference: `y = mu + z*sigma`.

Do not exponentiate head circumference. Do not use a constant raw-scale SD for
weight or length. Do not replace exact weeks with completed integer weeks.

The appendix's worked examples at 34 weeks provide an independent check:

| Output | Boys | Girls |
| --- | ---: | ---: |
| Weight at z = 0 | 2.04 kg | 1.86 kg |
| Weight at z = -1.88 | 1.51 kg | 1.38 kg |
| Head circumference at z = 0 | 31.27 cm | 30.48 cm |
| Head circumference at z = -1.88 | 29.15 cm | 28.35 cm |

The appendix uses `-1.88` as an approximate normal deviate for the third centile.
That approximation is relevant when reproducing its worked examples. It is not
an instruction to round all z scores or normal quantiles to two decimals.

## Independent numerical verification

[`tests/fixtures/intergrowth-official.json`](../tests/fixtures/intergrowth-official.json)
contains values extracted from the six official numerical z-score PDFs, with
their exact URLs, SHA-256 hashes, units and printed precision. It covers both
sexes, all three measurements, 27, 34, 40, 50 and 64 weeks PMA, and z scores
`-3, -2, -1, 0, 1, 2, 3`: 210 published reference values. Expected values are
extracted from the published tables, not generated by GROW NEO's implementation.
The source PDFs were also checked visually for sex, units, z-score column order
and every selected age row.

The PDF cells are rounded to 0.01 kg for weight and 0.1 cm for length and head
circumference. Compare predicted measurements against those cells with an
appropriate rounding allowance, rather than expecting an exactly integer z
score from a rounded measurement. Continuous-day ages, grams-to-kg conversion,
invalid measurements, both domain boundaries and result invalidation after
input changes need separate implementation checks.

Published-table agreement verifies numerical implementation. It is not formal
clinical validation across growth trajectories, diagnoses or patient groups.
Browser rendering, downloads and offline operation are separate acceptance
checks and must be recorded when actually completed.

## Application integration and verification record (29 September 2026)

- `intergrowth.js` evaluates the published equations and validates the entered
  series. It has no network or storage operations. No API key or proxy is used.
- `intergrowth-ui.js` owns the eighth tab, independent of the nutrition and
  Fenton forms. It accepts up to 20 observations, requires increasing PMA and
  clears earlier results and PDF URLs whenever an input changes. Returning from
  the browser's back-forward cache resets this form.
- `intergrowth-charts.js` draws original SVG curves at each day from 189 to 448,
  at z scores -3 through +3, plus numbered observations. Weight remains in grams
  in inputs and tables; the graph axis explicitly uses kg. Missing indicators
  are omitted from the on-screen series, and values outside the displayed
  reference curves expand the vertical axis rather than being clipped.
- `intergrowth-pdf.js` generates a separate three-page vector report with the
  same geometry, one indicator per page, numbered observations, Z/percentile
  tables and the source/limitations. No patient identifiers are collected.
- The version and service worker cache are `0.7.0`. All four modules are added
  to the static offline cache. The existing CSP and Fenton connection allowlist
  are preserved.

Verification completed locally: 429 automated tests pass, including all existing
regressions, the 210 official table cells, the original appendix examples,
continuous-day ages, invalid and out-of-domain input, normal probabilities,
unit conversion, serial plotting, UI result/PDF invalidation and local PDF
generation. A service-worker simulation confirms that all four new modules are
cached and served without a network request after installation.

Vector PDFs generated from synthetic series of 3 and 20 observations were
rendered and visually inspected for labels, table layout and page boundaries.
Live browser acceptance was not completed: the available remote browser could
not open the local development server. This is a limitation of this verification
session, not evidence of a failure in the deployed application. The feature is
prepared for pull-request review; it has not been deployed to the live app as
part of this work.

## Attribution and distribution

The source article states CC BY-NC-ND. Oxford's website permits clinicians to
download and use its charts freely and asks users to contact the project about
resource modifications. These statements do not establish a blanket permission
to distribute modified Oxford figures, logos or proprietary application code.
This feature uses independently written calculations and its own plots, with
scientific attribution; it does not bundle the Oxford PDFs or represent itself
as an Oxford-endorsed application.

The separate [GIGS R package](https://github.com/ropensci/gigs), authored by
Parker, Vesel and Ohuma, is GPL version 3 or later and provides a useful
cross-check. Its code was not copied into this implementation. The primary
equation source is Appendix 8 of the original paper. Preserve this provenance
and review applicable permissions before reproducing branded charts or changing
the intended distribution of the app.
