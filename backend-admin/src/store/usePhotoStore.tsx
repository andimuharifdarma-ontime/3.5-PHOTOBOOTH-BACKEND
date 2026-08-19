import { create } from 'zustand';

interface PhotoState {
  photos: any[];
  currentPhoto: any | null;
  addPhoto: (photo: any) => void;
  setCurrentPhoto: (photo: any) => void;
  clearPhotos: () => void;
}

export const usePhotoStore = create<PhotoState>((set) => ({
  photos: [],
  currentPhoto: null,
  addPhoto: (photo) => set((state) => ({ photos: [...state.photos, photo] })),
  setCurrentPhoto: (photo) => set({ currentPhoto: photo }),
  clearPhotos: () => set({ photos: [], currentPhoto: null }),
}));