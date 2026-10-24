import React from 'react';
import { Star } from 'lucide-react';

export default function CanvaTestimonials() {
  const reviews = [
    { name: "Rahul Sharma", role: "Software Developer", review: "VaidIdea made finding a specialist so easy. I booked a clinic visit within minutes, and the doctor was phenomenal. Highly recommend their platform!" },
    { name: "Neha Gupta", role: "School Teacher", review: "The teleconsultation feature is a lifesaver. I didn't have to leave my home, and the video quality and prescription process was seamless." },
    { name: "Aman Desai", role: "Business Owner", review: "I ordered lab tests for my parents and the sample collection was done right on time. Very professional staff and fast reports." }
  ];

  return (
    <section className="bg-[#F5F8F7] py-14 font-sans sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-16">
        <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[2rem] border border-white bg-[#EAEFEF] px-5 pb-12 pt-12 shadow-inner sm:rounded-[3.5rem] sm:px-10 sm:pb-20 sm:pt-16 lg:px-16">
           
           <div className="relative z-10 mb-12 flex flex-col items-start justify-between md:mb-20 md:flex-row md:items-end">
              <div>
                <h2 className="text-4xl font-bold leading-tight tracking-tight text-[#222] sm:text-[52px]">
                  Check Out What Our <br/>
                  <span className="font-serif italic text-[#2B6A60] font-medium text-[56px]">Customers Are Saying</span>
                </h2>
              </div>
              <div className="mt-8 flex flex-col items-start md:mt-0 md:items-end">
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

           <div className="relative z-10 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-8">
              {reviews.map((item, idx) => (
                <div key={idx} className="relative flex flex-col rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-2xl sm:p-10">
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
