import { Network } from 'lucide-react';
import { LegalMarkdownPage } from '../_components/legal-markdown-page';

export default function SubProcessorsPage() {
  return (
    <LegalMarkdownPage
      filename="sub-processors.md"
      icon={Network}
      iconTone="sky"
      maxWidth="xl"
    />
  );
}
