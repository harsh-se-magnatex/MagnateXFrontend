import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { LegalDocument, LegalPage } from '../_components/legal-page';
import {
  WORKSPACE_NAV_HREFS,
  workspacePageTitle,
} from '@/lib/workspace-nav';

export default function FacebookDataDeletionInstructionPage() {
  return (
    <LegalPage
      title="Facebook Data Deletion Instructions"
      subtitle="How to remove Facebook data stored by SocioGenie"
      badge="Data deletion"
      icon={Trash2}
      iconTone="blue"
    >
      <LegalDocument>
        <p>
          <strong>SocioGenie</strong> (operated by <strong>MAGNATEX LLP</strong>
          ) lets you connect a Facebook account to publish and manage content on
          Facebook Pages. This page explains what Facebook-related data we store,
          how you can delete it, and how we handle deletion requests initiated
          through Meta.
        </p>

        <h2>1. Facebook data we store</h2>
        <p>
          When you connect Facebook to SocioGenie, we store only the information
          needed to publish on your behalf and show connection status in your
          account. This may include:
        </p>
        <ul>
          <li>Your Facebook user ID</li>
          <li>Long-lived access tokens and token expiry dates</li>
          <li>
            Facebook Pages you manage (page ID, page name, and page access
            tokens)
          </li>
          <li>Your selected Facebook Page for publishing</li>
          <li>Facebook analytics data linked to your SocioGenie account</li>
        </ul>
        <p>
          We do not receive or store your Facebook password. Content you create
          in SocioGenie (drafts, scheduled posts, media) is stored separately
          under your SocioGenie account and is not removed automatically when
          you disconnect Facebook unless you delete that content or your full
          SocioGenie account.
        </p>

        <h2>2. Delete Facebook data inside SocioGenie</h2>
        <p>
          You can disconnect Facebook and remove the connection data listed
          above at any time:
        </p>
        <ol>
          <li>
            Sign in to{' '}
            <Link href="https://www.sociogenie.ai">www.sociogenie.ai</Link>
          </li>
          <li>
            Open{' '}
            <Link href={WORKSPACE_NAV_HREFS.linkedProfiles}>
              {workspacePageTitle(WORKSPACE_NAV_HREFS.linkedProfiles)}
            </Link>
          </li>
          <li>
            Find your connected Facebook account and choose{' '}
            <strong>Disconnect</strong>
          </li>
        </ol>
        <p>
          Disconnecting revokes our access tokens and removes Facebook
          connection fields from your account, including tokens, and page details,
          stored for that connection.
        </p>

        <h2>3. Delete data through Facebook / Meta</h2>
        <p>
          You can also remove SocioGenie from your Facebook account and request
          deletion of data we received from Facebook:
        </p>
        <ol>
          <li>
            Go to your Facebook account{' '}
            <a
              href="https://www.facebook.com/settings?tab=applications"
              target="_blank"
              rel="noopener noreferrer"
            >
              Apps and Websites settings
            </a>
          </li>
          <li>
            Select <strong>SocioGenie</strong> (or the app name shown for our
            integration)
          </li>
          <li>
            Choose <strong>Remove</strong> and, when prompted, request deletion
            of data the app received from Facebook
          </li>
        </ol>
        <p>
          When Meta sends us a valid data deletion request, we locate your
          SocioGenie account using your Facebook user ID, delete your{' '}
          <code>facebook</code> social connection document, and remove related
          fields from your user profile (including Facebook connection status,
          selected page settings, and Facebook analytics). Meta may redirect you
          to our{' '}
          <Link href="/legal/facebook-data-deletion">
            Facebook data deletion status page
          </Link>{' '}
          with a confirmation code once processing is complete.
        </p>

        <h2>4. What happens after deletion</h2>
        <ul>
          <li>
            We can no longer publish to Facebook on your behalf or refresh
            Facebook insights for that connection.
          </li>
          <li>
            Posts already published to Facebook remain on Facebook unless you
            remove them there.
          </li>
          <li>
            If you only removed app authorization (deauthorization) without a
            full deletion request, we remove active tokens but may retain
            non-token connection metadata until you disconnect in SocioGenie or
            submit a full deletion request.
          </li>
        </ul>

        <h2>5. Contact us</h2>
        <p>
          For help with Facebook data deletion, email{' '}
          <a href="mailto:founder@magnatex.co">founder@magnatex.co</a> with the
          email address tied to your SocioGenie account and, if available, your
          Facebook user ID or confirmation code.
        </p>
        <p>
          See our <Link href="/legal/privacy">Privacy Policy</Link> for broader
          information about how we handle personal data.
        </p>
      </LegalDocument>
    </LegalPage>
  );
}
