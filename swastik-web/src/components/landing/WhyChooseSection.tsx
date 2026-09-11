"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  FlaskConical,
  Stethoscope,
  ArrowRight,
  UserCheck,
  Video,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
} from "lucide-react";

export interface HealthcareServiceItem {
  id: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  href: string;
  image: string;
  alt: string;
  accentBorder: string;
  subtitle?: string;
  description?: string;
  cta?: string;
}

export const services: HealthcareServiceItem[] = [
  {
    id: "doctors",
    icon: Stethoscope,
    label: "Find Doctors",
    href: "/patient/doctors",
    image: "/images/patient/clinic_visit.webp",
    alt: "Find verified doctors and schedule clinic consultations",
    accentBorder: "group-hover:border-vd-forest/40",
  },
  {
    id: "in-person",
    icon: UserCheck,
    label: "In-Person Consultation",
    href: "/patient/doctors?mode=in_person",
    image: "/images/patient/inpersonconsultation_new.webp",
    alt: "In-Person Consultation",
    accentBorder: "group-hover:border-vd-forest/40",
  },
  {
    id: "video-consult",
    icon: Video,
    label: "Video Consultation",
    href: "/patient/doctors?mode=video",
    image: "/images/patient/videoconsultation_new.webp",
    alt: "Video Consultation",
    accentBorder: "group-hover:border-teal-500/40",
  },
  {
    id: "hospitals",
    icon: Building2,
    label: "Find Hospitals",
    href: "/patient/hospitals",
    image: "/images/patient/find_hospital.webp",
    alt: "Illustrated hospital building with emergency and pharmacy signage",
    accentBorder: "group-hover:border-vd-forest/40",
  },
  {
    id: "lab-tests",
    icon: FlaskConical,
    label: "Book Lab Tests",
    href: "/patient/diagnostics",
    image: "/images/patient/book_test_lab.webp",
    alt: "Lab test booking interface with test tubes, calendar and checklist",
    accentBorder: "group-hover:border-teal-500/40",
  },
  {
    id: "gym-studio",
    icon: Dumbbell,
    label: "Gym & Studio",
    subtitle: "Fitness & Wellness",
    description: "Find trusted gyms, fitness studios, personal trainers and wellness centers near you.",
    cta: "Explore Gyms & Studios",
    href: "/fitness-center",
    image: "/images/patient/gymcoach.webp",
    alt: "Gym & Studio fitness training equipment, coaches and wellness facilities",
    accentBorder: "group-hover:border-vd-forest/40",
  },
];

const TOTAL_CARDS = services.length;
const ANGLE_STEP = (2 * Math.PI) / TOTAL_CARDS;

