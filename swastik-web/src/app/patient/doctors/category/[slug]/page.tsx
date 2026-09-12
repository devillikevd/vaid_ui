import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/consultationCategoriesData';
import CategoryDetailContent from './CategoryDetailClient';

interface CategoryPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
    const { slug } = await params;
    const cat = getCategoryBySlug(slug);

    if (!cat) {
        return {
            title: 'Specialty Category | Vaididea',
            description: 'Find and consult specialist doctors by medical discipline on Vaididea.',
        };
    }

    return {
        title: `${cat.title} Specialist Doctors — Online & In-Clinic | Vaididea`,
        description: cat.shortIntro || `Book appointments with certified ${cat.title} specialists on the Vaididea healthcare platform.`,
        alternates: {
            canonical: `/patient/doctors/category/${slug}`,
        },
    };
}

export default async function CategoryDetailPage({ params }: CategoryPageProps) {
    const { slug } = await params;

    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
        notFound();
    }

    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-stone-50 flex items-center justify-center p-8 text-center text-stone-400 font-sans">
                    <div className="space-y-3">
                        <div className="w-8 h-8 border-3 border-vd-forest border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-xs font-medium text-stone-500">Loading specialty details...</p>
                    </div>
                </div>
            }
        >
            <CategoryDetailContent slug={slug} />
        </Suspense>
    );
}
