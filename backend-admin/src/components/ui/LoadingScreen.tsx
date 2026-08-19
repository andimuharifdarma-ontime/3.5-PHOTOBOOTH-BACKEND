export function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 border-4 border-[#A68B67] border-t-transparent rounded-full animate-spin" />
      <p className="text-[#4A3F35] font-medium">{message}</p>
    </div>
  );
}

export default LoadingScreen;