'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { VisualDnaChoice } from '@/components/brand/VisualDnaChoice';
import { TemplateDnaReferenceSetup } from '@/components/brand/TemplateDnaReferenceSetup';

export default function TemplateDnaPage() {
  const [showExistingPosts, setShowExistingPosts] = useState(false);
  return <div className="mx-auto max-w-6xl pb-20">
    <Link href="/brand-dna" className="mb-6 inline-flex items-center gap-2 text-sm text-secondary hover:text-default"><ArrowLeft className="size-4" />Brand DNA</Link>
    <div className="mb-8"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-purple/10 px-3 py-1 text-xs font-semibold text-primary-purple"><Sparkles className="size-3.5" />Brand consistency</div><h1 className="text-3xl font-bold tracking-tight text-default sm:text-4xl">Template DNA</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">Build one visual identity that carries across Instagram, Facebook, and LinkedIn.</p></div>
    <VisualDnaChoice onGenerated={() => setShowExistingPosts(false)} onLearnFromPosts={() => setShowExistingPosts(true)} />
    {showExistingPosts && <div className="mt-8"><TemplateDnaReferenceSetup /></div>}
  </div>;
}
