import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useUserStore } from '../store/userStore';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useUserStore((state: { user: any }) => state.user);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user) return null;
  return <>{children}</>;
}
