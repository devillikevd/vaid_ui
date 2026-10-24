"use client";

import React from "react";
import Link from "next/link";
import { MessageSquareText, Sparkles, Brain, ShieldCheck, Zap } from "lucide-react";

export default function VaidIdeaAISection() {
  return (
    <section className="relative overflow-hidden bg-[#F5F8F7] py-10 font-sans sm:py-14 lg:py-20">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-16">
        <div className="relative mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1E5B53] via-[#2B6A60] to-[#1E5B53] p-6 shadow-2xl sm:rounded-[3.5rem] sm:p-10 lg:flex-row lg:gap-12 lg:p-16">
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left relative z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              VaidIdea AI Beta
            </div>
            
            <h2 className="mb-4 text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
              Ask Anything <br className="hidden lg:block"/>
              <span className="italic font-serif font-medium text-white/90">about your Health</span>
            </h2>
            
            <p className="mx-auto mb-5 max-w-lg text-base font-medium leading-relaxed text-white/70 sm:mb-6 sm:text-lg lg:mx-0">
              Get instant, AI-powered insights on your symptoms, medications, and general wellness. Smart healthcare assistance is just a chat away.
            </p>
            
            {/* Features pills */}
            <div className="mb-6 flex flex-wrap justify-center gap-2 lg:justify-start">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                <Brain className="w-4 h-4 text-emerald-300" />
                <span className="text-white/90 text-sm font-medium">AI Powered</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                <ShieldCheck className="w-4 h-4 text-blue-300" />
                <span className="text-white/90 text-sm font-medium">HIPAA Secure</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                <Zap className="w-4 h-4 text-yellow-300" />
                <span className="text-white/90 text-sm font-medium">Instant Results</span>
              </div>
            </div>
            
            <Link 
              href="/ai-chat"
            className="inline-flex items-center gap-3 rounded-full bg-white px-6 py-3.5 text-base font-bold text-[#1E5B53] shadow-xl transition-all hover:-translate-y-1 hover:bg-gray-50 hover:shadow-2xl sm:px-8 sm:py-4 sm:text-lg"
            >
              <MessageSquareText className="w-5 h-5" />
              Chat with VaidIdea AI
            </Link>
          </div>

          {/* Right - Visual */}
          <div className="flex-1 flex justify-center items-center relative z-10">
            <div className="relative h-56 w-56 sm:h-72 sm:w-72 md:h-96 md:w-96">
              {/* Outer ring glow */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-400/25 to-teal-300/25 blur-2xl motion-reduce:animate-none animate-[pulse_4s_ease-in-out_infinite]" />
              
              {/* Middle ring */}
              <div className="absolute inset-6 rounded-full border-2 border-white/10 motion-reduce:animate-none animate-[spin_24s_linear_infinite]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-teal-300 rounded-full shadow-lg shadow-teal-300/50" />
              </div>
              
              {/* Inner circle */}
              <div className="absolute inset-12 bg-gradient-to-br from-white/10 to-white/5 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-sm shadow-[inset_0_0_80px_rgba(255,255,255,0.1)]">
                <div className="flex flex-col items-center gap-3">
                  <Sparkles className="w-16 h-16 text-white/80" />
                  <span className="text-white/60 text-sm font-bold tracking-widest uppercase">AI Engine</span>
                </div>
              </div>
              
              {/* Floating dots */}
              <div className="absolute right-8 top-8 h-3 w-3 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/50 motion-reduce:animate-none animate-[pulse_3s_ease-in-out_infinite]" />
              <div className="absolute bottom-16 left-4 h-2 w-2 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50 motion-reduce:animate-none animate-[pulse_3.5s_ease-in-out_infinite_0.5s]" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
