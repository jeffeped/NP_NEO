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

Browser acceptance was then completed on 29 September UTC (28 September in
Manaus), using a public preview of the exact PR commits `38ac1fb` and `f64a585`.
The local development server was not accessible to the remote browser, so the
public repository files were rendered through raw.githack.com for this check.
Only fictitious measurements were entered. The published application remains
hosted on GitHub Pages; it does not depend on this preview service.

- Opened the eighth tab and generated all three SVG charts, six result rows and
  a PDF from two male observations: 35+4 weeks, 2100 g, 45.2 cm, 31.5 cm;
  and 40+2 weeks, 3350 g, 50.5 cm, 35 cm.
- Downloaded the browser-generated PDF (46,322 bytes); its three pages, version
  0.7.0, measurements, scores, percentiles and source notes were checked.
- Editing a measurement hid both the result and the previous PDF link.
  Submitting 64+1 weeks displayed the explicit out-of-range error.
- Used the reusable [browser preview](../tests/browser-preview.html) at iframe
  widths 320, 390 and 720 px, with female fictitious data at 40+0 weeks:
  3000 g, 49 cm and 34.5 cm. All three charts rendered in every frame.
  Document scroll widths equalled client widths (305, 375 and 705 px,
  respectively, after scrollbar space). The chart containers alone scroll
  horizontally on narrow screens; keyboard scrolling was also verified.

The preview origin did not complete service-worker installation. The live-host
check below was therefore performed separately. These browser checks are
technical acceptance, not formal clinical validation.

### Production acceptance — 28 September 2026 (Manaus)

