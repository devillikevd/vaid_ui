import { Suspense, ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <div className="animate-spin h-8 w-8 border-4 border-stone-300 border-t-vd-forest rounded-full" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
