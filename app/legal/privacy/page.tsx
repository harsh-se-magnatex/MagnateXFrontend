import { ScrollText } from 'lucide-react';
import { LegalDocument, LegalPage } from '../_components/legal-page';

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="Effective date: 28 May 2026 · Last updated: 28 May 2026"
      icon={ScrollText}
    >
      <LegalDocument>
        <p>
          This Privacy Policy describes how <strong>MAGNATEX LLP</strong>{' '}
          (“MagnateX”, “SocioGenie”, “we”, “our”, “us”) collects, uses,
          discloses, stores, and protects information about you (“you”, “your”,
          “User”) when you visit{' '}
          <a href="https://www.sociogenie.ai">www.sociogenie.ai</a>, create an
          account, or use the SocioGenie platform and related services
          (collectively, the “Services”).
        </p>
        <p>
          We are committed to processing personal data lawfully, fairly, and
          transparently in accordance with the{' '}
          <strong>Digital Personal Data Protection Act, 2023 (India)</strong>,
          the <strong>Information Technology Act, 2000</strong> and its rules,
          the{' '}
          <strong>EU General Data Protection Regulation (GDPR) 2016/679</strong>
          , the <strong>UK GDPR</strong>, the{' '}
          <strong>California Consumer Privacy Act / CPRA</strong>, and other
          applicable data-protection laws.
        </p>

        <h2>1. Who We Are (Data Controller)</h2>
        <p>
          The data controller / data fiduciary responsible for your personal
          data is:
        </p>
        <ul>
          <li>
            <strong>MAGNATEX LLP</strong> (LLPIN: ACU-5689)
          </li>
          <li>
            Registered office: 111, Fortune Business Hub, Sola, Nr. Satyamev
            Elysium, Ahmedabad, Gujarat 380060, India
          </li>
          <li>
            General contact:{' '}
            <a href="mailto:support@magnatex.co">support@magnatex.co</a>
          </li>
          <li>
            Privacy & data requests:{' '}
            <a href="mailto:founder@magnatex.co">founder@magnatex.co</a>
          </li>
        </ul>

        <h2>2. Scope of This Policy</h2>
        <p>This Policy applies to personal data we process when you:</p>
        <ul>
          <li>visit our website, marketing pages, or blog;</li>
          <li>create or maintain a SocioGenie account;</li>
          <li>
            subscribe to a plan, start a free trial, or purchase Top-Up
            Credits;
          </li>
          <li>
            connect third-party social-media accounts (e.g., Instagram,
            Facebook, LinkedIn);
          </li>
          <li>upload brand assets, products, or media;</li>
          <li>
            use AI-powered features such as the AI Engine, Bulk Create, Quick
            Create, Product Advert Generator, Festival Post Generator, the AI
            Chatbot Assistant, or the Approval Workflow;
          </li>
          <li>contact us for support, sales, or any other reason.</li>
        </ul>

        <h2>3. Categories of Personal Data We Collect</h2>

        <h3>3.1 Information you provide directly</h3>
        <ul>
          <li>
            <strong>Account data:</strong> full name, email address, phone
            number, password (stored hashed), profile picture, time zone,
            language, country.
          </li>
          <li>
            <strong>Business / brand data:</strong> business name, website URL,
            industry, brand logo(s), brand colours, hashtags, slogans, product
            images, product descriptions, marketing assets, contact details
            shown on creatives, and any other content uploaded to your Media
            Library or Brand DNA.
          </li>
          <li>
            <strong>AI Memory Layer data:</strong> answers about brand
            personality, communication tone, target audience, marketing
            direction, preferred style, and positioning.
          </li>
          <li>
            <strong>Content data:</strong> prompts you enter, references you
            upload, captions, AI-generated images, drafts, scheduled posts, and
            published posts.
          </li>
          <li>
            <strong>Communications:</strong> support tickets, emails, chatbot
            transcripts, survey responses, and feedback.
          </li>
        </ul>

        <h3>3.2 Information collected automatically</h3>
        <ul>
          <li>
            <strong>Device & technical data:</strong> IP address, device type,
            operating system, browser type and version, screen resolution,
            language, referring URL, and crash logs.
          </li>
          <li>
            <strong>Usage data:</strong> pages and features accessed, clicks,
            session duration, AI generation events, posts scheduled/published,
            credits consumed, and approval actions.
          </li>
          <li>
            <strong>Cookies & similar technologies:</strong> see our{' '}
            <a href="/legal/cookie">Cookie Policy</a> for details. We currently
            use Google Analytics 4 for product analytics and standard
            session/auth cookies for platform functionality.
          </li>
        </ul>

        <h3>3.3 Information from third parties</h3>
        <ul>
          <li>
            <strong>Social-media platforms.</strong> When you connect Instagram,
            Facebook, or LinkedIn through OAuth, we receive access tokens,
            account identifiers, page/business IDs, basic profile data,
            permissions, and (where you authorise it) post insights such as
            reach, impressions, and engagement. We use these tokens only to
            perform the actions you have authorised (publishing, scheduling,
            analytics). We do not store your social-media password.
          </li>
          <li>
            <strong>Payment processor.</strong> Subscription and Top-Up
            purchases are processed by{' '}
            <strong>Dodo Payments Inc. (“Dodo”)</strong>, which acts as the{' '}
            <em>Merchant of Record</em> for SocioGenie. Dodo collects your
            billing name, billing address, country, tax identifiers (where
            applicable) and payment-instrument details directly. We receive
            only a limited transaction record (plan, amount, currency, last 4
            digits of card, status, invoice ID). We never see or store your
            full card number, CVV, or bank credentials.
          </li>
          <li>
            <strong>Website scraping for onboarding.</strong> If you provide
            your business website during onboarding, we fetch publicly
            available pages to extract business name, industry, slogans, brand
            colours, logo references, contact details and brand descriptions
            for your Brand DNA.
          </li>
        </ul>

        <h2>4. Purposes of Processing &amp; Legal Bases</h2>
        <p>
          We process personal data only for the purposes described below, and
          only where we have a valid legal basis under the GDPR (or an
          equivalent ground under the DPDP Act and other applicable laws).
        </p>
        <ul>
          <li>
            <strong>To provide the Services</strong> — create your account,
            authenticate you, run the AI Engine, generate content, schedule and
            publish posts, deliver analytics, operate the approval workflow,
            and provide customer support.{' '}
            <em>Legal basis: performance of a contract.</em>
          </li>
          <li>
            <strong>To process payments and prevent fraud</strong> — via Dodo
            Payments. <em>Legal basis: contract; legal obligation.</em>
          </li>
          <li>
            <strong>To send service communications</strong> — transactional
            emails (account, billing, security, trial expiry, credit
            depletion). <em>Legal basis: contract; legitimate interest.</em>
          </li>
          <li>
            <strong>To improve the platform</strong> — monitor performance, fix
            bugs, conduct product analytics, and develop new features.{' '}
            <em>Legal basis: legitimate interest.</em>
          </li>
          <li>
            <strong>To send marketing and product updates</strong> — only where
            you have opted in or where permitted by law (you can opt out at any
            time). <em>Legal basis: consent; legitimate interest.</em>
          </li>
          <li>
            <strong>To comply with law</strong> — tax, accounting, anti-fraud,
            anti-money-laundering, and lawful requests from authorities.{' '}
            <em>Legal basis: legal obligation.</em>
          </li>
        </ul>

        <h2>5. AI Processing &amp; Automated Decision-Making</h2>
        <p>
          SocioGenie is an AI-powered platform. To deliver core features (Brand
          DNA analysis, AI Memory Layer, AI Engine, Bulk Create, Quick Create,
          Product Advert Generator, Festival Post Generator, Chatbot
          Assistant), we send relevant content and brand data to enterprise AI
          providers acting as our processors / sub-processors:
        </p>
        <ul>
          <li>
            <strong>OpenAI, L.L.C.</strong> (United States)
          </li>
          <li>
            <strong>Anthropic, PBC</strong> (United States)
          </li>
          <li>
            <strong>Google LLC — Google AI / Gemini / Vertex AI</strong>{' '}
            (United States)
          </li>
        </ul>
        <p>
          These providers are contractually prohibited from using your data to
          train their public models in our standard configuration, and we
          configure their APIs accordingly where the option is available.
        </p>
        <p>
          <strong>
            We do not use your personal data, brand assets, or generated
            content to train our own AI models.
          </strong>
        </p>
        <p>
          The AI Engine makes automated suggestions about what to post, when to
          post, and how to present it. These are <em>suggestions</em> — final
          publication only occurs after either (a) automatic execution that you
          have explicitly configured, or (b) human review via the User Approval
          Mode or the Managed Approval Mode. You retain the right to disable
          automation at any time. The processing does not produce legal effects
          on you within the meaning of GDPR Article 22.
        </p>

        <h2>6. Human Review (Managed Approval Mode)</h2>
        <p>
          If you opt into <strong>Managed Approval Mode</strong>, members of
          the SocioGenie operations team review the AI-generated post (caption
          + creative) strictly to check branding consistency, caption quality,
          creative presentation, and posting readiness. Reviewers see only the
          generated post; they do not access your raw social-media account
          data, audience details, or message inboxes. All reviewers are bound
          by confidentiality obligations.
        </p>

        <h2>7. How We Share Personal Data</h2>
        <p>
          We <strong>do not sell</strong> your personal data and we{' '}
          <strong>do not “share”</strong> it for cross-context behavioural
          advertising within the meaning of the CCPA/CPRA. We disclose personal
          data only to the following categories of recipients:
        </p>
        <ul>
          <li>
            <strong>Service providers / sub-processors</strong> who operate the
            platform on our behalf, including:
            <ul>
              <li>
                <strong>Google LLC (Firebase / Google Cloud Platform,
                us-central1)</strong>{' '}
                — hosting, database, authentication, file storage.
              </li>
              <li>
                <strong>OpenAI, Anthropic, Google AI</strong> — generative-AI
                processing (see Section 5).
              </li>
              <li>
                <strong>Dodo Payments Inc.</strong> — Merchant of Record for
                subscription billing and tax compliance.
              </li>
              <li>
                <strong>Google LLC (Google Analytics 4)</strong> — product
                analytics.
              </li>
            </ul>
          </li>
          <li>
            <strong>Social-media platforms</strong> you have connected — we
            transmit the content you authorise us to publish (Meta Platforms
            for Instagram &amp; Facebook; LinkedIn Corporation for LinkedIn).
          </li>
          <li>
            <strong>Professional advisors</strong> — lawyers, auditors,
            accountants, and insurers under confidentiality.
          </li>
          <li>
            <strong>Government, regulators, and law enforcement</strong> — when
            required by law, court order, or to protect our rights, users, or
            the public.
          </li>
          <li>
            <strong>Successors</strong> — in connection with a merger,
            acquisition, reorganisation, or sale of assets, subject to
            equivalent privacy protections.
          </li>
        </ul>

        <h2>8. International Data Transfers</h2>
        <p>
          MAGNATEX LLP is based in India. Our infrastructure and several
          sub-processors are based in the United States (Firebase / Google
          Cloud us-central1, OpenAI, Anthropic, Google AI, Dodo Payments).
          Where personal data is transferred outside your country of residence
          — including from the European Economic Area, the United Kingdom, or
          Switzerland to India or the United States — we rely on appropriate
          safeguards such as:
        </p>
        <ul>
          <li>
            the European Commission’s Standard Contractual Clauses (SCCs) and
            the UK International Data Transfer Addendum;
          </li>
          <li>
            adequacy decisions where they apply (e.g., the EU-US Data Privacy
            Framework, for participating sub-processors);
          </li>
          <li>
            equivalent contractual protections with all our processors and
            sub-processors.
          </li>
        </ul>
        <p>
          A copy of the safeguards we use is available on request from{' '}
          <a href="mailto:founder@magnatex.co">founder@magnatex.co</a>.
        </p>

        <h2>9. Data Retention</h2>
        <ul>
          <li>
            <strong>Active accounts:</strong> We retain personal data for as
            long as your account is active.
          </li>
          <li>
            <strong>After account deletion:</strong> We delete or anonymise
            account data, brand assets, AI Memory Layer content, generated
            posts, and connected-account tokens within{' '}
            <strong>30 days</strong> of confirmed deletion, except where
            retention is required by law (see below).
          </li>
          <li>
            <strong>Billing &amp; tax records:</strong> Invoices, transaction
            records, and tax data are retained for up to{' '}
            <strong>8 (eight) years</strong> as required under Indian
            tax/company law and equivalent obligations in other jurisdictions.
          </li>
          <li>
            <strong>Backups:</strong> Encrypted backups containing deleted data
            may persist for up to <strong>90 days</strong> before being rotated
            out.
          </li>
          <li>
            <strong>Legal holds:</strong> Where data is subject to ongoing
            litigation, investigation, or regulatory request, we retain it
            until the matter is resolved.
          </li>
        </ul>

        <h2>10. Your Rights</h2>
        <p>
          Depending on where you live, you have some or all of the following
          rights in relation to your personal data:
        </p>
        <ul>
          <li>
            <strong>Right of access</strong> — obtain a copy of your personal
            data.
          </li>
          <li>
            <strong>Right to rectification</strong> — correct inaccurate or
            incomplete data.
          </li>
          <li>
            <strong>Right to erasure (“right to be forgotten”)</strong> —
            delete personal data, subject to legal-retention exceptions.
          </li>
          <li>
            <strong>Right to restrict processing</strong>.
          </li>
          <li>
            <strong>Right to object</strong> — including to direct marketing
            and to processing based on legitimate interest.
          </li>
          <li>
            <strong>Right to data portability</strong> — receive data in a
            structured, machine-readable format.
          </li>
          <li>
            <strong>Right to withdraw consent</strong> — at any time, without
            affecting the lawfulness of prior processing.
          </li>
          <li>
            <strong>Right to lodge a complaint</strong> — with your local data
            protection authority (e.g., the Data Protection Board of India for
            DPDP, your EU/UK supervisory authority for GDPR, or the California
            Privacy Protection Agency for CCPA/CPRA).
          </li>
          <li>
            <strong>CCPA/CPRA-specific rights</strong> — California residents
            have the right to know, delete, correct, and limit the use of
            sensitive personal information, and the right to non-discrimination
            for exercising these rights. We do not sell or share personal
            information for cross-context behavioural advertising.
          </li>
          <li>
            <strong>DPDP-specific rights</strong> — Indian Data Principals may
            nominate another individual to exercise rights in the event of
            death or incapacity, and may contact our Grievance Officer (see
            Section 14).
          </li>
        </ul>
        <p>
          To exercise any of these rights, email{' '}
          <a href="mailto:founder@magnatex.co">founder@magnatex.co</a> from the
          address associated with your account. We respond within 30 days (or
          as required by applicable law). We may need to verify your identity
          before fulfilling the request.
        </p>

        <h2>11. Security</h2>
        <p>
          We implement reasonable administrative, technical, and physical
          safeguards designed to protect personal data, including: encryption
          in transit (TLS 1.2+) and at rest, hashed passwords, scoped access
          control, audit logging, secret-management for API keys and OAuth
          tokens, vendor security reviews, and least-privilege access for
          employees. No system is 100% secure, and we cannot guarantee absolute
          security. You are responsible for keeping your account credentials
          confidential. If you suspect unauthorised access, contact{' '}
          <a href="mailto:support@magnatex.co">support@magnatex.co</a>{' '}
          immediately.
        </p>
        <p>
          In the event of a personal-data breach likely to result in a risk to
          your rights, we will notify the relevant supervisory authority and
          affected users without undue delay, in line with GDPR Article 33/34,
          DPDP Section 8(6), and other applicable laws.
        </p>

        <h2>12. Cookies &amp; Tracking</h2>
        <p>
          We use a limited set of cookies and similar technologies for (a)
          authentication and security, (b) remembering preferences such as
          language and time zone, and (c) Google Analytics 4 for aggregated
          product analytics. We do not run advertising pixels by default.
          Details and your choices are described in our{' '}
          <a href="/legal/cookie">Cookie Policy</a>.
        </p>

        <h2>13. Children’s Privacy</h2>
        <p>
          The Services are intended only for users who are{' '}
          <strong>18 years of age or older</strong>. We do not knowingly
          collect personal data from children under 18. If you believe a child
          has provided us with personal data, please contact{' '}
          <a href="mailto:founder@magnatex.co">founder@magnatex.co</a> and we
          will delete it.
        </p>

        <h2>14. Grievance Officer (India)</h2>
        <p>
          In compliance with the Information Technology Act, 2000, the
          Information Technology (Reasonable Security Practices and Procedures
          and Sensitive Personal Data or Information) Rules, 2011, and the
          DPDP Act, 2023, the following officer is designated to address
          grievances regarding the processing of your personal data:
        </p>
        <ul>
          <li>
            <strong>Name:</strong> Naman Patel
          </li>
          <li>
            <strong>Designation:</strong> Founder, MAGNATEX LLP
          </li>
          <li>
            <strong>Email:</strong>{' '}
            <a href="mailto:founder@magnatex.co">founder@magnatex.co</a>
          </li>
          <li>
            <strong>Working hours:</strong> Monday – Friday, 09:00 – 18:00 IST
          </li>
          <li>
            <strong>Address:</strong> 111, Fortune Business Hub, Sola, Nr.
            Satyamev Elysium, Ahmedabad, Gujarat 380060, India
          </li>
        </ul>
        <p>
          The Grievance Officer will acknowledge complaints within 48 hours and
          resolve them within 30 days of receipt.
        </p>

        <h2>15. Third-Party Platforms &amp; Links</h2>
        <p>
          The Services integrate with third-party platforms (Meta, LinkedIn,
          Google, Dodo Payments, etc.) and may contain links to third-party
          websites. Their privacy practices are governed by their own policies,
          and we are not responsible for them. We encourage you to read those
          policies before connecting an account or sharing data.
        </p>
        <p>
          Where you delete data from SocioGenie, you can also request deletion
          of data we hold from Meta integrations via our{' '}
          <a href="/legal/facebook-data-deletion-instruction">
            Facebook Data Deletion Instructions
          </a>{' '}
          and{' '}
          <a href="/legal/instagram-data-deletion-instruction">
            Instagram Data Deletion Instructions
          </a>
          .
        </p>

        <h2>16. Payments &amp; Currency</h2>
        <p>
          All subscription and Top-Up Credit charges on SocioGenie are billed
          and settled in <strong>United States Dollars (USD)</strong> through
          our Merchant of Record, <strong>Dodo Payments Inc.</strong> Where you
          are eligible for a refund, the refund is issued by Dodo Payments to
          the original payment instrument in USD. The amount actually credited
          to you in your local currency may vary based on exchange rates and
          bank or card-issuer fees over which we have no control. See our{' '}
          <a href="/legal/refund">Refund Policy</a> for full details.
        </p>

        <h2>17. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect
          changes in our practices, technology, legal requirements, or other
          factors. When we make material changes, we will update the “Last
          updated” date at the top of this page and, where required by law,
          provide additional notice (such as an in-app message or email). Your
          continued use of the Services after the changes take effect
          constitutes acceptance of the updated Policy.
        </p>

        <h2>18. Contact Us</h2>
        <p>
          For any questions about this Privacy Policy or our data practices:
        </p>
        <ul>
          <li>
            <strong>Privacy &amp; data requests:</strong>{' '}
            <a href="mailto:founder@magnatex.co">founder@magnatex.co</a>
          </li>
          <li>
            <strong>General support:</strong>{' '}
            <a href="mailto:support@magnatex.co">support@magnatex.co</a>
          </li>
          <li>
            <strong>Sales:</strong>{' '}
            <a href="mailto:sales@magnatex.co">sales@magnatex.co</a>
          </li>
          <li>
            <strong>Website:</strong>{' '}
            <a href="https://www.sociogenie.ai">https://www.sociogenie.ai</a>
          </li>
          <li>
            <strong>Postal:</strong> MAGNATEX LLP, 111, Fortune Business Hub,
            Sola, Nr. Satyamev Elysium, Ahmedabad, Gujarat 380060, India
          </li>
        </ul>
      </LegalDocument>
    </LegalPage>
  );
}
