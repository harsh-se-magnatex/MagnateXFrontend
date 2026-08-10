import { ScrollText } from 'lucide-react';
import { LegalMarkdownPage } from '../_components/legal-markdown-page';

export default function PrivacyPolicyPage() {
  return <LegalMarkdownPage filename="privacy.md" icon={ScrollText} />;
}
