import { ShieldAlert } from 'lucide-react';
import { LegalMarkdownPage } from '../_components/legal-markdown-page';

export default function AcceptableUsePolicyPage() {
  return <LegalMarkdownPage filename="acceptable-use.md" icon={ShieldAlert} />;
}
