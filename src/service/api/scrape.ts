import axiosClient from '@/lib/axios';

export const scrapeUrl = async (url: string) => {
  try {
    const response = await axiosClient.post('/api/v1/scrape/dna', { url });
    return response.data;
  } catch (error) {
    throw error;
  }
};
