import React from 'react';
import { HeartPulse, Stethoscope, Microscope, Truck, Activity } from 'lucide-react';

export default function CanvaServicesSection() {
  const services = [
    { title: "Teleconsultation", desc: "Connect with top doctors online via video or chat from home.", icon: <Stethoscope className="w-10 h-10 text-[#2B6A60]" /> },
    { title: "Clinic Visits", desc: "Book in-person appointments without waiting in long queues.", icon: <HeartPulse className="w-10 h-10 text-[#2B6A60]" /> },
    { title: "Lab Tests", desc: "Schedule diagnostic tests with quick & accurate home collection.", icon: <Microscope className="w-10 h-10 text-[#2B6A60]" /> },
    { title: "Ambulance", desc: "24/7 fast emergency response services at your fingertips.", icon: <Truck className="w-10 h-10 text-[#2B6A60]" /> },
    { title: "Health Records", desc: "Keep all your medical history secure and accessible anytime.", icon: <Activity className="w-10 h-10 text-[#2B6A60]" /> },
  ];

  return (
    <section className="bg-[#F5F8F7] py-14 font-sans sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-16">
        
        {/* Intro box */}
        <div className="mx-auto mb-16 flex max-w-[1200px] flex-col items-center justify-between gap-8 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-md sm:rounded-[3rem] sm:p-10 md:flex-row md:p-12 lg:mb-24">
          <div className="md:w-3/5 md:pr-10">
            <h3 className="mb-4 text-3xl font-bold text-[#222] sm:text-4xl lg:text-5xl">Empowering Your Health Journey</h3>
            <p className="max-w-2xl text-base font-medium leading-relaxed text-gray-600 lg:text-lg">
              VaidIdea is advancing healthcare through digital innovation, empowering medical professionals with smarter technology, seamless solutions, and providing patients with stress-free care experiences.
            </p>
          </div>
          <div className="flex justify-center md:w-2/5 md:justify-end">
             <div className="h-48 w-48 overflow-hidden rounded-full border-[8px] border-white bg-[#E8EEEE] shadow-xl sm:h-64 sm:w-64">
                <img src="https://images.unsplash.com/photo-1550831107-1553da8c8464?q=80&w=600&auto=format&fit=crop" alt="Healthcare" className="w-full h-full object-cover" />
             </div>
          </div>
        </div>

        {/* Services Heading */}
        <div className="mx-auto mb-10 flex max-w-[1200px] flex-col items-start justify-between md:mb-16 md:flex-row md:items-end">
          <div>
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-[#2B6A60]/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#2B6A60]">
              <span className="w-2.5 h-2.5 bg-[#2B6A60] rounded-full"></span> Our Services
            </div>
            <h2 className="text-4xl font-bold leading-tight text-[#222] sm:text-5xl md:text-6xl">
              Comprehensive Healthcare , <br/>
              <span className="italic text-[#2B6A60] font-serif font-medium">All in One Place.</span>
            </h2>
            <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-gray-500 sm:text-lg">
              Experience the best of modern healthcare. From booking an appointment to ordering medicines, VaidIdea simplifies it all.
            </p>
          </div>
          <div className="hidden md:block text-[#2B6A60] font-serif italic text-3xl rotate-[-4deg] mb-14 opacity-80">
             Better Care <br/> For Healthier You
          </div>
        </div>

        {/* Service Cards Row */}
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:gap-6">
           {services.map((item, idx) => (
             <div key={idx} className="group relative flex min-h-[300px] flex-col items-center overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:min-h-[340px]">
                <div className="w-20 h-20 bg-[#F5F8F7] rounded-3xl mb-6 flex items-center justify-center group-hover:bg-[#2B6A60]/10 transition-colors">
                  {item.icon}
                </div>
                <h4 className="font-bold text-[#222] text-[18px] mb-3">{item.title}</h4>
                <p className="text-[13px] lg:text-sm text-gray-500 mb-8 text-center leading-relaxed font-medium px-2">
                  {item.desc}
                </p>
                <button className="w-full bg-[#F5F8F7] hover:bg-[#2B6A60] hover:text-white transition-colors text-[#2B6A60] text-sm font-bold py-3.5 rounded-2xl mt-auto border border-transparent hover:border-[#2B6A60]">
                  Explore
                </button>
             </div>
           ))}
        </div>
      </div>
    </section>
  );
}
