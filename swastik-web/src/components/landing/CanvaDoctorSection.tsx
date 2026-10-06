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
    <section className="bg-[#F5F8F7] py-24 font-sans">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-14 flex items-start gap-6">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-[#2B6A60] shrink-0 mt-3 border border-gray-100">
               <span className="text-4xl font-black tracking-tighter">V</span>
            </div>
            <div>
              <h2 className="text-[52px] font-bold text-[#222] leading-tight">
                Meet Our Top <br/>
                <span className="font-serif italic text-[#2B6A60] font-medium text-[56px]">Specialists</span>
              </h2>
              <p className="text-lg text-gray-500 mt-6 max-w-2xl leading-relaxed font-medium">
                 Consult with the highly qualified and experienced doctors across various specialties. Book your appointment today and take the first step towards better health.
              </p>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
             <div className="flex flex-wrap gap-3">
               {['Cardiologist', 'Dermatologist', 'Neurologist', 'Pediatrician', 'Dentist'].map((btn, i) => (
                 <button key={i} className="px-6 py-3 bg-[#2B6A60] hover:bg-[#1E5B53] text-white rounded-full text-sm font-semibold transition-all shadow-md hover:shadow-lg">
                   {btn}
                 </button>
               ))}
             </div>
             <div className="flex items-center bg-white rounded-full px-6 py-4 shadow-lg border border-gray-100 min-w-[320px]">
                <Search className="w-6 h-6 text-gray-400 mr-3" />
                <input type="text" placeholder="Search Doctors..." className="text-base font-medium outline-none bg-transparent w-full text-gray-800 placeholder-gray-400" />
             </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {doctors.map((doc, idx) => (
              <div key={idx} className="bg-white rounded-[40px] p-3 flex flex-row-reverse md:flex-row items-center gap-6 shadow-sm border border-gray-100 hover:shadow-2xl transition-all duration-300 h-64 group">
                 <div className="w-56 h-[220px] bg-[#E8EEEE] rounded-[32px] overflow-hidden shrink-0 ml-3 md:ml-0 shadow-inner">
                    <img src={doc.img} alt={doc.name} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110" />
                 </div>
                 <div className="flex-1 pr-6 md:pr-0 md:pl-8 py-6 flex flex-col justify-center">
                   <h4 className="font-bold text-[#222] text-2xl mb-2 tracking-tight">{doc.name}</h4>
                   <span className="text-sm font-bold text-[#2B6A60] mb-4 uppercase tracking-wide bg-[#2B6A60]/10 w-fit px-3 py-1 rounded-md">{doc.specialty}</span>
                   <p className="text-sm font-medium text-gray-500 leading-relaxed">
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
