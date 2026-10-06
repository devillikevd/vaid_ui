import React from 'react';
import { Star } from 'lucide-react';

export default function CanvaTestimonials() {
  const reviews = [
    { name: "Rahul Sharma", role: "Software Developer", review: "VaidIdea made finding a specialist so easy. I booked a clinic visit within minutes, and the doctor was phenomenal. Highly recommend their platform!" },
    { name: "Neha Gupta", role: "School Teacher", review: "The teleconsultation feature is a lifesaver. I didn't have to leave my home, and the video quality and prescription process was seamless." },
    { name: "Aman Desai", role: "Business Owner", review: "I ordered lab tests for my parents and the sample collection was done right on time. Very professional staff and fast reports." }
  ];

  return (
    <section className="bg-[#F5F8F7] py-24 font-sans">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="max-w-[1200px] mx-auto bg-[#EAEFEF] rounded-[56px] pt-20 pb-24 px-16 relative overflow-hidden shadow-inner border border-white">
           
           <div className="flex flex-col md:flex-row justify-between items-end mb-20 relative z-10">
              <div>
                <h2 className="text-[52px] font-bold text-[#222] leading-tight tracking-tight">
                  Check Out What Our <br/>
                  <span className="font-serif italic text-[#2B6A60] font-medium text-[56px]">Customers Are Saying</span>
                </h2>
              </div>
              <div className="mt-10 md:mt-0 text-right flex flex-col items-end">
                <div className="flex -space-x-4 mb-4">
                   <div className="w-14 h-14 rounded-full bg-gray-300 border-[3px] border-white overflow-hidden shadow-md"><img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop" className="w-full h-full object-cover"/></div>
                   <div className="w-14 h-14 rounded-full bg-gray-400 border-[3px] border-white overflow-hidden shadow-md"><img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop" className="w-full h-full object-cover"/></div>
                   <div className="w-14 h-14 rounded-full bg-gray-500 border-[3px] border-white overflow-hidden shadow-md"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop" className="w-full h-full object-cover"/></div>
                   <div className="w-14 h-14 rounded-full bg-[#1E5B53] border-[3px] border-white text-sm text-white flex items-center justify-center font-bold shadow-md">+</div>
                </div>
                <div className="flex items-center gap-1.5 text-yellow-500 mb-2">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-500" />)}
                </div>
                <p className="text-sm font-bold text-[#444]">4.9 (3,208 reviews)</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              {reviews.map((item, idx) => (
                <div key={idx} className="bg-white rounded-[40px] p-10 shadow-sm flex flex-col relative border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
                  <span className="text-[80px] text-[#2B6A60]/10 absolute top-4 left-8 font-serif leading-none">"</span>
                  <p className="text-base lg:text-lg text-gray-600 mb-10 mt-8 leading-relaxed font-medium z-10 relative">
                    "{item.review}"
                  </p>
                  <div className="mt-auto flex items-center gap-4 pt-6 border-t border-gray-100">
                    <div className="w-14 h-14 bg-[#F5F8F7] rounded-full flex items-center justify-center text-[#2B6A60] shrink-0 overflow-hidden text-xl font-bold">
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <h5 className="text-base font-extrabold text-[#222] tracking-tight">{item.name}</h5>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{item.role}</p>
                    </div>
                  </div>
                </div>
              ))}
           </div>

        </div>
      </div>
    </section>
  );
}
