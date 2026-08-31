// src/store/useUploadStore.ts

import { create } from 'zustand';
import { get, set, del } from 'idb-keyval';

export interface PendingImage {
  id: string;
  file: File;
  description: string;
  previewUrl: string;
  uploading?: boolean;
  failed?: boolean;
}

interface StoredPendingImage {
  id: string;
  file: File;
  description: string;
}

interface UploadState {
  pendingImages: PendingImage[];

  addImages: (images: StoredPendingImage[]) => void;
  removeImage: (id: string) => Promise<void>;
  clearImages: () => Promise<void>;
  updateImage: (
    id: string,
    updates: Partial<Pick<PendingImage, 'description' | 'uploading' | 'failed'>>
  ) => void;
  hydrate: () => Promise<void>;
}

const STORAGE_KEY = 'sociogenie-pending-images';

const uploadStorage = {
  async get(): Promise<StoredPendingImage[]> {
    return (await get(STORAGE_KEY)) ?? [];
  },

  async set(images: StoredPendingImage[]) {
    await set(STORAGE_KEY, images);
  },

  async clear() {
    await del(STORAGE_KEY);
  },
};

export const useUploadStore = create<UploadState>((setState, getState) => ({
  pendingImages: [],

  addImages: (images) => {
    const current = getState().pendingImages;

    const newImages: PendingImage[] = images.map((image) => ({
      ...image,
      previewUrl: URL.createObjectURL(image.file),
    }));

    setState({
      pendingImages: [...current, ...newImages],
    });

    void uploadStorage.set(
      [...current, ...images].map(({ id, file, description }) => ({
        id,
        file,
        description,
      }))
    );
  },
  updateImage: (id, updates) => {
    const current = getState().pendingImages;

    const updated = current.map((image) =>
      image.id === id ? { ...image, ...updates } : image
    );

    setState({
      pendingImages: updated,
    });

    void uploadStorage.set(
      updated.map(({ id, file, description }) => ({
        id,
        file,
        description,
      }))
    );
  },
  removeImage: async (id) => {
    const current = getState().pendingImages;
    const image = current.find((item) => item.id === id);

    if (image) {
      URL.revokeObjectURL(image.previewUrl);
    }

    const remaining = current.filter((item) => item.id !== id);

    setState({
      pendingImages: remaining,
    });

    await uploadStorage.set(
      remaining.map(({ id, file, description }) => ({
        id,
        file,
        description,
      }))
    );
  },

  clearImages: async () => {
    const current = getState().pendingImages;

    for (const image of current) {
      URL.revokeObjectURL(image.previewUrl);
    }

    setState({
      pendingImages: [],
    });

    await uploadStorage.clear();
  },

  hydrate: async () => {
    const stored = await uploadStorage.get();

    const restored: PendingImage[] = stored.map((image) => ({
      ...image,
      previewUrl: URL.createObjectURL(image.file),
    }));

    setState({
      pendingImages: restored,
    });
  },
}));
