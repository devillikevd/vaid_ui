'use client';

import dynamic from 'next/dynamic';

export const GlobalSocketToastsDynamic = dynamic(
    () => import('./GlobalSocketToasts'),
    { ssr: false }
);
