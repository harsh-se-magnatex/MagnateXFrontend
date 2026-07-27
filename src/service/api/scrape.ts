import { apiPost } from '@/lib/api-client';
import { normalizeWebsiteUrl } from '@/utils/normalizeWebsiteUrl';

export const scrapeUrl = async (url: string) => {
  return apiPost('/api/v1/scrape/dna', { url: normalizeWebsiteUrl(url) });
};

export const extractCatalogPdf = async (file: File) => {
  const form = new FormData();
  form.append('catalog', file);
  // Do not set Content-Type — axios must add the multipart boundary automatically.
  return apiPost('/api/v1/scrape/catalog', form);
};
