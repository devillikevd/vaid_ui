"use client";

import { motion } from "framer-motion";

const ICONS = [
  {
    top: "12%",
    left: "7%",
    delay: 0,
    path: <path d="M12 3v18M3 12h18" />,
  },
  {
    top: "22%",
    left: "88%",
    delay: 1.4,
    path: (
      <>
        <circle cx="8" cy="8" r="3" />
        <circle cx="16" cy="8" r="3" />
        <circle cx="12" cy="16" r="3" />
        <path d="m10.5 9.5 1 3M13.5 9.5l-1 3" />
      </>
    ),
  },
  {
    top: "58%",
    left: "9%",
    delay: 0.8,
    path: (
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    ),
  },
  {
    top: "74%",
    left: "84%",
    delay: 2.2,
    path: (
      <>
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M10 7h4M10 11h4M10 15h4" />
      </>
    ),
  },
  {
    top: "42%",
    left: "92%",
    delay: 1.1,
    path: (
      <>
        <path d="M9 3h6M10 3v5l-4 8a3 3 0 0 0 2.7 5h6.6A3 3 0 0 0 18 16l-4-8V3" />
        <path d="M8 14h8" />
      </>
    ),
  },
  {
    top: "35%",
    left: "18%",
    delay: 2.8,
    path: (
      <>
        <path d="M8 21h8M12 17v4M7 3h10v6a5 5 0 0 1-10 0V3Z" />
        <path d="M9 8h6" />
      </>
    ),
  },
];


export default function FloatingIcons() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {ICONS.map((icon, i) => (
        <motion.div
          key={i}
          className="absolute text-white/12"
          style={{ top: icon.top, left: icon.left }}
          animate={{
            y: [0, -18, 0],
            rotate: [0, 4, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            delay: icon.delay,
            ease: "easeInOut",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-10 w-10 md:h-14 md:w-14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {icon.path}
          </svg>
        </motion.div>
      ))}
    </div>
  );
}
