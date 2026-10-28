# pdf-night-mode

Independent browser-local tool. Input names, PDF files and passwords stay in the browser.

Build: `node scripts/build.mjs`. Tests: `node --test tests/*.test.mjs`.

Public GitHub Pages deployment: https://nanalab.kr/pdf-night-mode/ . Source: https://github.com/NaNaCompany/pdf-night-mode . Pages source is `main:/docs`; no project CNAME. The `sites/` prototype is preserved separately.


## Languages

Korean root plus English, Japanese, Chinese, Spanish, German, French, Portuguese and Russian subpaths. All controls, validation, progress and disclosure text are generated from `src/locales.json`. Shared rendering code processes files locally. The footer language menu changes the route; uploaded files are not carried across navigation. The own sitemap and reciprocal hreflang list all nine converter routes.


## Publisher integrations

Every generated HTML page includes GA4, Google Tag Manager (with noscript fallback), AdSense and Cloudflare Web Analytics using the verified existing NaNa publisher IDs. The build injects these integrations. Analytics and ad scripts load only on the approved production hostnames, not local preview hosts. User input values and uploaded file contents are not passed to analytics events. GA page locations omit query strings and hashes.
