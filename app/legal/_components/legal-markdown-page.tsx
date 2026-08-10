import type { LucideIcon } from 'lucide-react';
import {
  LegalMarkdownContent,
  loadLegalMarkdown,
} from '../_lib/legal-markdown';
import { LegalPage, type IconTone } from './legal-page';

type LegalMarkdownPageProps = {
  filename: string;
  icon: LucideIcon;
  iconTone?: IconTone;
  maxWidth?: 'lg' | 'xl';
};

export function LegalMarkdownPage({
  filename,
  icon,
  iconTone,
  maxWidth,
}: LegalMarkdownPageProps) {
  const { title, subtitle, body } = loadLegalMarkdown(filename);

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
