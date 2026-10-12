import type { LucideIcon } from 'lucide-react';
import { Stethoscope, Hospital, Building2, Pill, Ambulance, Dumbbell } from 'lucide-react';

export type ProviderPortal = {
  title: string;
  description: string;
  href: string;
  image: string;
  tone: string;
  icon: LucideIcon;
};

export const providerPortals: ProviderPortal[] = [
  { title: 'DOCTORS PORTAL', description: 'Manage appointments, consultations & grow your practice.', href: '/register/doctor', image: '/images/providers/doctor-portal.webp', tone: 'from-[#d9f9e8] to-white', icon: Stethoscope },
  { title: 'HOSPITALS PORTAL', description: 'Manage departments, staff, patients and hospital operations.', href: '/register/hospital', image: '/images/providers/hospital-portal.webp', tone: 'from-[#e1faed] to-white', icon: Hospital },
  { title: 'CLINIC PORTAL', description: 'Streamline your clinic operations and patients management.', href: '/register/clinic', image: '/images/providers/clinic-portal.webp', tone: 'from-[#fff0dc] to-white', icon: Building2 },
  { title: 'PHARMACIES PORTAL', description: 'Manage inventory, process orders and serve your customers.', href: '/register/pharmacy', image: '/images/providers/pharmacy-portal.webp', tone: 'from-[#ffecd5] to-white', icon: Pill },
  { title: 'AMBULANCES SERVICE PORTAL', description: 'Be available for emergencies and save lives.', href: '/register/ambulance', image: '/images/providers/ambulance-portal.webp', tone: 'from-[#e5eaff] to-white', icon: Ambulance },
  { title: 'GYM & FITNESS PORTAL', description: 'Manage members, plans and fitness services.', href: '/register/fitness-center', image: '/images/providers/fitness-portal.webp', tone: 'from-[#e7eaff] to-white', icon: Dumbbell },
];
