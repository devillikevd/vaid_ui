import Image from "next/image";

export default function VaidideaLogo({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center aspect-square ${className || ""}`}>
      <Image
        src="/logo.png"
        alt="Vaididea Logo"
        fill
        priority
        className="object-contain"
      />
    </div>
  );
}
