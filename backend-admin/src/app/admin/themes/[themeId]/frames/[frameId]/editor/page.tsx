import dynamic from 'next/dynamic';
import AdminPageSkeleton from '@/components/ui/AdminPageSkeleton';

const EditorPageClient = dynamic(() => import('./PageClient'), {
  loading: () => <AdminPageSkeleton variant="grid" />,
});

export default function EditorPage() {
  return <EditorPageClient />;
}
