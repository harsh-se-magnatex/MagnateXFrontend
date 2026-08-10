import { Cookie } from 'lucide-react';
import { LegalMarkdownPage } from '../_components/legal-markdown-page';

export default function CookiePolicyPage() {
  return (
    <LegalMarkdownPage
      document="cookie"
      icon={Cookie}
      iconTone="amber"
      maxWidth="xl"
    />
  );
}
