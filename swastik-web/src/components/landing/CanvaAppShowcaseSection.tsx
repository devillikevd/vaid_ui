import React from 'react';

export default function CanvaAppShowcaseSection() {
  return (
    <section className="bg-[#E4ECEB] py-12 font-sans sm:py-20">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-8">
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          
          {/* Left Column (Phone & Stats) */}
          <div className="col-span-1 md:col-span-4 flex flex-col gap-4">
            
            {/* Phone Card (Tall) */}
            <div className="relative flex h-[420px] items-center justify-center overflow-hidden rounded-[2rem] border border-white bg-white p-2 shadow-sm sm:h-[536px] sm:rounded-[2.5rem]">
               {/* Using a stock image of a hand holding a phone to replicate the Canva image */}
               <img 
                 src="/phone-mockup.png" 
                 alt="App on Phone" 
                 className="w-full h-full object-contain rounded-[32px]"
               />
               {/* Simulated App Screen Overlay (since we don't have the exact UI image) */}
               <div className="absolute inset-x-8 inset-y-12 bg-white rounded-[32px] shadow-2xl p-4 flex flex-col hidden">
                  {/* Just keeping the image for the visual match of the collage */}
               </div>
            </div>

            {/* 25k+ Stats Card */}
            <div className="flex h-[150px] items-center justify-between rounded-[2rem] border border-white bg-[#F6F9F9] p-6 shadow-sm sm:h-[180px] sm:rounded-[2.5rem] sm:p-8">
               <div className="text-4xl font-bold tracking-tighter text-black sm:text-[52px]">25k+</div>
               <div className="flex flex-col items-end gap-2 w-32">
                 <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] text-gray-500 font-bold">Patient Rate</span>
                    <span className="text-[10px] bg-gray-900 text-white px-2 py-0.5 rounded-full font-bold">+ 24% ↑</span>
                 </div>
                 {/* Fake Bar Chart */}
                 <div className="flex items-end gap-1.5 h-16 mt-2 w-full justify-between">
                    <div className="w-3 bg-gray-300 rounded-t-sm h-[40%]"></div>
                    <div className="w-3 bg-gray-300 rounded-t-sm h-[30%]"></div>
                    <div className="w-3 bg-gray-400 rounded-t-sm h-[80%]"></div>
                    <div className="w-3 bg-[#89A8A1] rounded-t-sm h-[100%]"></div>
                    <div className="w-3 bg-gray-300 rounded-t-sm h-[60%]"></div>
                    <div className="w-3 bg-gray-300 rounded-t-sm h-[50%]"></div>
                    <div className="w-3 bg-gray-300 rounded-t-sm h-[40%]"></div>
                 </div>
               </div>
            </div>

          </div>

          {/* Right Columns */}
          <div className="col-span-1 md:col-span-8 flex flex-col gap-4">
            
            {/* Top Row: Map & Logo */}
            <div className="flex h-auto flex-col gap-4 sm:h-[180px] sm:flex-row">
              
              {/* Map Card */}
              <div className="relative flex min-h-[180px] flex-1 flex-[1.2] overflow-hidden rounded-[2rem] border border-white bg-white p-2 shadow-sm sm:rounded-[2.5rem]">
                 <img 
                   src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=800&auto=format&fit=crop" 
                   alt="Map" 
                   className="w-full h-full object-cover rounded-[32px] opacity-80"
                 />
                 <div className="absolute inset-0 bg-white/20"></div>
                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full px-4 py-2 flex items-center gap-2 shadow-lg w-max max-w-[90%]">
                    <div className="w-6 h-6 bg-gray-200 rounded-full overflow-hidden">
                       <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col">
                       <div className="w-16 h-1.5 bg-gray-200 rounded-full mb-1"></div>
                       <div className="w-10 h-1 bg-gray-100 rounded-full"></div>
                    </div>
                 </div>
              </div>

              {/* Logo Card */}
              <div className="flex min-h-[130px] flex-1 items-center justify-center rounded-[2rem] border border-white bg-[#F6F9F9] p-6 shadow-sm sm:rounded-[2.5rem]">
                 <div className="flex items-center justify-center">
                   <img src="/vaididea-logo.png" alt="Vaididea Logo" className="h-12 object-contain mix-blend-multiply" />
                 </div>
              </div>

            </div>

            {/* Middle Row: Banner */}
            <div className="relative flex h-auto flex-col items-center overflow-hidden rounded-[2rem] border border-[#5a9389] bg-[#4E837A] shadow-sm sm:h-[260px] sm:flex-row sm:rounded-[2.5rem]">
               
               {/* Left Image (People) */}
               <div className="w-full sm:w-[55%] h-[200px] sm:h-full relative p-4 sm:p-6 sm:pr-0">
                  <div className="w-full h-full rounded-[28px] overflow-hidden relative">
                    <img 
                      src="https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=80&w=800&auto=format&fit=crop" 
                      alt="Healthcare Workers" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-white text-black text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1 border border-gray-100">
                      happy patients
                    </div>
                    <div className="absolute top-1/2 left-2 -translate-y-1/2 bg-white text-black text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1 border border-gray-100">
                      <span className="rotate-90">⇄</span> Repost
                    </div>
                  </div>
               </div>

               {/* Right Content */}
               <div className="w-full sm:w-[45%] p-8 flex flex-col justify-center items-start relative z-10">
                  <div className="absolute top-4 right-6 text-5xl opacity-20">🤍</div>
                  <h3 className="mb-6 text-4xl font-medium leading-[1.1] text-white sm:text-5xl">
                    Get Best <br/> Service Here
                  </h3>
                  <button className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-bold shadow-md hover:bg-gray-50 transition-colors">
                    Book Now
                  </button>
               </div>
            </div>

            {/* Bottom Row: Review & Doctor */}
            <div className="flex h-auto flex-col gap-4 sm:h-[260px] sm:flex-row">
              
              {/* Review Card */}
              <div className="flex min-h-[240px] flex-[1.5] flex-col rounded-[2rem] border border-white bg-[#F6F9F9] p-6 shadow-sm sm:h-full sm:rounded-[2.5rem] sm:p-8">
                 <div className="text-gray-300 mb-2">
                    <svg className="w-10 h-10 fill-current" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
                 </div>
                 <p className="text-gray-500 text-sm leading-[1.8] font-medium mb-6">
                    "Vaididea has completely transformed how I manage my health. Booking appointments and getting online consultations is incredibly seamless and fast. Highly recommended!"
                 </p>
                 <div className="mt-auto flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white shrink-0">
                       <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                    </div>
                    <div>
                       <h6 className="text-black font-bold text-sm">Rahul Sharma</h6>
                       <p className="text-[10px] text-gray-500 font-medium">Software Engineer, TechCorp</p>
                    </div>
                 </div>
              </div>

              {/* Doctor Card */}
              <div className="relative flex min-h-[240px] flex-1 items-end justify-center overflow-hidden rounded-[2rem] border border-white bg-[#F6F9F9] p-2 shadow-sm sm:h-full sm:rounded-[2.5rem]">
                 <div className="absolute inset-0 bg-[#E8F0EF] rounded-[32px] m-2"></div>
                 {/* Brush stroke effect behind doctor */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] bg-[#D5E1DF] rounded-[40px] rotate-[-5deg]"></div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[50%] bg-[#C6D6D4] rounded-[40px] rotate-[5deg]"></div>
                 
                 <img 
                   src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=400&auto=format&fit=crop" 
                   alt="Doctor" 
                   className="w-[90%] h-[90%] object-cover object-top relative z-10"
                   style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}
                 />
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
