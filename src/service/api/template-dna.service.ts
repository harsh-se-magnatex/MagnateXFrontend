import axiosClient from '@/lib/axios';

export type TemplateDnaPlatform = 'instagram' | 'facebook' | 'linkedin';
export type DesignFinding = { value: any; confidence: 'high' | 'medium' | 'low'; state: 'observed' | 'not_observed' | 'inconsistent' | 'uncertain'; evidenceImageIds: string[]; observedRange: { min: number; max: number } | null };
export type TemplateDesign = Record<string, any>;
export type CompatibleVisualConfiguration = { schema: Record<string, any>; imageModifiers: string; imageAvoid: string };
export type TemplateDnaProfile = {
  schemaVersion: 1 | 2 | 3; revision: number; platform: TemplateDnaPlatform; enabled: boolean;
  status: 'idle' | 'needs_reextraction' | 'extracting' | 'ready' | 'failed';
  referenceAssets: Array<{ id: string; storagePath: string; mimeType: string }>;
  design?: TemplateDesign; needsMeasurementExtraction?: boolean; extractionId?: string | null;
  format?: 'style-preset-v1'; basePresetId?: string; capturedSchema?: Record<string, any>; visualConfiguration?: CompatibleVisualConfiguration | null;
  typography: { value: any }; colors: { value: any }; composition: { value: any }; background: { value: any }; imagery: { value: any }; graphicElements: { value: any }; branding: { value: any }; onImageCopyPattern: { value: any }; visualCharacter: { value: any };
  layoutVariants: Array<{ id: string; name: string; suitableUse: string | null; compositionOverrides: string | null; styleOverrides: string | null; supportingImageIds: string[]; overrides?: TemplateDesign }>;
  extractionModel: string | null; updatedAt: string; extractedAt: string | null; lastError?: string | null;
};
export type VisualStyleStatus = { source: 'brand' | 'template_dna'; platforms: Array<{ platform: string; source: 'brand' | 'template_dna'; fallbackReason: string | null }> };
export type GeneratedVisualStyle = {
  label: string;
  selectedPresetId: string;
  fields: { font: string; style: string; fontColor: string; fontSize: string };
  revision: number;
  updatedAt: string;
};
export async function getVisualStyle() { return (await axiosClient.get<ApiEnvelope<VisualStyleStatus>>('/api/v1/template-dna/style-source')).data.data; }
export async function setVisualStyle(source: VisualStyleStatus['source']) { await axiosClient.patch('/api/v1/template-dna/style-source', { source }); return getVisualStyle(); }
export async function getGeneratedVisualStyle() { return (await axiosClient.get<ApiEnvelope<GeneratedVisualStyle | null>>('/api/v1/template-dna/create-your-own')).data.data; }
export async function generateVisualStyle(selectedPresetId: string, business?: Record<string, unknown>) { return (await axiosClient.post<ApiEnvelope<GeneratedVisualStyle>>('/api/v1/template-dna/create-your-own/generate', { selectedPresetId, business })).data.data; }
export async function getReferencePreview(platform: string, id: string) { return (await axiosClient.get<Blob>(`/api/v1/template-dna/${platform}/references/${id}/preview`, { responseType: 'blob' })).data; }

type ApiEnvelope<T> = { data: T };
export async function getTemplateDna(platform?: TemplateDnaPlatform) { const response = await axiosClient.get<ApiEnvelope<TemplateDnaProfile | TemplateDnaProfile[]>>('/api/v1/template-dna', { params: platform ? { platform } : undefined }); return response.data.data; }
export async function uploadTemplateDnaReferences(platform: TemplateDnaPlatform, files: File[]) { const form = new FormData(); files.forEach((file) => form.append('references', file)); const response = await axiosClient.post<ApiEnvelope<TemplateDnaProfile>>(`/api/v1/template-dna/${platform}/references`, form); return response.data.data; }
export async function extractTemplateDna(platform: TemplateDnaPlatform) {
  const response = await axiosClient.post<ApiEnvelope<TemplateDnaProfile>>(`/api/v1/template-dna/${platform}/extract`, {}, { timeout: 30 * 1000 });
  let profile = response.data.data;
  const started = Date.now();
  while (profile.status === 'extracting' && Date.now() - started < 25 * 60 * 1000) {
    await new Promise(resolve => setTimeout(resolve, 2500));
    profile = (await axiosClient.get<ApiEnvelope<TemplateDnaProfile>>('/api/v1/template-dna', { params: { platform } })).data.data;
  }
  if (profile.status === 'extracting') throw new Error('Extraction is still running. Refresh this page shortly to see the result.');
  if (profile.status === 'failed') throw new Error(profile.lastError || 'Template DNA extraction failed.');
  return profile;
}
export async function updateTemplateDna(platform: TemplateDnaPlatform, profile: Partial<TemplateDnaProfile>) { const response = await axiosClient.patch<ApiEnvelope<TemplateDnaProfile>>(`/api/v1/template-dna/${platform}`, { profile }); return response.data.data; }
export async function removeTemplateDnaReference(platform: TemplateDnaPlatform, assetId: string) { const response = await axiosClient.delete<ApiEnvelope<TemplateDnaProfile>>(`/api/v1/template-dna/${platform}/references/${assetId}`); return response.data.data; }
