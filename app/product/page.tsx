import type { Metadata } from 'next';
import { ProductPageContent } from '@/components/landing/product-page-content';

export const metadata: Metadata = {
  title: 'Product — Sociogenie | How It Works, Features, Pricing & FAQ',
  description:
    'Learn how Sociogenie generates AI content, human-reviews every post, and publishes automatically across Instagram, Facebook, and LinkedIn.',
};

export default function ProductPage() {
  return <ProductPageContent />;
}
