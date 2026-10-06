"use client";

import React from "react";
import Link from "next/link";
import { MessageSquareText, Sparkles, Brain, ShieldCheck, Zap } from "lucide-react";

export default function VaidIdeaAISection() {
  return (
    <section className="py-28 bg-[#F5F8F7] font-sans relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="max-w-[1200px] mx-auto bg-gradient-to-br from-[#1E5B53] via-[#2B6A60] to-[#1E5B53] rounded-[56px] p-12 md:p-20 flex flex-col lg:flex-row items-center justify-between gap-16 relative overflow-hidden shadow-2xl">
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left relative z-10">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-bold mb-8 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              VaidIdea AI Beta
            </div>
            
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight mb-6 leading-[1.1]">
              Ask Anything <br className="hidden lg:block"/>
              <span className="italic font-serif font-medium text-white/90">about your Health</span>
            </h2>
            
            <p className="text-white/70 text-lg mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
              Get instant, AI-powered insights on your symptoms, medications, and general wellness. Smart healthcare assistance is just a chat away.
            </p>
            
            {/* Features pills */}
            <div className="flex flex-wrap gap-3 mb-10 justify-center lg:justify-start">
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
              className="inline-flex items-center gap-3 bg-white text-[#1E5B53] px-8 py-4 rounded-full font-bold text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 hover:bg-gray-50"
            >
              <MessageSquareText className="w-5 h-5" />
              Chat with VaidIdea AI
            </Link>
          </div>

          {/* Right - Visual */}
          <div className="flex-1 flex justify-center items-center relative z-10">
            <div className="relative w-72 h-72 md:w-96 md:h-96">
              {/* Outer ring glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400/30 to-teal-300/30 rounded-full animate-pulse blur-3xl" />
              
              {/* Middle ring */}
              <div className="absolute inset-6 border-2 border-white/10 rounded-full animate-[spin_20s_linear_infinite]">
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
              <div className="absolute top-8 right-8 w-3 h-3 bg-yellow-400 rounded-full animate-bounce shadow-lg shadow-yellow-400/50" />
              <div className="absolute bottom-16 left-4 w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-300 shadow-lg shadow-blue-400/50" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
