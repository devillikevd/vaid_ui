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
    <section className="bg-[#F5F8F7] py-16 font-sans">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        
        {/* Intro box */}
        <div className="bg-white rounded-[48px] p-12 flex flex-col md:flex-row items-center justify-between shadow-md mb-28 max-w-[1200px] mx-auto border border-gray-100">
          <div className="md:w-3/5 pr-10">
            <h3 className="text-4xl lg:text-5xl font-bold text-[#222] mb-6">Empowering Your Health Journey</h3>
            <p className="text-base lg:text-lg font-medium text-gray-600 leading-relaxed max-w-2xl">
              VaidIdea is advancing healthcare through digital innovation, empowering medical professionals with smarter technology, seamless solutions, and providing patients with stress-free care experiences.
            </p>
          </div>
          <div className="md:w-2/5 flex justify-end mt-10 md:mt-0">
             <div className="w-64 h-64 bg-[#E8EEEE] rounded-full flex items-center justify-center overflow-hidden border-[8px] border-white shadow-xl">
                <img src="https://images.unsplash.com/photo-1550831107-1553da8c8464?q=80&w=600&auto=format&fit=crop" alt="Healthcare" className="w-full h-full object-cover" />
             </div>
          </div>
        </div>

        {/* Services Heading */}
        <div className="max-w-[1200px] mx-auto mb-16 flex flex-col md:flex-row justify-between items-end">
          <div>
            <div className="inline-block bg-[#2B6A60]/10 text-[#2B6A60] text-sm font-bold px-5 py-2.5 rounded-full mb-6 tracking-wider uppercase flex items-center gap-2 w-fit">
              <span className="w-2.5 h-2.5 bg-[#2B6A60] rounded-full"></span> Our Services
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-[#222] leading-tight">
              Comprehensive Healthcare , <br/>
              <span className="italic text-[#2B6A60] font-serif font-medium">All in One Place.</span>
            </h2>
            <p className="text-lg text-gray-500 mt-8 max-w-xl leading-relaxed font-medium">
              Experience the best of modern healthcare. From booking an appointment to ordering medicines, VaidIdea simplifies it all.
            </p>
          </div>
          <div className="hidden md:block text-[#2B6A60] font-serif italic text-3xl rotate-[-4deg] mb-14 opacity-80">
             Better Care <br/> For Healthier You
          </div>
        </div>

        {/* Service Cards Row */}
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-5 gap-6">
           {services.map((item, idx) => (
             <div key={idx} className="bg-white rounded-[32px] p-6 flex flex-col items-center text-center shadow-sm hover:shadow-2xl transition-all duration-300 relative overflow-hidden h-[340px] border border-gray-100 group">
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
