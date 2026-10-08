import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GuideArticle } from '@/components/guides/GuideArticle';
import { guideMetadata } from '@/components/guides/guide-metadata';
import { clusterGuides, getGuide } from '@/lib/guides';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return clusterGuides().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  return guide && guide.kind === 'guide' ? guideMetadata(guide) : {};
}

export default async function GuidePage({ params }: Props) {
  const guide = getGuide((await params).slug);
  if (!guide || guide.kind !== 'guide') notFound();
  return <GuideArticle guide={guide} />;
}
