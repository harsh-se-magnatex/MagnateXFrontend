import { ShieldAlert } from 'lucide-react';
import { LegalMarkdownPage } from '../_components/legal-markdown-page';

export default function AcceptableUsePolicyPage() {
  return <LegalMarkdownPage document="acceptable-use" icon={ShieldAlert} />;
}
