import Image from "next/image";

interface VaidideaLogoProps {
  className?: string;
  /** Width in pixels (default 32) */
  size?: number;
}

/**
 * Shared Vaididea logo component using the PNG brand mark.
 * Use this everywhere a logo icon is needed for consistency.
 */
export default function VaidideaLogo({ className = "w-8 h-8", size = 64 }: VaidideaLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Vaididea Logo"
      width={size}
      height={size}
      className={className}
      priority
      style={{ objectFit: "contain" }}
    />
  );
}
