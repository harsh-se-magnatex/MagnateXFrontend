import { Cookie } from 'lucide-react';
import { LegalDocument, LegalPage, LegalPanel } from '../_components/legal-page';

type CookieRow = {
  name: string;
  provider: string;
  purpose: string;
  type: 'Strictly necessary' | 'Analytics' | 'Functional' | 'Marketing';
  duration: string;
};

const COOKIES: CookieRow[] = [
  {
    name: 'sg-cookie-consent',
    provider: 'SocioGenie (first-party, localStorage)',
    purpose:
      'Stores your cookie consent preferences (necessary / analytics / marketing) so we do not ask you again on every page load.',
    type: 'Strictly necessary',
    duration: 'Until you clear browser storage or change your choice',
  },
  {
    name: 'firebase:authUser:* / firebaseLocalStorageDb',
    provider: 'Google Firebase (first-party, IndexedDB & localStorage)',
    purpose:
      'Keeps you signed in to your SocioGenie account after authentication. Without these you would have to log in on every page.',
    type: 'Strictly necessary',
    duration: 'Until you log out or the session expires (up to 1 year)',
  },
  {
    name: '__session',
    provider: 'Google Firebase Hosting (first-party)',
    purpose:
      'Securely transports your authenticated session between the browser and server-side rendering.',
    type: 'Strictly necessary',
    duration: 'Session',
  },
  {
    name: 'sidebar:state',
    provider: 'SocioGenie (first-party)',
    purpose:
      'Remembers whether the in-app navigation sidebar is collapsed or expanded on the dashboard.',
    type: 'Functional',
    duration: '7 days',
  },
  {
    name: '_ga',
    provider: 'Google Analytics 4 (first-party, set via gtag/Firebase Analytics)',
    purpose:
      'Distinguishes unique visitors for aggregated product analytics and bug-free deployment.',
    type: 'Analytics',
    duration: '2 years',
  },
  {
    name: '_ga_<measurement-id>',
    provider: 'Google Analytics 4 (first-party)',
    purpose:
      'Persists session state for Google Analytics 4 across page navigations.',
    type: 'Analytics',
    duration: '2 years',
  },
  {
    name: '_gid',
    provider: 'Google Analytics 4 (first-party, legacy)',
    purpose:
      'Distinguishes users for short-lived analytics; not always set in GA4 deployments.',
    type: 'Analytics',
    duration: '24 hours',
  },
  {
    name: '_gat',
    provider: 'Google Analytics 4 (first-party)',
    purpose:
      'Throttles the rate of requests sent to Google Analytics to protect performance.',
    type: 'Analytics',
    duration: '1 minute',
  },
];

