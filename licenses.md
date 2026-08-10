# Open-Source Licenses

<!--
  IMPLEMENTATION NOTE — not for display.

  This page has two parts:

  1. The prose below, which is static and rarely changes.
  2. The package list, which MUST be rendered from src/data/licenses.json,
     produced by scripts/generate-licenses.mjs on every build.

  Do not hand-maintain the package list. The current live page is stamped
  2026-05-29 and is already out of date relative to the deployed bundle.

  Wire it up:
    "scripts": {
      "build": "node scripts/generate-licenses.mjs && next build"
    }

  Render from the JSON:
    - licenses.generatedAt   -> the "Generated" date
    - licenses.totalPackages -> the package count
    - licenses.summary       -> the summary table
    - licenses.groups        -> the collapsible per-license package lists
    - licenses.notes         -> the "Special notes" section
-->

{{TOTAL_PACKAGES}} third-party packages · Generated {{GENERATED_AT}}

SocioGenie is built by **MAGNATEX LLP** on top of a large ecosystem of open-source software. This page lists every third-party package shipped with SocioGenie, together with its license, in fulfilment of the attribution requirements of the MIT, BSD, Apache 2.0, ISC, and similar permissive licenses.

This list is generated automatically from our dependency manifest on every deployment, so it always reflects what is actually running in production.

The complete machine-readable notices file, including full license texts, is available for download:

[Download THIRD_PARTY_NOTICES.md](https://www.sociogenie.ai/legal/third-party-notices.md)

---

## Summary

{{SUMMARY_TABLE}}

---

## Packages by license

{{PACKAGE_GROUPS}}

---

## Special notes

{{ELECTION_NOTES}}

---

## Scope of this page

This page covers open-source software incorporated into SocioGenie. It does **not** cover:

- **Third-party services** we call over the network rather than bundle — Anthropic, Google, OpenAI, Meta, LinkedIn, Dodo Payments, Firecrawl, OpenBrand, and others. Those are listed on our [Sub-processors](https://www.sociogenie.ai/legal/sub-processors) page.
- **Content generated through SocioGenie**, which is governed by our [Terms of Service](https://www.sociogenie.ai/legal/terms) and [AI Disclosure](https://www.sociogenie.ai/legal/ai-disclosure).
- **SocioGenie's own source code**, interface, AI orchestration, and prompt design, which are proprietary to MAGNATEX LLP and are not open-source.

## Trademarks

Product names, logos, and brands referenced on this page are the property of their respective owners. Their appearance here is attribution required by an open-source license and does not imply endorsement of, or affiliation with, SocioGenie or MAGNATEX LLP.

## Corrections

If you maintain a package listed here and believe the attribution is incorrect or incomplete, contact us at <founder@magnatex.co> and we will correct it.

---

**Contact:** <founder@magnatex.co> · MAGNATEX LLP, 111, Fortune Business Hub, Sola, Nr. Satyamev Elysium, Ahmedabad, Gujarat 380060, India
