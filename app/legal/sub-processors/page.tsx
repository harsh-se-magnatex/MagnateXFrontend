import { Network } from 'lucide-react';
import { LegalMarkdownPage } from '../_components/legal-markdown-page';

export default function SubProcessorsPage() {
  return (
    <LegalMarkdownPage
      document="sub-processors"
      icon={Network}
      iconTone="sky"
      maxWidth="xl"
    />
  );
}
