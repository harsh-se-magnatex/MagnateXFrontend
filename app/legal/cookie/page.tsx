import { Cookie } from 'lucide-react';
import { LegalMarkdownPage } from '../_components/legal-markdown-page';

export default function CookiePolicyPage() {
  return (
    <LegalMarkdownPage
      filename="cookie.md"
      icon={Cookie}
      iconTone="amber"
      maxWidth="xl"
    />
  );
}
