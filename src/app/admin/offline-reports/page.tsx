import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/ui/LoadingScreen';

const PageClient = dynamic(() => import('./PageClient'), {
  loading: () => <LoadingScreen message="Memuat Laporan Non Payment..." />,
});

export default function Page() {
  return <PageClient />;
}
