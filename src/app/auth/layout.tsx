'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect authenticated users to browse
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/browse');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-white/60">Ładowanie...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show loading until redirect happens
  if (isAuthenticated) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-white/60">Przekierowuję...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
