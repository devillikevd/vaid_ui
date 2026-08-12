import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, ArrowRight } from 'lucide-react';

export function Step6Success() {
    return (
        <div className="text-center bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] p-8 sm:p-12 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-24 h-24 rounded-full bg-[#22C55E]/20 mx-auto flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(34,197,94,0.3)]"
            >
                <CheckCircle2 className="w-12 h-12 text-[#22C55E]" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Registration Submitted!</h2>
                <p className="text-[#A1A1AA] text-lg mb-8 max-w-md mx-auto">
                    Your profile and documents have been successfully submitted for verification. 
                </p>

                <div className="bg-[#09090B] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 inline-flex flex-col items-center gap-3 mb-10 w-full max-w-sm">
                    <Clock className="w-8 h-8 text-yellow-500" />
                    <h3 className="font-semibold text-white">Under Review</h3>
                    <p className="text-sm text-[#A1A1AA]">Standard verification takes up to <strong className="text-white">24 hours</strong>. We&apos;ll notify you via email once approved.</p>
                </div>

                <div className="flex flex-col gap-4">
                    <Link
                        href="/login/doctor"
                        className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803d] text-white py-3.5 px-4 rounded-xl font-semibold text-[15px] shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all"
                    >
                        Go to Login Page
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link 
                        href="/" 
                        className="text-[#A1A1AA] hover:text-white transition-colors text-sm font-medium"
                    >
                        Return to Homepage
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