const TYPE_STYLES: Record<CookieRow['type'], string> = {
  'Strictly necessary': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Functional: 'bg-sky-50 text-sky-700 border-sky-200',
  Analytics: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Marketing: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      subtitle="Effective date: 28 May 2026 · Last updated: 28 May 2026"
      icon={Cookie}
      iconTone="amber"
      maxWidth="xl"
    >
      <LegalDocument>
        <p>
          This Cookie Policy describes how <strong>MAGNATEX LLP</strong> (the
          publisher of <strong>SocioGenie</strong>) uses cookies and similar
          technologies on{' '}
          <a href="https://www.sociogenie.ai">www.sociogenie.ai</a> and
          throughout the SocioGenie application. It supplements our{' '}
          <a href="/legal/privacy">Privacy Policy</a> and applies to all
          visitors and registered users.
        </p>

        <h2>1. What are cookies and similar technologies?</h2>
        <p>
          Cookies are small text files that websites store on your device to
          remember information about you. We also use other client-side
          storage technologies (such as the browser&apos;s{' '}
          <code>localStorage</code> and <code>IndexedDB</code>) for the same
          purposes. For brevity, we refer to all of these collectively as
          &ldquo;cookies&rdquo; in this Policy.
        </p>

        <h2>2. Why we use them</h2>
        <ul>
          <li>
            <strong>To keep you signed in</strong> — Firebase Authentication
            stores a session identifier so you do not have to log in on every
            page.
          </li>
          <li>
            <strong>To remember your preferences</strong> — for example,
            whether the sidebar is collapsed or your cookie-consent choices.
          </li>
          <li>
            <strong>To measure product usage</strong> — via Google Analytics 4
            (set up through Firebase Analytics) so we can fix bugs, improve
            performance, and prioritise new features.
          </li>
          <li>
            <strong>To safeguard the platform</strong> — protect your account
            from abuse and detect anomalous behaviour.
          </li>
        </ul>

        <h2>3. Categories of cookies we use</h2>
        <ul>
          <li>
            <strong>Strictly necessary cookies</strong> — required for the
            Services to function (authentication, security, load-balancing).
            These cannot be disabled because the Services would not work
            without them.
          </li>
          <li>
            <strong>Functional cookies</strong> — remember interface
            preferences such as sidebar state. Disabling these reduces
            convenience but does not break the Services.
          </li>
          <li>
            <strong>Analytics cookies</strong> — measure how the Services are
            used. Loaded only after you give consent via the cookie banner
            (where consent is legally required).
          </li>
          <li>
            <strong>Marketing cookies</strong> — set by advertising or
            re-targeting networks. SocioGenie does{' '}
            <strong>not currently</strong> place marketing or advertising
            cookies. If we add any in the future we will update this Policy and
            request fresh consent.
          </li>
        </ul>

        <h2>4. The specific cookies we set</h2>
        <p>
          The list below is current as of the &ldquo;Last updated&rdquo; date
          above. Cookie names from Google and Firebase may change as those
          libraries are updated.
        </p>
      </LegalDocument>

      <LegalPanel>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Provider</th>
                <th>Purpose</th>
                <th>Category</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {COOKIES.map((c) => (
                <tr key={c.name}>
                  <td className="font-mono text-xs text-slate-900 whitespace-nowrap">
                    {c.name}
                  </td>
                  <td className="min-w-[180px]">{c.provider}</td>
                  <td className="min-w-[220px]">{c.purpose}</td>
                  <td className="whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TYPE_STYLES[c.type]}`}
                    >
                      {c.type}
                    </span>
                  </td>
                  <td className="min-w-[140px]">{c.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalPanel>

      <LegalDocument>
        <h2>5. Third-party cookies</h2>
        <p>
          Some cookies are placed by third parties whose services we use to run
          SocioGenie:
        </p>
        <ul>
          <li>
            <strong>Google LLC</strong> — Google Analytics 4, Firebase
            Authentication, Firebase Hosting, Firebase Analytics. Google may
            process the data described above as a joint controller for
            cross-product personalisation only where you have separately opted
            in via your Google account.
          </li>
          <li>
            <strong>Dodo Payments Inc.</strong> — when you make a payment, you
            are redirected to a Dodo Payments checkout page. Dodo sets its own
            cookies necessary for the payment to complete and for fraud
            prevention. Those cookies are governed by{' '}
            <em>Dodo Payments&apos; own Privacy and Cookie Policy</em>.
          </li>
        </ul>

        <h2>6. Legal basis</h2>
        <ul>
          <li>
            <strong>Strictly necessary cookies</strong> are set on the basis
            of our legitimate interest in providing the Services you have
            requested, and under the “strictly necessary” exemption in EU
            ePrivacy law and Section 4(8) of India&apos;s IT Rules 2011.
          </li>
          <li>
            <strong>Analytics and marketing cookies</strong> are set only on
            the basis of your <strong>prior consent</strong>, which you give
            via the cookie banner that appears on your first visit. Consent is
            specific, informed, and unambiguous, and may be withdrawn at any
            time.
          </li>
        </ul>

        <h2>7. How to manage your cookies</h2>
        <ul>
          <li>
            <strong>On SocioGenie:</strong> Use the cookie banner that appears
            on your first visit, or re-open it later by clearing the{' '}
            <code>sg-cookie-consent</code> entry in your browser&apos;s site
            data. You can accept all, reject all, or fine-tune by category.
          </li>
          <li>
            <strong>In your browser:</strong> Most browsers let you block or
            delete cookies from settings. Doing so will sign you out of
            SocioGenie and may break parts of the application. Browser-vendor
            guides:{' '}
            <a
              href="https://support.google.com/chrome/answer/95647"
              target="_blank"
              rel="noreferrer noopener"
            >
              Chrome
            </a>
            ,{' '}
            <a
              href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
              target="_blank"
              rel="noreferrer noopener"
            >
              Firefox
            </a>
            ,{' '}
            <a
              href="https://support.apple.com/guide/safari/manage-cookies-sfri11471"
              target="_blank"
              rel="noreferrer noopener"
            >
              Safari
            </a>
            ,{' '}
            <a
              href="https://support.microsoft.com/help/4027947"
              target="_blank"
              rel="noreferrer noopener"
            >
              Edge
            </a>
            .
          </li>
          <li>
            <strong>Opt out of Google Analytics globally:</strong> install
            Google&apos;s{' '}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noreferrer noopener"
            >
              GA opt-out browser add-on
            </a>
            .
          </li>
        </ul>

        <h2>8. Do Not Track</h2>
        <p>
          There is no industry consensus on browser “Do Not Track” headers; we
          do not currently respond to DNT signals.
        </p>

        <h2>9. Changes to this Policy</h2>
        <p>
          We may update this Cookie Policy from time to time to reflect new
          cookies, vendor changes, or legal requirements. Material changes
          will be reflected by updating the &ldquo;Last updated&rdquo; date
          at the top, and where required by law we will re-prompt for consent.
        </p>

        <h2>10. Contact</h2>
        <ul>
          <li>
            <strong>Privacy / cookie queries:</strong>{' '}
            <a href="mailto:founder@magnatex.co">founder@magnatex.co</a>
          </li>
          <li>
            <strong>Support:</strong>{' '}
            <a href="mailto:support@magnatex.co">support@magnatex.co</a>
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
