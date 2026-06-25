import { PhotoProvider } from '@/store/usePhotoStore';

export default function DownloadLayout({ children }: { children: React.ReactNode }) {
  return <PhotoProvider>{children}</PhotoProvider>;
}
