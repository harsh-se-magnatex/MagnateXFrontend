import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { DataDeletionStatus } from '../_components/data-deletion-status';
import { LegalDocument, LegalPage } from '../_components/legal-page';

export default function FacebookDataDeletionPage() {
  return (
    <LegalPage
      title="Facebook Data Deletion Status"
      subtitle="Confirmation for Meta data deletion requests"
      badge="Data deletion"
      icon={ShieldCheck}
      iconTone="blue"
    >
      <DataDeletionStatus platform="Facebook" />

      <LegalDocument>
        <p>
          This page is shown when Meta redirects you after a Facebook data
          deletion request. If you see a confirmation code above, your Facebook
          connection data has been removed from SocioGenie.
        </p>
        <p>
          For step-by-step instructions on deleting Facebook data, see our{' '}
          <Link href="/legal/facebook-data-deletion-instruction">
            Facebook Data Deletion Instructions
          </Link>
          .
        </p>
        <p>
          Questions? Email{' '}
          <a href="mailto:founder@magnatex.co">founder@magnatex.co</a> with your
          SocioGenie account email and confirmation code, if available.
        </p>
      </LegalDocument>
    </LegalPage>
  );
}