export default function WhyChooseSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Animation references for 60fps orbit without React re-render overhead
  const angleRef = useRef(0);
  const targetAngleRef = useRef(0);
  const isHoveredRef = useRef(false);
  const isDraggingRef = useRef(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Track responsive breakpoint and reduced-motion preference
  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkViewport();

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    window.addEventListener("resize", checkViewport, { passive: true });
    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      window.removeEventListener("resize", checkViewport);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  // Update card positions in DOM directly for silky 60fps GPU performance
  const updateCardTransforms = useCallback((currentAngle: number) => {
    const isTablet = typeof window !== "undefined" && window.innerWidth < 1024;
    // Responsive horizontal and vertical orbit radii
    const radiusX = isTablet ? 240 : 350;
    const radiusY = isTablet ? 36 : 52;

    for (let i = 0; i < TOTAL_CARDS; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;

      const theta = currentAngle + i * ANGLE_STEP;
      const sin = Math.sin(theta);
      const cos = Math.cos(theta);

      // Depth: 0 (furthest back) to 1 (front center)
      const depth = (cos + 1) / 2;

      // Perspective horizontal scaling: front cards fan wider, back cards pull gracefully inward
      const perspectiveFactor = 0.78 + depth * 0.22;
      const x = sin * radiusX * perspectiveFactor;
      const y = cos * radiusY;

      // Scale: 0.78 (furthest back) to 1.04 (front center)
      const scale = 0.78 + depth * 0.26;

      // Opacity: 0.55 (furthest back) to 1.0 (front center)
      const opacity = 0.55 + depth * 0.45;

      // Z-index: 1 to 20 inside section's isolated stacking context
      const zIndex = Math.round(depth * 15) + 1;

      el.style.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), 0) scale(${scale.toFixed(3)})`;
      el.style.opacity = opacity.toFixed(2);
      el.style.zIndex = String(zIndex);
      el.style.pointerEvents = "auto";
      el.style.visibility = "visible";

      // Elevated shadow and highlight when in the front focus position
      if (depth > 0.9) {
        el.style.boxShadow = "0 14px 38px rgba(15, 95, 80, 0.16)";
        el.style.borderColor = "rgba(15, 95, 80, 0.35)";
      } else {
        el.style.boxShadow = "0 2px 12px rgba(0, 0, 0, 0.04)";
        el.style.borderColor = "rgba(231, 229, 228, 0.9)";
      }
    }
  }, []);

  const activeIndexRef = useRef(0);

  // Main animation loop
  useEffect(() => {
    if (isMobile) return;

    let animId: number;
    let lastTime = performance.now();
    updateCardTransforms(angleRef.current);

    const animate = (time: number) => {
      let delta = (time - lastTime) / 1000;
      lastTime = time;
      if (delta > 0.1) delta = 0.016; // Clamp lag spikes when tab is hidden

      // If user isn't hovering, dragging, and hasn't requested reduced motion, gently advance
      if (!isHoveredRef.current && !isDraggingRef.current && !prefersReducedMotion) {
        // Continuous slow orbit: ~36s per full rotation (0.174 rad/sec)
        targetAngleRef.current -= 0.16 * delta;
      }

      // Smooth interpolation towards targetAngle
      const diff = targetAngleRef.current - angleRef.current;
      angleRef.current += diff * Math.min(1, delta * 5.5);

      updateCardTransforms(angleRef.current);

      // Compute which card is currently closest to the front
      const normalizedAngle = (-angleRef.current % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const computedFrontIndex = Math.round(normalizedAngle / ANGLE_STEP) % TOTAL_CARDS;
      if (computedFrontIndex !== activeIndexRef.current) {
        activeIndexRef.current = computedFrontIndex;
        setActiveIndex(computedFrontIndex);
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isMobile, prefersReducedMotion, updateCardTransforms]);

  // Navigate to a specific card index
  const rotateToIndex = useCallback((index: number) => {
    // Find closest angle representing index at the front
    const currentAngle = targetAngleRef.current;
    const baseTarget = -index * ANGLE_STEP;
    const twoPi = 2 * Math.PI;

    // Normalize difference to [-PI, PI] to rotate shortest path
    let diff = (baseTarget - currentAngle) % twoPi;
    if (diff > Math.PI) diff -= twoPi;
    if (diff < -Math.PI) diff += twoPi;

    targetAngleRef.current = currentAngle + diff;
    activeIndexRef.current = index;
    setActiveIndex(index);
  }, []);

  const handlePrev = () => {
    const nextIdx = (activeIndex - 1 + TOTAL_CARDS) % TOTAL_CARDS;
    rotateToIndex(nextIdx);
  };

  const handleNext = () => {
    const nextIdx = (activeIndex + 1) % TOTAL_CARDS;
    rotateToIndex(nextIdx);
  };

  // Card click handler: if not front card, rotate it to front instead of immediate navigation
  const handleCardClick = (e: React.MouseEvent, index: number, href: string) => {
    if (isMobile) return; // On mobile, standard link navigation applies

    if (index !== activeIndex) {
      e.preventDefault();
      rotateToIndex(index);
    }
  };

  // Touch / Swipe handler for mobile
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const distance = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(distance) > 40) {
      if (distance > 0) {
        // Swiped left -> Next
        handleNext();
      } else {
        // Swiped right -> Prev
        handlePrev();
      }
    }
  };

  return (
    <section
      className="pt-6 pb-10 sm:pt-8 sm:pb-14 bg-white border-b border-stone-200/80 overflow-hidden relative isolate z-10"
      id="services"
      aria-label="Healthcare services carousel"
      role="region"
      aria-roledescription="carousel"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* Section header */}
        <div className="text-center max-w-xl mx-auto mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-vd-forest text-[11px] font-bold uppercase tracking-wider mb-2.5 border border-emerald-200/60">
            <Building2 className="w-3 h-3" />
            <span>Healthcare Services</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-[2rem] font-bold text-vd-forest tracking-tight leading-tight">
            Everything You Need,{" "}
            <span className="text-vd-sage font-semibold">In One Place</span>
          </h2>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            DESKTOP / TABLET: CIRCULAR ORBIT CAROUSEL
            ══════════════════════════════════════════════════════════════════════ */}
        <div
          className="hidden sm:block relative w-full h-[340px] md:h-[370px] max-w-5xl mx-auto select-none"
          onMouseEnter={() => {
            isHoveredRef.current = true;
          }}
          onMouseLeave={() => {
            isHoveredRef.current = false;
          }}
        >
          {/* Subtle decorative dashed orbital ring */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[660px] md:w-[740px] h-[130px] md:h-[150px] rounded-[50%] border border-dashed border-emerald-800/25 pointer-events-none z-0"
            aria-hidden="true"
          />

          {/* Orbiting Cards Container */}
          <div className="relative w-full h-full">
            {services.map((svc, i) => {
              const Icon = svc.icon;
              const isFront = i === activeIndex;

              return (
                <div
                  key={svc.id}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  className="absolute top-1/2 left-1/2 w-[220px] md:w-[250px] transition-shadow duration-300 will-change-transform"
                  style={{
                    transform: "translate3d(-50%, -50%, 0)",
                  }}
                >
                  <Link
                    href={svc.href}
                    onClick={(e) => handleCardClick(e, i, svc.href)}
                    title={svc.description || svc.label}
                    className={`group flex flex-col justify-between bg-white rounded-2xl border transition-colors duration-250 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vd-forest cursor-pointer block ${
                      isFront
                        ? "border-emerald-600/50"
                        : "border-stone-200/90 hover:border-vd-forest/40"
                    }`}
                    aria-label={`${svc.label}${isFront ? " (Active front card)" : " (Click to bring to front)"}`}
                  >
                    {/* Image Area */}
                    <div className="relative w-full aspect-[16/11] overflow-hidden bg-stone-50/70">
                      <Image
                        src={svc.image}
                        alt={svc.alt}
                        fill
                        sizes="(max-width: 1024px) 250px, 280px"
                        className="object-contain p-3 sm:p-3.5 transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                        priority={i === 0}
                      />
                    </div>

                    {/* Content area: Solid Vaididea dark-green CTA strip */}
                    <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-vd-forest group-hover:bg-vd-forest-deep transition-colors duration-200">
                      {/* Left: icon + label */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center shrink-0 transition-colors duration-200">
                          <Icon className="w-3.5 h-3.5 text-emerald-200" strokeWidth={1.75} />
                        </div>
                        <span className="text-xs sm:text-[13px] font-bold text-white transition-colors duration-150 leading-snug line-clamp-2">
                          {svc.label}
                        </span>
                      </div>

                      {/* Right: Explore CTA */}
                      <div className="flex items-center gap-0.5 shrink-0 text-[11px] font-semibold text-white whitespace-nowrap">
                        <span>Explore</span>
                        <ArrowRight className="w-3 h-3 text-white transition-transform duration-150 group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            MOBILE (<640px): COMPACT TOUCH-FRIENDLY SWIPE CAROUSEL
            ══════════════════════════════════════════════════════════════════════ */}
        <div
          className="block sm:hidden relative w-full px-4"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {services.map((svc, i) => {
            if (i !== activeIndex) return null;
            const Icon = svc.icon;

            return (
              <div
                key={svc.id}
                className="max-w-[310px] mx-auto transition-all duration-300 animate-in fade-in zoom-in-95 duration-200"
              >
                <Link
                  href={svc.href}
                  title={svc.description || svc.label}
                  className="group flex flex-col justify-between bg-white rounded-2xl border border-stone-200/90 shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vd-forest block"
                  aria-label={svc.label}
                >
                  {/* Image area */}
                  <div className="relative w-full aspect-[16/11] overflow-hidden bg-stone-50/70">
                    <Image
                      src={svc.image}
                      alt={svc.alt}
                      fill
                      sizes="310px"
                      className="object-contain p-4"
                    />
                  </div>

                  {/* Bottom Action Strip */}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 bg-vd-forest">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-emerald-200" strokeWidth={1.75} />
                      </div>
                      <span className="text-xs sm:text-[13px] font-bold text-white leading-snug">
                        {svc.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0 text-[11px] font-semibold text-white whitespace-nowrap">
                      <span>Explore</span>
                      <ArrowRight className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            CONTROLS: PREVIOUS / NEXT ARROWS & 6 PAGINATION DOTS
            ══════════════════════════════════════════════════════════════════════ */}
        <div className="mt-5 sm:mt-6 flex items-center justify-center gap-3">
          {/* Previous Button */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous healthcare service"
            className="w-8 h-8 rounded-full bg-stone-50 hover:bg-emerald-50 text-stone-700 hover:text-vd-forest border border-stone-200/80 transition-all flex items-center justify-center cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vd-forest"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* 5 Pagination Dots */}
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Carousel pagination">
            {services.map((svc, i) => {
              const isActive = i === activeIndex;
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => rotateToIndex(i)}
                  aria-label={`Go to ${svc.label}`}
                  aria-selected={isActive}
                  role="tab"
                  className={`transition-all duration-300 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vd-forest ${
                    isActive
                      ? "w-6 h-2 bg-vd-forest"
                      : "w-2 h-2 bg-stone-300 hover:bg-stone-400"
                  }`}
                />
              );
            })}
          </div>

          {/* Next Button */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next healthcare service"
            className="w-8 h-8 rounded-full bg-stone-50 hover:bg-emerald-50 text-stone-700 hover:text-vd-forest border border-stone-200/80 transition-all flex items-center justify-center cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vd-forest"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
}
