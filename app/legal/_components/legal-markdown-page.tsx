import type { LucideIcon } from 'lucide-react';
import type { LegalDocumentId } from '@/content/legal/documents';
import {
  LegalMarkdownContent,
  loadLegalMarkdown,
} from '../_lib/legal-markdown';
import { LegalPage, type IconTone } from './legal-page';

type LegalMarkdownPageProps = {
  document: LegalDocumentId;
  icon: LucideIcon;
  iconTone?: IconTone;
  maxWidth?: 'lg' | 'xl';
};

export function LegalMarkdownPage({
  document,
  icon,
  iconTone,
  maxWidth,
}: LegalMarkdownPageProps) {
  const { title, subtitle, body } = loadLegalMarkdown(document);

  return (
    <LegalPage
      title={title}
      subtitle={subtitle ?? undefined}
      icon={icon}
      iconTone={iconTone}
      maxWidth={maxWidth}
    >
      <LegalMarkdownContent body={body} />
    </LegalPage>
  );
}
