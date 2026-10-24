import React from 'react';
import { Search } from 'lucide-react';

export default function CanvaDoctorSection() {
  const doctors = [
    { name: "Dr. Ananya Sharma", specialty: "Senior Cardiologist", desc: "Expert in treating complex heart diseases and performing minimally invasive surgeries with 15+ years of experience.", img: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=500&auto=format&fit=crop" },
    { name: "Dr. Vikram Singh", specialty: "Neurologist", desc: "Specializes in neurodegenerative disorders and advanced stroke management. Dedicated to bringing cutting edge care.", img: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=500&auto=format&fit=crop" },
    { name: "Dr. Priya Patel", specialty: "Dermatologist", desc: "Renowned for holistic skincare and cosmetic dermatology. Award-winning specialist in laser treatments.", img: "https://images.unsplash.com/photo-1594824436998-dd40e4fbc0f2?q=80&w=500&auto=format&fit=crop" },
    { name: "Dr. Rajesh Kumar", specialty: "Pediatrician", desc: "Compassionate child specialist focusing on neonatal care, vaccination, and overall childhood development.", img: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=500&auto=format&fit=crop" },
  ];

  return (
    <section className="bg-[#F5F8F7] py-14 font-sans sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-[1200px]">
          {/* Header */}
          <div className="mb-10 flex items-start gap-4 sm:mb-14 sm:gap-6">
            <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-white text-[#2B6A60] shadow-lg sm:mt-3 sm:h-16 sm:w-16">
               <span className="text-4xl font-black tracking-tighter">V</span>
            </div>
            <div>
              <h2 className="text-4xl font-bold leading-tight text-[#222] sm:text-[52px]">
                Meet Our Top <br/>
                <span className="font-serif italic text-[#2B6A60] font-medium text-[56px]">Specialists</span>
              </h2>
              <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-gray-500 sm:text-lg">
                 Consult with the highly qualified and experienced doctors across various specialties. Book your appointment today and take the first step towards better health.
              </p>
            </div>
          </div>

          {/* Filters Row */}
          <div className="mb-10 flex flex-col items-stretch justify-between gap-5 sm:mb-16 md:flex-row md:items-center">
             <div className="flex flex-wrap gap-2 sm:gap-3">
               {['Cardiologist', 'Dermatologist', 'Neurologist', 'Pediatrician', 'Dentist'].map((btn, i) => (
                 <button key={i} className="rounded-full bg-[#2B6A60] px-4 py-2.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-[#1E5B53] hover:shadow-lg sm:px-6 sm:py-3 sm:text-sm">
                   {btn}
                 </button>
               ))}
             </div>
             <div className="flex min-w-0 items-center rounded-full border border-gray-100 bg-white px-4 py-3 shadow-lg sm:min-w-[320px] sm:px-6 sm:py-4">
                <Search className="w-6 h-6 text-gray-400 mr-3" />
                <input type="text" placeholder="Search Doctors..." className="text-base font-medium outline-none bg-transparent w-full text-gray-800 placeholder-gray-400" />
             </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-8">
            {doctors.map((doc, idx) => (
              <div key={idx} className="group flex min-h-[220px] flex-row-reverse items-center gap-3 rounded-[2rem] border border-gray-100 bg-white p-2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:gap-5 sm:p-3 md:flex-row">
                 <div className="h-[200px] w-[38%] shrink-0 overflow-hidden rounded-[1.5rem] bg-[#E8EEEE] shadow-inner sm:w-44 md:w-48">
                    <img src={doc.img} alt={doc.name} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110" />
                 </div>
                 <div className="flex min-w-0 flex-1 flex-col justify-center px-2 py-4 sm:py-6 md:pl-4 lg:pl-6">
                   <h4 className="mb-2 text-lg font-bold tracking-tight text-[#222] sm:text-2xl">{doc.name}</h4>
                   <span className="mb-3 w-fit rounded-md bg-[#2B6A60]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#2B6A60] sm:mb-4 sm:px-3 sm:text-sm">{doc.specialty}</span>
                   <p className="text-xs font-medium leading-relaxed text-gray-500 sm:text-sm">
                     {doc.desc}
                   </p>
                 </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
