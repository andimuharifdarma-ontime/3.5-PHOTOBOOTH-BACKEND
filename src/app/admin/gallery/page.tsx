import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/ui/LoadingScreen';

const PageClient = dynamic(() => import('./PageClient'), {
  loading: () => <LoadingScreen message="Memuat Galeri..." />,
});

export default function Page() {
  return <PageClient />;
}
