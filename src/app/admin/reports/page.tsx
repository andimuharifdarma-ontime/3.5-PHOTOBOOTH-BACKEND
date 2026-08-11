import dynamic from 'next/dynamic';
import AdminPageSkeleton from '@/components/ui/AdminPageSkeleton';

const PageClient = dynamic(() => import('./PageClient'), {
  loading: () => <AdminPageSkeleton />,
});

export default function Page() {
  return <PageClient />;
}
