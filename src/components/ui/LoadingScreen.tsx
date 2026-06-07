'use client';

interface LoadingScreenProps {
    message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
            <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-2 border-[#A68B67]/20 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-[#A68B67] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A68B67] animate-pulse">{message}</p>
        </div>
    );
}
