'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface VaidideaLogoProps {
  className?: string;
  isLink?: boolean;
  href?: string;
  ariaLabel?: string;
}

export default function VaidideaLogo({
  className,
  isLink = false,
  href = '/',
  ariaLabel = 'Vaididea Home',
}: VaidideaLogoProps) {
  const content = (
    <div className={`relative flex items-center justify-center aspect-square ${className || ''}`}>
      <Image
        src="/logo.png"
        alt="Vaididea Logo"
        fill
        priority
        className="object-contain"
      />
    </div>
  );

  if (isLink) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        className="inline-flex items-center justify-center cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg transition-transform hover:scale-105"
      >
        {content}
      </Link>
    );
  }

  return content;
}

interface VaidideaBrandProps {
  className?: string;
  logoClassName?: string;
  textClassName?: string;
  href?: string;
  ariaLabel?: string;
  wordmark?: string;
}

export function VaidideaBrand({
  className = '',
  logoClassName = 'w-9 h-9',
  textClassName = 'text-xl font-bold tracking-tight text-white uppercase',
  href = '/',
  ariaLabel = 'Vaididea Home',
  wordmark = 'VAIDIDEA',
}: VaidideaBrandProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-2.5 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg transition-all ${className}`}
    >
      <div className="transition-transform duration-200 group-hover:scale-105 shrink-0">
        <VaidideaLogo className={logoClassName} />
      </div>
      {wordmark && (
        <span className={`transition-colors duration-200 ${textClassName}`}>
          {wordmark}
        </span>
      )}
    </Link>
  );
}
