import AdminLayout from './components/AdminLayout';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Admin Panel Photo Booth',
};

export default function AdminRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AdminLayout>{children}</AdminLayout>;
}
