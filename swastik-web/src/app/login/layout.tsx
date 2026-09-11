import { Suspense, ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

/**
 * Layout for login pages.
 * Wraps children in Suspense because login pages use useSearchParams().
 */
export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="animate-spin h-8 w-8 border-4 border-slate-300 border-t-blue-600 rounded-full" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
