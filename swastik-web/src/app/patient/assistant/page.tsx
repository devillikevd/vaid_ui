'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
    Bot,
    Send,
    Sparkles,
    AlertCircle,
    User,
    Loader2,
    Shield,
    RefreshCw,
    Activity,
    CheckCircle2,
    Clock,
    AlertTriangle
} from 'lucide-react';
import { chatbotApi } from '@/lib/api';
import { useAuthStore, isPatientAuthenticated } from '@/stores/authStore';
import ProtectedPageGate from '@/components/auth/ProtectedPageGate';

interface Message {
    id: string;
    sender: 'user' | 'assistant';
    text: string;
    timestamp: Date;
    urgency?: 'emergency' | 'urgent' | 'routine' | 'info';
    suggestedSpecialties?: string[];
}

export default function PatientAssistantPage() {
    const { user, isAuthenticated, _hasHydrated, isLoading: authLoading } = useAuthStore();
    const isPatient = isPatientAuthenticated(user, isAuthenticated);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            sender: 'assistant',
            text: 'Hello! I am your Vaididea AI Health Assistant. How can I help you today? You can describe any symptoms you are experiencing, ask about preventive health practices, or request first-aid guidance.',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Quick Symptom Triage Modal State
    const [symptomText, setSymptomText] = useState('');
    const [analyzingSymptoms, setAnalyzingSymptoms] = useState(false);
    const [symptomResult, setSymptomResult] = useState<any | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const initSession = async () => {
        try {
            const res = await chatbotApi.startSession();
            const data = res.data as any;
            if (res.success && data?.sessionId) {
                setSessionId(data.sessionId);
            }
        } catch (err: any) {
            console.error('Failed to start AI session:', err.message);
        }
    };

    useEffect(() => {
        if (isPatient) {
            initSession();
        }
    }, [isPatient]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || sending) return;

        setInput('');
        const userMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setSending(true);
        setError(null);

        try {
            let activeSessionId = sessionId;
            if (!activeSessionId) {
                const sRes = await chatbotApi.startSession();
                const sData = sRes.data as any;
                if (sRes.success && sData?.sessionId) {
                    activeSessionId = sData.sessionId;
                    setSessionId(activeSessionId);
                }
            }

            const res = await chatbotApi.sendMessage(activeSessionId || '', text);
            const data = res.data as any;
            if (res.success && data?.message) {
                const botMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    sender: 'assistant',
                    text: data.message,
                    timestamp: new Date(),
                    urgency: data.urgency,
                    suggestedSpecialties: data.suggestedSpecialties,
                };
                setMessages((prev) => [...prev, botMsg]);
            } else {
                setError(res.message || 'Unable to get AI response. Please try again.');
            }
        } catch (err: any) {
            setError(err.message || 'Error communicating with AI assistant.');
        } finally {
            setSending(false);
        }
    };

    const handleAnalyzeSymptoms = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!symptomText.trim() || analyzingSymptoms) return;
        setAnalyzingSymptoms(true);
        setSymptomResult(null);
        try {
            const res = await chatbotApi.analyzeSymptoms(symptomText.trim());
            if (res.success && res.data) {
                setSymptomResult(res.data);
            }
        } catch (err: any) {
            console.error('Symptom analysis error:', err);
        } finally {
            setAnalyzingSymptoms(false);
        }
    };

    if (_hasHydrated && !authLoading && !isPatient) {
        return <ProtectedPageGate pageType="assistant" />;
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-semibold mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Clinical AI Triage Engine</span>
                </div>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
                    AI Health Assistant
                </h1>
                <p className="text-xs sm:text-sm text-stone-500 font-light mt-1">
                    Instant medical symptom analysis, preventive wellness recommendations, and triage support 24/7.
                </p>
            </div>

            {/* Medical Disclaimer Banner */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed font-light">
                    <strong>Medical Disclaimer:</strong> This AI assistant provides evidence-based educational
                    triage only. It does not provide definitive medical diagnoses, prescriptions, or emergency
                    treatment. Always consult a certified healthcare professional for medical concerns.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Chat Container */}
                <div className="lg:col-span-8 bg-white rounded-3xl border border-stone-200/80 shadow-xs flex flex-col h-[600px] overflow-hidden">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-stone-900">Vaididea Health AI</h3>
                                <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Online • Medical Triage Active
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setMessages([
                                    {
                                        id: 'welcome',
                                        sender: 'assistant',
                                        text: 'New session started. How can I assist with your health questions today?',
                                        timestamp: new Date(),
                                    },
                                ]);
                                initSession();
                            }}
                            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition-colors cursor-pointer"
                            title="Restart Conversation"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Chat Messages Scrollable Box */}
                    <div className="flex-1 p-5 overflow-y-auto space-y-4 font-sans">
                        {messages.map((m) => {
                            const isUser = m.sender === 'user';
                            return (
                                <div
                                    key={m.id}
                                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                                >
                                    {!isUser && (
                                        <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-1">
                                            <Bot className="w-3.5 h-3.5" />
                                        </div>
                                    )}

                                    <div
                                        className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                                            isUser
                                                ? 'bg-vd-forest text-white font-medium rounded-tr-xs'
                                                : 'bg-stone-100/90 text-stone-800 rounded-tl-xs'
                                        }`}
                                    >
                                        <p className="whitespace-pre-wrap">{m.text}</p>

                                        {m.urgency && m.urgency === 'emergency' && (
                                            <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                                <span>Immediate medical emergency recommended.</span>
                                            </div>
                                        )}

                                        <p
                                            className={`text-[9px] mt-1.5 font-mono ${
                                                isUser ? 'text-emerald-100 text-right' : 'text-stone-400'
                                            }`}
                                        >
                                            {new Date(m.timestamp).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>

                                    {isUser && (
                                        <div className="w-7 h-7 rounded-full bg-vd-forest text-white flex items-center justify-center shrink-0 mt-1 text-[10px] font-bold">
                                            ME
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {sending && (
                            <div className="flex items-center gap-2 text-xs text-stone-500 font-light italic">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                                <span>AI is analyzing clinical context...</span>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700">
                                {error}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <form
                        onSubmit={handleSendMessage}
                        className="p-3 border-t border-stone-100 bg-white flex items-center gap-2"
                    >
                        <input
                            type="text"
                            placeholder="Type symptoms or health questions..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={sending}
                            className="flex-1 px-4 py-2.5 rounded-2xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-purple-600 focus:outline-none placeholder:text-stone-400"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || sending}
                            className="px-4 py-2.5 bg-vd-forest hover:bg-vd-forest-deep disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send</span>
                        </button>
                    </form>
                </div>

                {/* Right: Quick Symptom Analyzer Widget */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
                        <div className="flex items-center gap-2 text-purple-800">
                            <Activity className="w-4 h-4" />
                            <h3 className="font-heading font-bold text-base text-stone-900">
                                Quick Symptom Checker
                            </h3>
                        </div>

                        <p className="text-xs text-stone-500 leading-relaxed font-light">
                            Enter comma-separated symptoms (e.g. &ldquo;fever, dry cough, headache&rdquo;) for rapid classification.
                        </p>

                        <form onSubmit={handleAnalyzeSymptoms} className="space-y-3">
                            <textarea
                                rows={3}
                                required
                                value={symptomText}
                                onChange={(e) => setSymptomText(e.target.value)}
                                placeholder="Describe your symptoms..."
                                className="w-full p-3 rounded-2xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-purple-600 focus:outline-none placeholder:text-stone-400"
                            />

                            <button
                                type="submit"
                                disabled={analyzingSymptoms || !symptomText.trim()}
                                className="w-full py-2.5 bg-purple-900 hover:bg-purple-950 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                            >
                                {analyzingSymptoms && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                                <span>Analyze Symptoms</span>
                            </button>
                        </form>

                        {symptomResult && (
                            <div className="pt-3 border-t border-stone-100 space-y-3">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                        Possible Conditions
                                    </p>
                                    <div className="space-y-1 mt-1">
                                        {(symptomResult.possible_conditions || []).map((c: any, idx: number) => (
                                            <div
                                                key={idx}
                                                className="flex justify-between items-center text-xs font-medium text-stone-800 bg-stone-50 p-2 rounded-lg"
                                            >
                                                <span>{c.name}</span>
                                                <span className="font-mono text-[10px] text-stone-500 capitalize">
                                                    {c.probability}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {symptomResult.severity && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-stone-500 font-medium">Urgency Level:</span>
                                        <span className="font-bold text-vd-forest capitalize">
                                            {symptomResult.severity}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
