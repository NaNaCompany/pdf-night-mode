# PDF 색상 반전 — Update log

## 2026-10-28

- Replaced decorative slogans with the functional title `PDF 색상 반전` and removed NaNa Lab from the header.
- Kept the Korean root and added English, Japanese, Chinese, Spanish, German, French, Portuguese and Russian routes: `/en/`, `/ja/`, `/zh/`, `/es/`, `/de/`, `/fr/`, `/pt/`, `/ru/`.
- Localized 58 strings per language, including validation errors, file limits, privacy notes, password messages, cancellation, progress, completion and image-PDF output limitations.
- Added a footer language selector, self-canonical URLs, reciprocal hreflang and all nine converter routes in the app sitemap.
- Versioned modified browser assets after observing stale cached Korean runtime code during QA.
- Validation: all locale keys and interpolation placeholders match; nine routes and sitemap entries verified; four PDF integration tests pass. Browser file loading and localized invalid-range errors verified in all eight foreign languages; English actual PDF download verified.
- Output remains an image PDF. Text search, links, forms and digital signatures are not retained. Files/passwords stay in the browser.
- Deployment target: https://pdf-night-mode.bahn1307.chatgpt.site (owner-private).


## 2026-10-28 — GitHub Pages public release

- Public repository: https://github.com/NaNaCompany/pdf-night-mode . Public app: https://nanalab.kr/pdf-night-mode/ .
- Changed hosting target to GitHub Pages `main:/docs`, retained licenses and attribution, added `.nojekyll`, public canonical/robots/sitemap URLs and removed private-preview noindex directives. The private Sites prototype is preserved separately.
- Added verified GA4 `G-2ZYSF0173P`, GTM `GTM-NV2WWQXB`, AdSense `ca-pub-9767176956440077` and Cloudflare Web Analytics `9f3423bb0d034d91bbe1a12afeff2429` to every HTML page. Local/test hosts do not initialize analytics or advertising scripts. No input contents are sent in custom analytics events.