[PR #25](https://github.com/jeffeped/NP_NEO/pull/25) was merged after explicit
publication approval, producing commit `c81b097639ae8ada1ef7ef0850a69191480d9cd6`.
The [GitHub Pages deployment](https://github.com/jeffeped/NP_NEO/actions/runs/36512387209)
completed successfully. The application code in that commit matches the tested
PR tree.

On the [official application](https://jeffeped.github.io/NP_NEO/), a separate
empty browser tab was updated through the app's own update/restart button,
preserving the earlier open session. The visible version changed from 0.6.8
to **0.7.0** and the app displayed **Pronto para usar offline**, confirming its
precache completeness check passed on the production origin.

The eighth tab generated all three charts, Z scores and percentiles using the
female fictitious case at 40+0 weeks (3000 g, 49 cm, 34.5 cm). Its PDF generation
completed and the download link appeared. The observed scores were -0.31,
-0.18 and +0.27 respectively; percentiles 37.8, 42.7 and 60.5. A screenshot of
the live result and offline-ready indicator was retained with the project's
verification records. No patient identifiers or real patient data were used.

## One-page chart option — 0.7.1 (prepared 28 September 2026, Manaus)

The requested ambulatory output is a single sheet containing weight, length
and head circumference. The official resource page offers combined WLHC
charts for both sexes, in z scores and centiles. The four files inspected on
29 September 2026 UTC have **two pages**, with weight on the first page and
length/head circumference on the second. Examples:

- [Boys, combined z-score charts](https://intergrowth21.com/sites/default/files/2023-02/grow_preterm-zs-boys_2p_en.pdf)
- [Girls, combined z-score charts](https://intergrowth21.com/sites/default/files/2023-02/grow_preterm-zs-girls_2p_en.pdf)

GROW_NEO therefore provides its own A4 portrait composition, rather than a
modified Oxford figure. `exportIntergrowthSummaryPdf` uses the same daily
reference values and patient-point model as the screen/detailed report. It
changes page composition only; it does not change equations, age limits,
scores, percentiles or input validation.

- Three vertically aligned panels share the 27-64-week PMA range. Every panel
  retains its own vertical scale and explicit units (kg, cm, cm). All entered
  points remain represented, including those outside the usual reference
  curves. A missing indicator is explicitly identified.
- The summary table uses the **last entered evaluation**, with its PMA and
  the value, Z score and percentile of each indicator. An absent value stays
  absent; it is never silently replaced with an earlier observation.
- The complete observation tables remain available on screen and through
  **Relatório detalhado**. The new **Curvas em 1 página** export is a chart
  sheet with a latest-evaluation summary, not the complete numerical history.
- Both export buttons use the same revision/snapshot invalidation. Editing,
  clearing or recalculating prevents an older asynchronous PDF from appearing.
  Only one export runs at a time; selecting a format replaces the previous
  download link and labels the new file explicitly.
- No new network request, dependency, patient identifier or storage is added.
  The existing PDF module remains in the static cache, bumped to 0.7.1.

The change was prepared and verified before publication. Implementation,
preview checks and production acceptance are recorded separately below.

Local verification: **436 automated tests passed**. New checks cover one-page
A4 output, all patient points, reference paths, page/text bounds, missing
indicators and last-visit-only summaries, as well as format selection,
concurrent requests, failed exports and stale PDF invalidation. Existing
clinical calculations and detailed PDF regression tests remain passing.
Four synthetic one-page PDFs (three male visits, twenty female visits,
extreme inputs and missing latest measurements) were rendered and visually
inspected. A separate review of UI/PDF/offline behavior found no blocking
defect. Physical printing and formal clinical validation are not claimed.

Browser acceptance of [PR #26](https://github.com/jeffeped/NP_NEO/pull/26),
code commit `b6c26d98701bbb0de6aa6919e8537a1fa0616859`, used three fictitious male
evaluations: 35+4 weeks (2100 g, 45.2 cm, 31.5 cm), 40+2 (3350 g, 50.5 cm,
35 cm), and 48+0 (4700 g, 57 cm, 38.5 cm). Both format buttons completed
and provided appropriately named download links. The downloaded one-page
file was checked as A4, version 0.7.1, with the correct latest evaluation.
Changing a measurement hid the result and invalidated the prior PDF;
recalculating restored export. A screenshot records the two buttons and
one-page download link. The preview origin does not complete service-worker
installation; offline readiness in production must be checked after release.
The [GitHub test run](https://github.com/jeffeped/NP_NEO/actions/runs/36515150562)
for that code commit also passed.

### Production acceptance — 0.7.1, 28 September 2026 (Manaus)

After the user's explicit instruction to publish, PR #26 was merged from
verified head `585611c5c1f07b5d5f513dfa6b742392ff78da2f`, producing squash commit
`69583647ce8c37737a874e4904f3fe4a2503a65a`. Its
[GitHub Pages deployment](https://github.com/jeffeped/NP_NEO/actions/runs/36515592730)
completed successfully. The final PR
[test run](https://github.com/jeffeped/NP_NEO/actions/runs/36515323923) passed.

A separate empty session on the official application was updated using the
app's own update/restart button. The visible version became **0.7.1**, with
**Pronto para usar offline** displayed. This confirms the production precache
completeness check; no disconnected-network test is claimed here.

The female fictitious case at 40+0 weeks (3000 g, 49 cm, 34.5 cm) generated all
three on-screen charts. Both **Relatório detalhado** and **Curvas em 1 página**
completed, with the appropriate download link/name. Scores remained -0.31,
-0.18, +0.27 and percentiles 37.8, 42.7, 60.5. A screenshot of the two export
options, one-page download, version and offline-ready indicator was saved in
the project verification records. No real patient data were entered.

The separate Cloudflare check `Workers Builds: grow-neo-fenton-proxy` reports
failure on the PR head and also on the pre-existing main commit `c9750da`.
This is distinct from the successful GitHub Pages deployment and application
tests. PR #26 does not modify the Worker or Fenton configuration. The cause of
that pre-existing Cloudflare build failure was not investigated in this
release; it is recorded as a separate infrastructure follow-up.

## Navigation and observed weight velocity — 0.7.2

Prepared and published on 29 September 2026. This section records the
development change and the production acceptance below. Earlier release
records above remain historical records of 0.7.0 and 0.7.1.

### Navigation

The tab grid has two columns at all supported widths, including the narrow
mobile layout. Its visible arrangement is:

| Left column | Right column |
| --- | --- |
| NP ind | Enteral |
| NP padrão | GROW_Fenton |
| HV | INTERGROWTH |
| Resultados | Notas |

The old tab names Crescimento and Ambulatório become **GROW_Fenton** and
**INTERGROWTH**. Existing calculations retain their clinical meanings and
panel IDs. The tab buttons follow row order in the DOM, and keyboard navigation
reads that same order from `aria-controls`; there is no separate hard-coded
list that can drift from the visible buttons. Navigation instructions in the
enteral report and browser preview use the current tab names.

### Source review and interpretation boundary

The [official postnatal resources](https://intergrowth21.com/tools-resources/postnatal-growth-preterm-infants)
consulted for this change provide size-for-age weight, length and head
circumference tables, charts and a calculator. No separate postnatal weight
velocity centile table was located in the official resources consulted.
This is a bounded search finding, not proof that no other publication exists.
Fetal velocity standards are not substituted for postnatal preterm standards.

Two primary studies inform the methodological distinction:

1. Fenton TR, Anderson D, Groh-Wargo S, et al. An Attempt to Standardize the
   Calculation of Growth Velocity of Preterm Infants—Evaluation of Practical
   Bedside Methods. J Pediatr. 2018;196:77-83.
   [DOI](https://doi.org/10.1016/j.jpeds.2017.10.005),
   [PubMed](https://pubmed.ncbi.nlm.nih.gov/29246464/).
   This study evaluates growth-velocity calculations, including velocities
   derived from INTERGROWTH and other growth curves. A velocity derived from
   a size curve does not supply an individual child's velocity percentile or
   a separately validated ambulatory velocity standard.
2. Fenton TR, Griffin IJ, Hoyos A, et al. Accuracy of preterm infant weight gain
   velocity calculations vary depending on method used and infant age at time
   of measurement. Pediatr Res. 2019;85:650-654.
   [DOI](https://doi.org/10.1038/s41390-019-0313-z),
   [PubMed](https://pubmed.ncbi.nlm.nih.gov/30705399/).
   This methodological study supports Average2pt and excluding initial
   postnatal weight loss when assessing growth. Its neonatal findings are not
   represented here as validation of an ambulatory INTERGROWTH velocity norm.

Accordingly, this release reports **observed weight velocity**, calculated
from two entered measurements. It does not add an INTERGROWTH velocity
reference line, percentile, Z score, target, adequacy classification or rapid
growth threshold. The existing INTERGROWTH Z scores and percentiles still
refer to individual measurements at their exact PMA, not to their velocity.

### Calculation and interval selection

The clinician selects an initial and a later evaluation, both with a weight.
The data remain subject to the existing 27+0 through 64+0-week PMA range.
Let `W1` and `W2` be the selected weights in grams, and `PMA1` and `PMA2` their
exact ages in days:

- `intervalDays = PMA2 - PMA1`.
- `weightChange = W2 - W1`, in grams.
- `averageWeight = (W1 + W2) / 2`, the arithmetic mean of the two endpoint
  weights; it is not the mean of every intervening measurement.
- `gramsPerDay = weightChange / intervalDays`.
- `gramsPerKgDay = 1000 * weightChange / (averageWeight * intervalDays)`
  (Average2pt).

For the same infant, the PMA difference equals elapsed calendar days because
the gestational age at birth cancels. The implementation uses exact PMA days,
including the additional 0-6 days entered with completed weeks. It does not
subtract rounded weeks or use corrected age. It requires the final evaluation
to follow the initial evaluation, with valid weights at both endpoints.
Missing weights are not replaced with values from another visit. Zero and
negative observed weight change remain valid descriptive outputs.

The interval is a clinical selection. When assessing growth, exclude the
initial neonatal weight-loss phase. This tab has no birthweight or birth-age
field with which to establish the nadir, recovery of birthweight, or the
clinical growth phase automatically. The app therefore does not infer those
events from PMA alone. An interval that includes weight loss can describe
weight change but should not be interpreted automatically as tissue growth.

`intergrowth-velocity.js` performs the calculation locally and is included in
the static service-worker cache. Version and cache are bumped to **0.7.2**.
The module does not alter the published size equations, request a network
service, collect patient identifiers, or persist the selected measurements.

### Verification and release status

Local verification on 2026-09-29: **458/458 automated tests passed**. The new
tests cover hand-calculated velocity, exact-day intervals, missing weights,
reversed selections, zero/negative gain, PDF recalculation and stale-download
invalidation. An independent review passed 87 focused tests. Rendered PDFs
were inspected with typical values, 20 measurements, extremes and missing data;
the summary retains one A4 page and the detailed report retains three pages.
Browser acceptance on the same date used the exact code commit
`c3e21f323be40d14e6433b8c19d0621b6e1155a5` in a separate preview. The requested
tab pairs were confirmed at 320, 390 and 720 px, with no horizontal overflow
or clipped tab labels. In the 320 px frame, fictitious female measurements
at 40+0 (3000 g, 49 cm, 34.5 cm) and 41+3 (3300 g, 50 cm, 35 cm) produced
three charts and observed velocity of 30.0 g/day and 9.5 g/kg/day over exactly
10 days. Both PDF formats produced download links. Changing the selected
interval removed the previous velocity and PDF link while preserving all
three charts; recalculation restored the selected result.

Preview service-worker installation reported an update download failure on
the third-party preview origin. This is not a production offline acceptance
test. Automated cache tests passed, including the new module. Production
acceptance is recorded below; these technical checks are not clinical validation.

### Production acceptance — 29 September 2026 (Manaus)

After the user's explicit publication instruction, PR #27 was merged from
`5baa95a70124f62ad2ab8c31f3fb279597328d55`, producing squash commit
`2c3a6de053589339c125441835beb5f19f6753ec`. The GitHub Actions `test` job on
the reviewed PR head passed (run `36520510095`). GitHub Pages deployment
`36520719077` completed successfully for the merge commit.

At https://jeffeped.github.io/NP_NEO/ in a separate browser tab:

- The existing 0.7.1 installation updated through **Atualizar** and its restart
  confirmation; the footer then showed **0.7.2**.
- The requested two-column tab order and the labels **GROW_Fenton** and
  **INTERGROWTH** were present.
- The app displayed **Pronto para usar offline**, confirming its static-cache
  readiness check. This session did not simulate network disconnection.
- Fictitious female measurements at 40+0 (3000 g, 49 cm, 34.5 cm) and 41+3
  (3300 g, 50 cm, 35 cm) generated all three charts. The selected velocity
  interval was exactly 10 days: 300 g change, 3150 g mean weight,
  **30.0 g/day and 9.5 g/kg/day**.
- Both the single-page and detailed PDF exports completed and displayed their
  respective download links.

A production screenshot with these fictitious measurements was retained as
`GROW_NEO_0.7.2_publicado_dados_ficticios.jpg` in the project verification files.
No patient identifiers were entered. The source review, formulas and prior
PDF layout checks remain documented above.

The separate Cloudflare check `Workers Builds: grow-neo-fenton-proxy` failed
on the reviewed PR head, as it did in the previous release. Its specific
failure cause was not diagnosed in this release. No Worker files or Fenton
configuration were changed; this remains a separate infrastructure follow-up,
not a failed GitHub Pages deployment. Not all external checks were green.

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
