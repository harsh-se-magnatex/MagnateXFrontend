import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { LegalDocument, LegalPage } from '../_components/legal-page';
import { WORKSPACE_NAV_HREFS, workspacePageTitle } from '@/lib/workspace-nav';

export default function InstagramDataDeletionInstructionPage() {
  return (
    <LegalPage
      title="Instagram Data Deletion Instructions"
      subtitle="How to remove Instagram data stored by SocioGenie"
      badge="Data deletion"
      icon={Trash2}
      iconTone="pink"
    >
      <LegalDocument>
        <p>
          <strong>SocioGenie</strong> (operated by <strong>MAGNATEX LLP</strong>
          ) lets you connect an Instagram Business account to publish content
          and view insights. This page explains what Instagram-related data we
          store, how you can delete it, and how we handle deletion requests
          initiated through Meta.
        </p>

        <h2>1. Instagram data we store</h2>
        <p>
          When you connect Instagram to SocioGenie, we store only the
          information needed to publish on your behalf and show connection
          status in your account. This may include:
        </p>
        <ul>
          <li>Your Instagram user ID</li>
          <li>Your Instagram username</li>
          <li>Long-lived access tokens and token expiry dates</li>
          <li>Instagram analytics data linked to your SocioGenie account</li>
        </ul>
        <p>
          We do not receive or store your Instagram password. Content you create
          in SocioGenie (drafts, scheduled posts, media) is stored separately
          under your SocioGenie account and is not removed automatically when
          you disconnect Instagram unless you delete that content or your full
          SocioGenie account.
        </p>

        <h2>2. Delete Instagram data inside SocioGenie</h2>
        <p>
          You can disconnect Instagram and remove the connection data listed
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
            Find your connected Instagram account and choose{' '}
            <strong>Disconnect</strong>
          </li>
        </ol>
        <p>
          Disconnecting revokes our access tokens and removes Instagram
          connection fields from your account, including tokens and your
          Instagram user ID stored for that connection.
        </p>

        <h2>3. Delete data through Instagram / Meta</h2>
        <p>
          You can also remove SocioGenie from your Instagram account and request
          deletion of data we received from Instagram:
        </p>
        <ol>
          <li>
            Open{' '}
            <a
              href="https://www.instagram.com/accounts/manage_access/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Apps and Websites
            </a>{' '}
            in your Instagram account settings (or manage connected apps in Meta
            Accounts Center)
          </li>
          <li>
            Select <strong>SocioGenie</strong> (or the app name shown for our
            integration)
          </li>
          <li>
            Choose <strong>Remove</strong> and, when prompted, request deletion
            of data the app received from Instagram
          </li>
        </ol>
        <p>
          When Meta sends us a valid data deletion request, we locate your
          SocioGenie account using your Instagram user ID, delete your{' '}
          <code>instagram</code> social connection document, and remove related
          fields from your user profile (including Instagram connection status,
          selected account settings, and Instagram analytics). Meta may redirect
          you to our{' '}
          <Link href="/legal/instagram-data-deletion">
            Instagram data deletion status page
          </Link>{' '}
          with a confirmation code once processing is complete.
        </p>

        <h2>4. What happens after deletion</h2>
        <ul>
          <li>
            We can no longer publish to Instagram on your behalf or refresh
            Instagram insights for that connection.
          </li>
          <li>
            Posts already published to Instagram remain on Instagram unless you
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
          For help with Instagram data deletion, email{' '}
          <a href="mailto:founder@magnatex.co">founder@magnatex.co</a> with the
          email address tied to your SocioGenie account and, if available, your
          Instagram user ID or confirmation code.
        </p>
        <p>
          See our <Link href="/legal/privacy">Privacy Policy</Link> for broader
          information about how we handle personal data.
        </p>
      </LegalDocument>
    </LegalPage>
  );
}
