import { Network } from 'lucide-react';
import { LegalDocument, LegalPage, LegalPanel } from '../_components/legal-page';

type SubProcessor = {
  name: string;
  purpose: string;
  data: string;
  country: string;
  safeguard: string;
};

const SUBPROCESSORS: SubProcessor[] = [
  {
    name: 'Google LLC — Firebase / Google Cloud Platform',
    purpose:
      'Authentication, Firestore database, Cloud Storage, Cloud Functions, hosting.',
    data: 'Account data, brand assets, Business Data, generated content, OAuth tokens, logs.',
    country: 'United States (us-central1)',
    safeguard: 'EU SCCs + EU-US Data Privacy Framework (Google is certified)',
  },
  {
    name: 'OpenAI, L.L.C.',
    purpose:
      'Generative text and image processing for captions, posts, product adverts, chatbot.',
    data: 'Prompts, brand context, generated outputs (no payment data, no passwords).',
    country: 'United States',
    safeguard:
      'OpenAI Data Processing Addendum + EU SCCs; API training opt-out enabled.',
  },
  {
    name: 'Anthropic, PBC',
    purpose:
      'Generative text processing for captions, content strategy, chatbot reasoning.',
    data: 'Prompts, brand context, generated outputs.',
    country: 'United States',
    safeguard: 'Anthropic Commercial Terms; zero-retention configured where available.',
  },
  {
    name: 'Google LLC — Gemini / Vertex AI',
    purpose: 'Multi-modal AI generation (text, image, vision).',
    data: 'Prompts, uploaded images, brand context, generated outputs.',
    country: 'United States',
    safeguard:
      'Google Cloud DPA + EU SCCs + EU-US DPF; Vertex AI does not train on customer data.',
  },
  {
    name: 'Dodo Payments Inc.',
    purpose:
      'Merchant of Record for subscription billing, Top-Up Credit purchases, tax remittance, refunds.',
    data: 'Name, billing address, country, tax ID (where applicable), payment-instrument details. We never see card numbers.',
    country: 'United States (Delaware)',
    safeguard: 'Dodo DPA + PCI-DSS Level 1; we receive only redacted transaction records.',
  },
  {
    name: 'Firecrawl (Mendable AI, Inc.)',
    purpose:
      'On-demand fetching of public webpages submitted by users for brand onboarding (Brand DNA extraction).',
    data: 'URLs you submit and the public page content fetched.',
    country: 'United States',
    safeguard: 'Firecrawl Terms; data not retained beyond the fetch session.',
  },
  {
    name: 'Google LLC — Google Analytics 4',
    purpose:
      'Aggregated product analytics on the public website and authenticated app.',
    data: 'Pseudonymous device/session identifiers, page views, IP (truncated where required).',
    country: 'United States (data may be processed in EU for EU visitors)',
    safeguard:
      'Google Ads Data Processing Terms + EU SCCs + EU-US DPF; loaded only after cookie consent (EU/UK users).',
  },
  {
    name: 'Meta Platforms, Inc. (Instagram, Facebook Graph API)',
    purpose:
      'Publishing posts and reading post-level analytics for accounts you have connected via OAuth.',
    data: 'Connected-account access token, page/business identifiers, posts you publish, post insights you authorise us to read.',
    country: 'United States / Ireland',
    safeguard:
      'Meta Platform Terms + Meta DPA; SocioGenie is not affiliated with Meta.',
  },
  {
    name: 'LinkedIn Corporation',
    purpose:
      'Publishing posts and reading post-level analytics for LinkedIn accounts connected via OAuth.',
    data: 'Connected-account access token, member/organisation identifiers, posts, analytics.',
    country: 'United States / Ireland',
    safeguard:
      'LinkedIn API Terms + LinkedIn DPA; SocioGenie is not affiliated with LinkedIn.',
  },
];

export default function SubProcessorsPage() {
  return (
    <LegalPage
      title="Sub-processors"
      subtitle="Effective date: 28 May 2026 · Last updated: 28 May 2026"
      icon={Network}
      iconTone="sky"
      maxWidth="xl"
    >
      <LegalDocument>
        <p>
          This page lists the third-party service providers (“sub-processors”)
          that <strong>MAGNATEX LLP</strong> engages to deliver the SocioGenie
          platform. Each sub-processor is bound by a Data Processing Agreement
          (DPA) and contractual confidentiality, security, and data-protection
          obligations consistent with the GDPR (Article 28), the UK GDPR, the
          DPDP Act 2023 (India), and the CCPA/CPRA where applicable.
        </p>
        <p>
          This list is provided for transparency. It supplements (and does not
          replace) the disclosures in our{' '}
          <a href="/legal/privacy">Privacy Policy</a>.
        </p>

        <h2>Current sub-processors</h2>
      </LegalDocument>

      <LegalPanel>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Sub-processor</th>
                <th>Purpose</th>
                <th>Data processed</th>
                <th>Location</th>
                <th>Safeguards</th>
              </tr>
            </thead>
            <tbody>
              {SUBPROCESSORS.map((s) => (
                <tr key={s.name}>
                  <td className="font-medium text-slate-900 whitespace-nowrap">
                    {s.name}
                  </td>
                  <td className="min-w-[220px]">{s.purpose}</td>
                  <td className="min-w-[220px]">{s.data}</td>
                  <td className="min-w-[140px]">{s.country}</td>
                  <td className="min-w-[220px]">{s.safeguard}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalPanel>

      <LegalDocument>
        <h2>Hosting region</h2>
        <p>
          Primary data storage is in Google Cloud Platform region{' '}
          <strong>us-central1</strong> (Council Bluffs, Iowa, United States).
          Encrypted backups and disaster-recovery copies may be replicated to
          other Google Cloud regions in accordance with Google&apos;s standard
          durability and resiliency practices. International transfers are
          governed by EU Standard Contractual Clauses (SCCs), the UK
          International Data Transfer Addendum, and the EU-US Data Privacy
          Framework where applicable.
        </p>

        <h2>Changes to this list</h2>
        <p>
          We may engage new sub-processors or replace existing ones from time
          to time. Material changes will be reflected on this page with an
          updated &ldquo;Last updated&rdquo; date. Business customers under a
          signed Data Processing Agreement may subscribe to email
          notifications of sub-processor changes by writing to{' '}
          <a href="mailto:founder@magnatex.co">founder@magnatex.co</a> at
          least 30 days before they are introduced, where applicable.
        </p>

        <h2>Requests for documentation</h2>
        <p>
          We are happy to provide, on reasonable request and under
          confidentiality, copies of the relevant sub-processor DPAs, our
          Information Security Statement, our standard customer DPA, and any
          available SOC 2 / ISO 27001 attestations our providers publish.
          Please email{' '}
          <a href="mailto:founder@magnatex.co">founder@magnatex.co</a>.
        </p>

        <h2>Contact</h2>
        <ul>
          <li>
            <strong>Privacy &amp; sub-processor queries:</strong>{' '}
            <a href="mailto:founder@magnatex.co">founder@magnatex.co</a>
          </li>
          <li>
            <strong>Postal:</strong> MAGNATEX LLP (LLPIN: ACU-5689), 111,
            Fortune Business Hub, Sola, Nr. Satyamev Elysium, Ahmedabad,
            Gujarat 380060, India
          </li>
        </ul>
      </LegalDocument>
    </LegalPage>
  );
}
