import type { Metadata } from 'next';
import Link from 'next/link';
import VaidideaLogo from '@/components/shared/VaidideaLogo';
import { Home, Stethoscope, Activity, BookOpen, Building2 } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Page Not Found',
    description: 'The requested healthcare resource could not be found on Vaididea.',
    robots: {
        index: false,
        follow: false,
        nocache: true,
        noarchive: true,
    },
};

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4] dark:bg-[#080e1a] p-4 text-stone-900 dark:text-stone-100 selection:bg-vd-forest selection:text-white">
            <div className="max-w-xl w-full text-center space-y-8 bg-white dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 rounded-3xl p-8 sm:p-12 shadow-xl shadow-stone-900/5 backdrop-blur-sm">
                <div className="flex justify-center">
                    <Link href="/" className="inline-flex items-center gap-2 group">
                        <VaidideaLogo className="w-10 h-10 text-vd-forest group-hover:scale-105 transition-transform" />
                        <span className="font-heading font-black text-2xl tracking-tight text-vd-forest uppercase">
                            VAIDIDEA
                        </span>
                    </Link>
                </div>

                <div className="space-y-3">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-vd-forest dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Error 404 &bull; Resource Not Found
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-white tracking-tight">
                        Looking for healthcare?
                    </h1>
                    <p className="text-sm sm:text-base text-stone-600 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
                        The page or healthcare service you are looking for doesn&apos;t exist, has been relocated, or is temporarily unavailable.
                    </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                        href="/"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-full font-bold text-sm transition-all shadow-md shadow-vd-forest/20 hover:shadow-lg hover:shadow-vd-forest/30"
                    >
                        <Home className="w-4 h-4" />
                        <span>Return to Homepage</span>
                    </Link>
                    <Link
                        href="/doctors"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-full font-bold text-sm transition-all border border-stone-200 dark:border-stone-700"
                    >
                        <Stethoscope className="w-4 h-4 text-vd-forest" />
                        <span>Find Verified Doctors</span>
                    </Link>
                </div>

                <div className="pt-6 border-t border-stone-100 dark:border-stone-800">
                    <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-3">
                        Popular Directories
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Link
                            href="/specialties"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-vd-forest hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                        >
                            <Activity className="w-3.5 h-3.5" />
                            Specialties
                        </Link>
                        <span className="text-stone-300 dark:text-stone-700">&bull;</span>
                        <Link
                            href="/health-library"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-vd-forest hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            Health Library
                        </Link>
                        <span className="text-stone-300 dark:text-stone-700">&bull;</span>
                        <Link
                            href="/providers"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-vd-forest hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                        >
                            <Building2 className="w-3.5 h-3.5" />
                            For Providers
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
