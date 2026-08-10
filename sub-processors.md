# Sub-processors

Effective date: 10 August 2026 · Last updated: 10 August 2026

This page lists the third-party service providers ("sub-processors") that **MAGNATEX LLP** engages to deliver SocioGenie. Each is engaged under a data-processing agreement with confidentiality, security, and data-protection obligations consistent with Article 28 of the GDPR, the UK GDPR, the DPDP Act 2023 (India), and the CCPA/CPRA where applicable.

This list supplements, and does not replace, the disclosures in our [Privacy Policy](https://www.sociogenie.ai/legal/privacy) and the terms of our [Data Processing Agreement](https://www.sociogenie.ai/legal/dpa).

---

## Infrastructure and hosting

| Sub-processor | Purpose | Data processed | Location | Safeguards |
| --- | --- | --- | --- | --- |
| Google LLC — Firebase / Google Cloud Platform | Authentication, Firestore database, Cloud Storage, Cloud Functions, application hosting, transactional email delivery for authentication flows | Account data, brand assets, questionnaire answers, generated content, OAuth tokens, application logs | United States (us-central1) | Google Cloud DPA + EU SCCs + EU–US Data Privacy Framework |

## Generative AI

| Sub-processor | Purpose | Data processed | Location | Safeguards |
| --- | --- | --- | --- | --- |
| Anthropic, PBC | Text generation, content strategy, reasoning, chat assistant | Prompts, brand context, generated outputs | United States | Anthropic Commercial Terms + DPA; no training on customer data; zero-retention configured where available |
| Google LLC — Vertex AI / Gemini API | Multimodal generation: text, image, and video | Prompts, uploaded images and assets, brand context, generated outputs | United States | Google Cloud DPA + EU SCCs + EU–US DPF; Vertex AI does not train on customer data |
| OpenAI, L.L.C. | Text and image processing for specific in-app features | Prompts, brand context, generated outputs | United States | OpenAI DPA + EU SCCs; API training opt-out enabled |

No payment data, passwords, or social-media credentials are sent to any AI provider.

## Brand extraction

| Sub-processor | Purpose | Data processed | Location | Safeguards |
| --- | --- | --- | --- | --- |
| Firecrawl (Mendable AI, Inc.) | On-demand fetching of public web pages you submit during onboarding | The URL you submit and the public page content fetched | United States | Firecrawl Terms + DPA; content not retained beyond the fetch session |
| OpenBrand (Tight Studio) | Extraction of logos, brand colours, and imagery from a website URL you submit, to pre-fill onboarding | The URL you submit and publicly available brand assets on that page | *See note below* | Provider terms; used only at the moment you submit a URL |

Both are triggered only when you submit a website URL. Neither is used for ongoing monitoring of your site.

## Payments

| Sub-processor | Purpose | Data processed | Location | Safeguards |
| --- | --- | --- | --- | --- |
| Dodo Payments Inc. | Merchant of Record — subscription billing, Credit purchases, invoicing, tax remittance, refunds | Billing name, address, country, tax identifier where applicable, payment-instrument details collected directly by Dodo | United States (Delaware) | Dodo DPA + PCI-DSS Level 1; we receive only redacted transaction records and never see card numbers |

## Analytics

| Sub-processor | Purpose | Data processed | Location | Safeguards |
| --- | --- | --- | --- | --- |
| Google LLC — Google Analytics 4 | Aggregated product and website analytics | Pseudonymous device and session identifiers, page views, truncated IP address | United States (processed in the EU for EU visitors) | Google Ads Data Processing Terms + EU SCCs + EU–US DPF; **loaded only after cookie consent** |
| Vercel Inc. | Basic aggregate web traffic measurement (page views, visitor counts) | Cookieless aggregate traffic data; no persistent cross-site identifier | United States | Vercel DPA + EU SCCs |

## Publishing platforms

| Sub-processor | Purpose | Data processed | Location | Safeguards |
| --- | --- | --- | --- | --- |
| Meta Platforms, Inc. | Publishing to Instagram and Facebook and reading post-level analytics for accounts you connect via OAuth | Access token, page/business identifiers, content you publish, post insights you authorise us to read | United States / Ireland | Meta Platform Terms + Meta DPA. SocioGenie is not affiliated with Meta. |
| LinkedIn Corporation | Publishing to LinkedIn and reading post-level analytics for accounts you connect via OAuth | Access token, member/organisation identifiers, content you publish, post analytics | United States / Ireland | LinkedIn API Terms + LinkedIn DPA. SocioGenie is not affiliated with LinkedIn. |

## Email

Transactional email — account verification, password reset, and security notifications — is sent through **Firebase Authentication (Google LLC)**. Other operational email is sent from our own application via SMTP relay. No separate email-marketing platform is engaged, and we do not share your email address with any marketing vendor.

---

## Internal access

Human review of generated content, where included in your plan, is performed by **employees of MAGNATEX LLP working in India**. This is not outsourced to an agency, contractor pool, or crowd workforce. Reviewers see only the generated post and are bound by written confidentiality obligations under least-privilege access controls. See Section 6 of our [Privacy Policy](https://www.sociogenie.ai/legal/privacy).

---

## Hosting region

Primary data storage is in Google Cloud Platform region **us-central1** (Council Bluffs, Iowa, United States). Encrypted backups and disaster-recovery copies may be replicated to other Google Cloud regions under Google's standard durability practices. International transfers are governed by EU Standard Contractual Clauses, the UK International Data Transfer Addendum, and the EU–US Data Privacy Framework where applicable.

---

## Changes to this list

We may engage new sub-processors or replace existing ones. Changes are published on this page with a revised "Last updated" date.

Customers under a signed Data Processing Agreement may subscribe to advance email notification of sub-processor changes by writing to <founder@magnatex.co>. Where we give advance notice, it will be at least **30 days** before the new sub-processor begins processing, and you may object on reasonable data-protection grounds within that period. If we cannot resolve an objection, you may terminate the affected Services and receive a pro-rated refund of the unused portion of your current billing cycle.

---

## Documentation requests

On reasonable request and under confidentiality, we can provide copies of relevant sub-processor DPAs, our Information Security Statement, our standard customer DPA, and any SOC 2 or ISO 27001 attestations our providers publish. Email <founder@magnatex.co>.

---

**Privacy and sub-processor queries:** <founder@magnatex.co>
**Postal:** MAGNATEX LLP (LLPIN: ACU-5689), 111, Fortune Business Hub, Sola, Nr. Satyamev Elysium, Ahmedabad, Gujarat 380060, India
