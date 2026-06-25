import AdminLayout from './components/AdminLayout';
import { AdminProfileProvider } from '@/contexts/AdminProfileContext';
import { SwrProvider } from '@/components/providers/SwrProvider';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Admin Panel Photo Booth',
};

export default function AdminRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SwrProvider>
            <AdminProfileProvider>
                <AdminLayout>{children}</AdminLayout>
            </AdminProfileProvider>
        </SwrProvider>
    );
}
