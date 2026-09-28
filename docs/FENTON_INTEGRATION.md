# Fenton 2025 integration in GROW NEO

Technical record for Dr. Tanis Fenton and colleagues, 28 September 2026. The
integration is in GROW NEO 0.6.7, merged through [PR #22](https://github.com/jeffeped/NP_NEO/pull/22)
as commit `bc2d84b3da3c15640a33643185e9dd2973783d3a`. This description is
based on the example HTML and JavaScript supplied by the Fenton team on
27 September 2026 and on our live tests with fabricated measurements. It does
not contain the private API key.

## Architecture and intent

GROW NEO is a static GitHub Pages app. Its Growth tab collects sex, gestational
age at birth, and serial postmenstrual ages and anthropometric measurements.
The clinician explicitly requests a JPG chart, PDF chart, or Z-score CSV.
`fenton-ui.js` converts the form into a JSON request and sends it over HTTPS to
`https://grow-neo-fenton-proxy.jeffeped.workers.dev`. `fenton-config.js` holds
only that public endpoint. The Cloudflare Worker in
`workers/fenton-proxy/src/index.js` validates the request, converts it to the
Fenton CSV format, and calls the Fenton API with `X-API-Key`. The key is stored
as the Cloudflare secret `FENTON_API_KEY`; it is absent from browser assets and
the repository. The Worker returns the requested file to the browser. A link to
the official Fenton plotter remains available in the Growth tab.

No name, patient number, date of birth, measurement calendar date, or free-text
field is in the JSON contract. The integration does not automatically transmit
data while the clinician is entering values.

## Input contract and CSV conversion

The request has exactly `sex`, `birthGaWeeks`, `birthGaDays`, and `measurements`.
Each measurement has `weeks`, `days`, and at least one of `weightGrams`, `headCm`,
or `lengthCm`. The ages in `measurements` are **postmenstrual ages**, not elapsed
ages since birth. The Worker requires sex `F` or `M`, birth GA 22–42 weeks,
observation ages 22–50 weeks that are no earlier than birth GA and strictly
increase, 1–20 observations, and plausible bounded numeric measures. Its code
is the authoritative source for the precise input bounds.

Fabricated test request:

```json
{
  "sex": "F",
  "birthGaWeeks": 24,
  "birthGaDays": 3,
  "measurements": [
    { "weeks": 24, "days": 3, "weightGrams": 613, "headCm": 21.5, "lengthCm": 31 }
  ]
}
```

The Worker creates a CRLF-separated CSV beginning as follows:

```csv
GA at birth:,24 3/7,,
Sex:,F,,
Language,English,,
Data Type ,Growth,,
GA (weeks),Weight (g),Head (cm),Length (cm)
24 3/7,613,21.5,31
```

Empty anthropometric fields become blank CSV cells. The Fenton team's example
also had title, patient number, and date-of-birth rows. We omitted those rows
to minimize identifying data; the live service accepted the fabricated CSV for
all three outputs. We ask the Fenton team to confirm this remains supported.

## Request and response path

| Browser request to Worker | Fenton request from Worker | Browser result |
| --- | --- | --- |
| `POST /chart` with JSON | Multipart upload of CSV to `POST /api/Fenton/ClientPlotPoints`, `runMode=jpg`; then GET the returned chart URL | `image/jpeg`, displayed and downloadable |
| `POST /chart-pdf` with JSON | Same plot endpoint, `runMode=pdf`; then GET the returned chart URL | `application/pdf`, downloadable |
| `POST /zscores` with JSON | Multipart upload of CSV to `POST /api/Fenton/ClientDownloadCsv` | `text/csv`, downloadable |

The Worker expects the plot endpoint's JSON to report `ok: true` and a
`contentUrl`. It resolves that URL only against `https://fentongrowth.ca` and
accepts only `/temp/` JPG/JPEG or PDF paths without query or fragment. It then
downloads and verifies the file signature before returning it. No generated
Fenton file URL or API credential is exposed in the application response.

## Security, privacy, and operational boundary

- The Worker accepts only the app origin `https://jeffeped.github.io` and
  preflights `POST` with `Content-Type`. The `Origin` header protects ordinary
  browser use, but can be forged by non-browser clients and is not authentication.
- Requests are limited to 30 per minute per Cloudflare client IP. The Worker
  rejects unexpected JSON fields, invalid units/ages/measurements, oversized
  requests, unexpected chart URLs, oversized files, and wrong JPG/PDF signatures.
- Responses use `Cache-Control: no-store`; the Worker does not persist
  measurements or files in application storage and does not deliberately log
  their values. The browser invalidates a prior result when inputs change and
  uses temporary object URLs for downloads.
- Cloudflare receives request metadata, including the IP used for limiting.
  The Fenton service receives the generated CSV and creates temporary chart
  files. Its retention, logging, access to `/temp/` files, and deletion schedule
  have not been verified by us; confirmation from the Fenton team is needed.
- A shared hospital IP can reach the limit more quickly. Usage limits, terms,
  attribution, and any stronger authentication required for wider deployment
  should be agreed with the service provider.

## Verification and limits

On 28 September 2026, `npm test` passed 402 tests. A live request with the
fabricated example above returned HTTP 200 for the Z-score CSV, a 2550 × 3300
pixel JPG, and a two-page PDF. We visually inspected the JPG and saw the three
measurements on the Fenton 2025 girls chart. A preflight `OPTIONS` request
returned HTTP 204 with the expected CORS permissions. These checks verify
transport, format, and a visual smoke test, **not clinical agreement**. Clinical
validation against independently checked cases covering both sexes, gestational
ages, serial trajectories, and boundary conditions remains pending. A local Edge
end-to-end check of the published page also remains pending: our remote test
browser blocked `workers.dev` at the client level, while direct HTTPS calls
to the Worker succeeded.

The public app is at <https://jeffeped.github.io/NP_NEO/>. The Worker Builds
connection was configured to watch `feature/fenton-secure-proxy` at the time of
this record. Its production branch should be changed to `main` following the
merge, then a deployment should be verified.

## Browser failure and correction (28 September 2026)

After publication, the user reported `Failed to fetch`. A fresh direct test
returned HTTP 200 with a JPG and HTTP 204 for the CORS preflight, but inspection
of the published HTML identified a separate browser restriction: its enforced
Content Security Policy contained `connect-src 'self'`. This policy prohibited
the browser from contacting the configured Worker. Direct HTTP tests and mocked
UI tests had not exercised that policy.

Version 0.6.8 adds the exact Worker origin to `connect-src` and changes the
service-worker cache version so installed copies receive the new HTML. A new
regression test checks that the page permits only its own origin and the
configured Worker for connections. It failed on 0.6.7 before the correction.
The initial suggestion of a browser extension or network block was not an
established diagnosis. The published CSP omission is a confirmed application
defect; an end-to-end browser test remains the acceptance check for the fix.

## Questions for the Fenton team

1. Are submissions without title, patient number, and date of birth supported
   now and expected to remain supported?
2. How long are measurements and generated `/temp/` files kept, and who can
   retrieve the files? Are they deleted automatically?
3. What API limits, attribution requirements, and conditions apply to free,
   noncommercial use in public neonatal units in Brazil?
4. Is a Portuguese chart or response format planned? How will API or CSV schema
   changes be communicated?
5. Are reference cases or an independent method available for clinical
   validation of plots and Z scores?

## Maintenance

The deployment steps and secret name are in
[`workers/fenton-proxy/README.md`](../workers/fenton-proxy/README.md); the live
request validation and CSV conversion are in
[`workers/fenton-proxy/src/index.js`](../workers/fenton-proxy/src/index.js).
Changes to the CSV contract or endpoint behavior should be checked against the
Fenton team, tested with fabricated data, and recorded here. Never commit or
send the API key as part of a test or a support request.
