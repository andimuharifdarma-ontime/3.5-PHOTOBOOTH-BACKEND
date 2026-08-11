import dynamic from 'next/dynamic';
import AdminPageSkeleton from '@/components/ui/AdminPageSkeleton';

const CustomizePageClient = dynamic(() => import('./PageClient'), {
  loading: () => <AdminPageSkeleton variant="grid" />,
});

export default function CustomizePage() {
  return <CustomizePageClient />;
}
