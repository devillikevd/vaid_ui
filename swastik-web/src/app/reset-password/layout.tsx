import { Suspense, ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

/**
 * Layout for reset-password page.
 * Wraps in Suspense because the page uses useSearchParams().
 */
export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
