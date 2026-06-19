// EDIT_PHOTO_DISABLED — preserved for Edit_Photo_V1 branch; re-enable with page integrations.
// import axiosClient from '@/lib/axios';
// import { apiPost } from '@/lib/api-client';
// import type { CreativeDesignDocument } from '@/lib/creative-design/types';
//
// type ApiEnvelope<T> = {
//   success: boolean;
//   statusCode: number;
//   message: string;
//   data: T;
// };
//
// export async function saveCreativeDesign(params: {
//   designJson: CreativeDesignDocument;
//   exportedPngBase64: string;
//   scheduledPostId?: string;
//   mediaLibraryDocId?: string;
//   mediaLibraryCollection?: string;
//   platform?: string;
// }): Promise<{ imageUrl: string; imageFilePath: string; designJson: CreativeDesignDocument }> {
//   const res = await apiPost<ApiEnvelope<{ imageUrl: string; imageFilePath: string; designJson: CreativeDesignDocument }>>(
//     '/api/v1/creative-design/save',
//     params
//   );
//   return res.data;
// }
//
// export async function loadCreativeDesign(postId: string) {
//   const res = await axiosClient.get<ApiEnvelope<Record<string, unknown>>>(
//     `/api/v1/creative-design/${postId}`
//   );
//   return res.data.data;
// }

export {};
