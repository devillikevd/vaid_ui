'use client';

import { useState, useEffect, useCallback } from 'react';
import { useVitalsStream, VitalsStreamData, VitalsAlert, useSharedAiProof } from '@/hooks/useSocket';
import { featureTogglesApi, consultationsApi } from '@/lib/api';
import {
    Activity, Heart, Wind, Thermometer, Eye, AlertTriangle,
    Brain, Shield, Settings2, ChevronDown, ChevronUp, Loader2,
    Send, Zap, TrendingUp, TrendingDown, Minus, X,
    ToggleLeft, ToggleRight
} from 'lucide-react';

/* ──────────── Types ──────────── */

interface FeatureToggles {
    ai_vitals_monitoring: boolean;
    heart_rate_rppg: boolean;
    respiration_monitoring: boolean;
    spo2_estimation: boolean;
    stress_hrv: boolean;
    drowsiness_detection: boolean;
    pain_level_facs: boolean;
    posture_analysis: boolean;
    fall_detection: boolean;
    tremor_detection: boolean;
    skin_condition_screening: boolean;
    facial_pallor_anemia: boolean;
    facial_asymmetry_stroke: boolean;
    blood_pressure_monitoring: boolean;
    temperature_monitoring: boolean;
    ai_consultation_assistant: boolean;
    automated_consultation_notes: boolean;
    risk_alerts: boolean;
    [key: string]: boolean;
}

interface AIConsultResponse {
    answer: string;
    alerts?: VitalsAlert[];
    possible_conditions?: string[];
    suggested_questions?: string[];
    summary?: string;
    clinical_notes?: string;
    risk_indicators?: string[];
    severity_assessment?: string;
    suggested_medications?: { name: string; dosage: string; frequency: string; duration: string; notes?: string }[];
    differential_diagnoses?: string[];
    recommended_tests?: string[];
    vitals_interpretation?: string;
}

/* ──────────── Vitals Gauge Component ──────────── */

function VitalGauge({ label, value, unit, icon: Icon, color, min, max, warningLow, warningHigh }: {
    label: string; value?: number; unit: string; icon: React.ElementType;
    color: string; min: number; max: number; warningLow?: number; warningHigh?: number;
}) {
    if (value === undefined || value === null) return null;
    const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    const isWarning = (warningLow && value <= warningLow) || (warningHigh && value >= warningHigh);
    const glowClass = isWarning ? 'animate-pulse' : '';

    return (
        <div className={`relative bg-gray-800/60 rounded-xl p-3 border ${isWarning ? 'border-red-500/60' : 'border-gray-700/50'} backdrop-blur-sm ${glowClass}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${isWarning ? 'text-red-400' : color}`} />
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
                </div>
                {isWarning && <AlertTriangle className="w-3 h-3 text-red-400 animate-bounce" />}
            </div>
            <div className="flex items-baseline gap-1">
                <span className={`text-xl font-bold tabular-nums ${isWarning ? 'text-red-400' : 'text-white'}`}>{typeof value === 'number' ? value.toFixed(value % 1 !== 0 ? 1 : 0) : value}</span>
                <span className="text-[10px] text-gray-500">{unit}</span>
            </div>
            <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${isWarning ? 'bg-red-500' : `bg-gradient-to-r ${color === 'text-rose-400' ? 'from-rose-600 to-rose-400' : color === 'text-cyan-400' ? 'from-cyan-600 to-cyan-400' : color === 'text-amber-400' ? 'from-amber-600 to-amber-400' : color === 'text-emerald-400' ? 'from-emerald-600 to-emerald-400' : 'from-blue-600 to-blue-400'}`}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

/* ──────────── Mini Sparkline ──────────── */

function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const w = 120;
    const points = data.slice(0, 30).reverse().map((v, i) => {
        const x = (i / Math.max(data.length - 1, 1)) * w;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={w} height={height} className="opacity-60">
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
    );
}

/* ──────────── Alert Badge ──────────── */

function AlertBadge({ alert }: { alert: VitalsAlert }) {
    const isCritical = alert.severity === 'critical';
    const bg = isCritical
        ? 'bg-red-500/20 border-red-500/50 text-red-300'
        : alert.severity === 'warning'
            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
            : 'bg-blue-500/20 border-blue-500/50 text-blue-300';
    return (
        <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${bg} animate-in fade-in slide-in-from-top-1`}>
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <span>{alert.message}</span>
                <span className="ml-2 text-[9px] opacity-50 font-mono">[{alert.code}]</span>
            </div>
        </div>
    );
}

/* ──────────── Toggle Switch ──────────── */

function ToggleSwitch({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button onClick={() => onChange(!value)} className="flex items-center justify-between w-full py-1.5 group">
            <span className="text-xs text-gray-300 group-hover:text-white transition-colors">{label}</span>
            {value ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-gray-500" />}
        </button>
    );
}

function MeasuredSignals({ vitals }: { vitals: VitalsStreamData }) {
    const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
    const items: { key: string; label: string; value: string; tone: string }[] = [];

    const add = (key: string, label: string, value: string | null | undefined, tone = 'text-gray-300') => {
        if (value === null || value === undefined || value === '') return;
        items.push({ key, label, value, tone });
    };

    add('posture', 'Posture', vitals.posture && vitals.spine_angle ? `${vitals.posture} • ${vitals.spine_angle.toFixed(1)}°` : vitals.posture);
    add('drowsiness', 'Drowsy', vitals.drowsiness_score !== undefined ? formatPercent(vitals.drowsiness_score) : undefined, vitals.drowsiness_score && vitals.drowsiness_score > 0.5 ? 'text-amber-300' : 'text-gray-300');
    add('pain', 'Pain', vitals.pain_score !== undefined ? `${vitals.pain_score}/10` : undefined, vitals.pain_score && vitals.pain_score >= 3 ? 'text-rose-300' : 'text-gray-300');
    add('tremor', 'Tremor', vitals.tremor_detected !== undefined ? (vitals.tremor_detected ? `Yes${vitals.tremor_severity ? ` • ${vitals.tremor_severity}/10` : ''}` : 'No') : undefined, vitals.tremor_detected ? 'text-amber-300' : 'text-gray-300');
    add('pallor', 'Pallor', vitals.pallor_score !== undefined ? `${formatPercent(vitals.pallor_score)}${vitals.hemoglobin_estimate ? ` • Hb ${vitals.hemoglobin_estimate.toFixed(1)}` : ''}` : undefined, vitals.pallor_score && vitals.pallor_score > 0.4 ? 'text-purple-300' : 'text-gray-300');
    add('asymmetry', 'Asymmetry', vitals.facial_asymmetry_score !== undefined ? formatPercent(vitals.facial_asymmetry_score) : undefined, vitals.facial_asymmetry_score && vitals.facial_asymmetry_score > 0.2 ? 'text-red-300' : 'text-gray-300');
    add('stress', 'Stress', vitals.stress_level, vitals.stress_level && vitals.stress_level !== 'low' ? 'text-orange-300' : 'text-gray-300');
    add('skin', 'Skin', vitals.skin_condition, vitals.skin_condition && vitals.skin_condition !== 'normal' ? 'text-cyan-300' : 'text-gray-300');
    add('fall', 'Fall', vitals.fall_detected !== undefined ? (vitals.fall_detected ? 'Detected' : 'No') : undefined, vitals.fall_detected ? 'text-red-300' : 'text-gray-300');

    if (items.length === 0) return null;

    return (
        <div className="bg-gray-800/40 rounded-xl p-3 border border-gray-700/30">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Measured Signals</span>
                <span className="text-[9px] text-gray-500 font-mono">{items.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
                {items.map(item => (
                    <div key={item.key} className="min-h-10 rounded-lg bg-gray-900/45 border border-gray-700/30 px-2 py-1.5">
                        <p className="text-[9px] uppercase tracking-wider text-gray-500 truncate">{item.label}</p>
                        <p className={`text-xs font-semibold truncate ${item.tone}`}>{item.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN: Doctor Vitals + AI Panel
   ════════════════════════════════════════════════════════════════════ */

export default function DoctorVitalsPanel({ consultationId, isDoctor }: { consultationId: string; isDoctor: boolean }) {
    // Feature toggles
    const [toggles, setToggles] = useState<FeatureToggles | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    const { latestVitals, vitalsHistory, alerts } = useVitalsStream(consultationId, 'doctor', toggles);
    const { latestProof } = useSharedAiProof(consultationId);

    // AI Assistant
    const [aiQuery, setAiQuery] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiHistory, setAiHistory] = useState<{ query: string; response: AIConsultResponse }[]>([]);
    const [expandedAI, setExpandedAI] = useState<number | null>(null);

    // Tab state
    const [activeTab, setActiveTab] = useState<'vitals' | 'alerts' | 'ai'>('vitals');

    // HR history for sparkline
    const hrHistory = vitalsHistory.map(v => v.heart_rate).filter(Boolean) as number[];
    // Load toggles
    useEffect(() => {
        if (!isDoctor) return;
        featureTogglesApi.get().then(res => {
            if (res.success && res.data) setToggles(res.data as FeatureToggles);
        }).catch(() => { });
    }, [isDoctor]);

    // Toggle update handler
    const handleToggle = useCallback(async (key: string, value: boolean) => {
        if (!toggles) return;
        const updated = { ...toggles, [key]: value };
        setToggles(updated);
        try {
            await featureTogglesApi.update({ [key]: value });
        } catch { }
    }, [toggles]);

    // AI query handler
    const handleAIQuery = useCallback(async (queryText?: string) => {
        const q = (typeof queryText === 'string' ? queryText : aiQuery).trim();
        if (!q || aiLoading) return;
        setAiQuery('');
        setAiLoading(true);
        setAiError(null);
        try {
            const res = await consultationsApi.aiAssist(consultationId, q, undefined, latestVitals, vitalsHistory);
            if (res.success && res.data) {
                const resp = (res.data as any).response || res.data;
                setAiHistory(prev => [...prev, { query: q, response: resp }]);
            } else {
                setAiError(res.error || 'AI assistant could not process this request right now.');
            }
        } catch (error) {
            setAiError(error instanceof Error ? error.message : 'AI assistant is temporarily unavailable.');
        }
        setAiLoading(false);
    }, [aiLoading, aiQuery, consultationId, latestVitals, vitalsHistory]);

    // Generate Clinical Summary handler
    const handleGenerateSummary = useCallback(async () => {
        if (aiLoading) return;
        setAiLoading(true);
        setAiError(null);
        try {
            const res = await consultationsApi.generateSummary(consultationId, vitalsHistory);
            if (res.success && res.data) {
                // Add the summary to the chat view
                const summaryResp: AIConsultResponse = {
                    answer: "Clinical Summary Generated:\n" + JSON.stringify(res.data, null, 2),
                };
                setAiHistory(prev => [...prev, { query: 'Generate Clinical Summary', response: summaryResp }]);
            } else {
                setAiError(res.error || 'Could not generate clinical summary at this time.');
            }
        } catch (error) {
            setAiError(error instanceof Error ? error.message : 'Failed to generate clinical summary.');
        }
        setAiLoading(false);
    }, [aiLoading, consultationId, vitalsHistory]);

    if (!isDoctor) return null;

    const activeAlerts = alerts.slice(0, 10);
    const measuredSignalCount = latestVitals?.active_signals?.length ?? latestVitals?.total_signals ?? 0;
    const signalConfidence = latestVitals?.confidence ?? latestVitals?.signal_quality;
    const hasClinicalDetails = (response: AIConsultResponse) =>
        Boolean(
            response.suggested_medications?.length ||
            response.differential_diagnoses?.length ||
            response.recommended_tests?.length ||
            response.vitals_interpretation ||
            response.severity_assessment
        );

    return (
        <>
            {/* Panel */}
            <div className="w-80 flex flex-col bg-gray-900/95 border-l border-gray-800 backdrop-blur-xl h-full overflow-hidden">
                {/* Tab Bar */}
                <div className="flex border-b border-gray-800">
                    {[
                        { id: 'vitals' as const, label: 'Vitals', icon: Activity, count: 0 },
                        { id: 'alerts' as const, label: 'Alerts', icon: AlertTriangle, count: activeAlerts.length },
                        { id: 'ai' as const, label: 'AI', icon: Brain, count: 0 },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all ${activeTab === tab.id ? 'text-white border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-gray-500 hover:text-gray-300'}`}>
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                            {tab.count > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 text-[9px] rounded-full bg-red-500 text-white font-bold">{tab.count}</span>
                            )}
                        </button>
                    ))}
                    <button onClick={() => setShowSettings(!showSettings)} className="px-3 text-gray-500 hover:text-gray-300">
                        <Settings2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Settings Dropdown */}
                {showSettings && toggles && (
                    <div className="border-b border-gray-800 bg-gray-800/50 p-3 max-h-64 overflow-y-auto space-y-0.5">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Signal Display</p>
                        <ToggleSwitch label="Heart Rate" value={toggles.heart_rate_rppg} onChange={v => handleToggle('heart_rate_rppg', v)} />
                        <ToggleSwitch label="Respiration" value={toggles.respiration_monitoring} onChange={v => handleToggle('respiration_monitoring', v)} />
                        <ToggleSwitch label="SpO2" value={toggles.spo2_estimation} onChange={v => handleToggle('spo2_estimation', v)} />
                        <ToggleSwitch label="Stress / HRV" value={toggles.stress_hrv} onChange={v => handleToggle('stress_hrv', v)} />
                        <ToggleSwitch label="Drowsiness" value={toggles.drowsiness_detection} onChange={v => handleToggle('drowsiness_detection', v)} />
                        <ToggleSwitch label="Pain Signals" value={toggles.pain_level_facs} onChange={v => handleToggle('pain_level_facs', v)} />
                        <ToggleSwitch label="Posture" value={toggles.posture_analysis} onChange={v => handleToggle('posture_analysis', v)} />
                        <ToggleSwitch label="Alerts" value={toggles.risk_alerts} onChange={v => handleToggle('risk_alerts', v)} />
                    </div>
                )}

                {/* Vitals Tab */}
                {activeTab === 'vitals' && (
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {!latestVitals ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <Activity className="w-8 h-8 mb-3 opacity-30" />
                                <p className="text-sm">Waiting for patient vitals...</p>
                                <p className="text-[10px] mt-1">Vitals will appear when the patient connects</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className={`w-2 h-2 rounded-full ${signalConfidence && signalConfidence > 0.4 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-medium">Live • {new Date(latestVitals.processed_at || '').toLocaleTimeString()}</span>
                                    {measuredSignalCount > 0 && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-gray-800 text-gray-300 font-bold uppercase tracking-wider">
                                            {measuredSignalCount} signals
                                        </span>
                                    )}
                                    {signalConfidence !== undefined && (
                                        <div className="ml-auto flex items-center gap-1.5">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Signal:</span>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider ${
                                                signalConfidence > 0.7 ? 'bg-emerald-500/20 text-emerald-400' :
                                                signalConfidence > 0.4 ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                                {signalConfidence > 0.7 ? 'HIGH' : signalConfidence > 0.4 ? 'MED' : 'LOW'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <VitalGauge label="Heart Rate" value={latestVitals.heart_rate} unit="bpm" icon={Heart} color="text-rose-400" min={30} max={200} warningLow={50} warningHigh={120} />
                                    <VitalGauge label="Respiration" value={latestVitals.respiration_rate} unit="/min" icon={Wind} color="text-cyan-400" min={4} max={40} warningLow={8} warningHigh={25} />
                                    <VitalGauge label="SpO2" value={latestVitals.spo2} unit="%" icon={Activity} color="text-blue-400" min={80} max={100} warningLow={92} />
                                    <VitalGauge label="Temp" value={latestVitals.temperature} unit="°C" icon={Thermometer} color="text-amber-400" min={34} max={42} warningLow={35.5} warningHigh={38.5} />
                                    {latestVitals.blink_rate !== undefined && (
                                        <VitalGauge label="Blink Rate" value={latestVitals.blink_rate} unit="bpm" icon={Eye} color="text-amber-500" min={0} max={60} warningLow={6} warningHigh={45} />
                                    )}
                                    {latestVitals.jaundice_score !== undefined && (
                                        <VitalGauge label="Jaundice" value={latestVitals.jaundice_score} unit="idx" icon={AlertTriangle} color="text-yellow-400" min={0} max={20} warningHigh={12} />
                                    )}
                                    {latestVitals.cyanosis_score !== undefined && (
                                        <VitalGauge label="Cyanosis" value={latestVitals.cyanosis_score} unit="idx" icon={AlertTriangle} color="text-blue-500" min={0} max={0.5} warningHigh={0.15} />
                                    )}
                                    {latestVitals.blood_pressure_systolic && (
                                        <div className="col-span-2 bg-gray-800/60 rounded-xl p-3 border border-gray-700/50">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Blood Pressure</span>
                                            </div>
                                            <span className="text-xl font-bold text-white">{latestVitals.blood_pressure_systolic}/{latestVitals.blood_pressure_diastolic}</span>
                                            <span className="text-[10px] text-gray-500 ml-1">mmHg</span>
                                        </div>
                                    )}
                                </div>

                                {latestProof && (
                                    <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 rounded-xl p-3 border border-emerald-500/30 mb-3 relative overflow-hidden">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Brain className="w-4 h-4 text-emerald-400" />
                                            <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold">Shared AI Diagnosis</span>
                                            <span className="ml-auto text-[10px] text-emerald-500">
                                                {latestProof.timestamp ? new Date(latestProof.timestamp).toLocaleTimeString() : 'Just now'}
                                            </span>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="w-16 h-16 rounded bg-gray-800 flex-shrink-0 border border-gray-700 overflow-hidden">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={latestProof.proofUrl} alt="AI Proof" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex flex-col justify-center">
                                                <div className="text-white font-semibold text-sm">
                                                    {latestProof.modelType?.toUpperCase()}: {latestProof.predictionResult}
                                                </div>
                                                <div className="text-emerald-400 text-xs mt-1 font-medium">
                                                    Confidence: {(latestProof.confidence * 100).toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <MeasuredSignals vitals={latestVitals} />

                                {/* Sparklines */}
                                {hrHistory.length > 2 && (
                                    <div className="bg-gray-800/40 rounded-xl p-3 border border-gray-700/30">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">HR Trend (2 min)</span>
                                            {signalConfidence !== undefined && (
                                                <div className="flex items-center gap-1 w-16">
                                                    <div className="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${signalConfidence > 0.7 ? 'bg-emerald-400' : signalConfidence > 0.4 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${signalConfidence * 100}%` }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <Sparkline data={hrHistory} color="#f43f5e" />
                                    </div>
                                )}

                                {/* Status Indicators */}
                                <div className="space-y-1.5 flex flex-col gap-1.5">
                                    {/* Signal 5: Drowsiness */}
                                    {latestVitals.drowsiness_score && latestVitals.drowsiness_score > 0.5 && (
                                        <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg">
                                            <Eye className="w-3.5 h-3.5" />Drowsy: {(latestVitals.drowsiness_score * 100).toFixed(0)}%
                                        </div>
                                    )}
                                    {/* Signal 7: Posture */}
                                    {latestVitals.posture && latestVitals.posture !== 'normal' && (
                                        <div className="flex items-center justify-between text-xs text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg">
                                            <div className="flex items-center gap-2"><Eye className="w-3.5 h-3.5" />Posture: {latestVitals.posture}</div>
                                            {latestVitals.spine_angle && <span className="opacity-70">{latestVitals.spine_angle.toFixed(1)}°</span>}
                                        </div>
                                    )}
                                    {/* Signal 8: Fall */}
                                    {latestVitals.fall_detected && (
                                        <div className="flex items-center gap-2 text-xs text-red-300 bg-red-500/20 px-3 py-1.5 rounded-lg animate-pulse font-bold">
                                            <AlertTriangle className="w-3.5 h-3.5" />FALL DETECTED
                                        </div>
                                    )}
                                    {/* Signal 4: Stress / HRV */}
                                    {latestVitals.stress_level && latestVitals.stress_level !== 'low' && (
                                        <div className="flex items-center justify-between text-xs text-orange-300 bg-orange-500/10 px-3 py-1.5 rounded-lg">
                                            <div className="flex items-center gap-2"><Zap className="w-3.5 h-3.5" />Stress: {latestVitals.stress_level}</div>
                                            {latestVitals.hrv_rmssd && <span className="opacity-70">RMSSD: {latestVitals.hrv_rmssd}ms</span>}
                                        </div>
                                    )}
                                    {/* Signal 6: Pain Level */}
                                    {latestVitals.pain_score && latestVitals.pain_score >= 3 && (
                                        <div className="flex items-center justify-between text-xs text-rose-300 bg-rose-500/10 px-3 py-1.5 rounded-lg">
                                            <div className="flex items-center gap-2"><Activity className="w-3.5 h-3.5" />Pain Score: {latestVitals.pain_score}/10</div>
                                            {latestVitals.pain_action_units && <span className="opacity-70 text-[9px]">{latestVitals.pain_action_units}</span>}
                                        </div>
                                    )}
                                    {/* Signal 9: Tremor */}
                                    {latestVitals.tremor_detected && latestVitals.tremor_severity && latestVitals.tremor_severity > 2 && (
                                        <div className="flex items-center justify-between text-xs text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg">
                                            <div className="flex items-center gap-2"><Activity className="w-3.5 h-3.5 animate-pulse" />Tremor: {latestVitals.tremor_severity}/10</div>
                                            {latestVitals.tremor_frequency && <span className="opacity-70">{latestVitals.tremor_frequency}Hz</span>}
                                        </div>
                                    )}
                                    {/* Signal 11: Facial Pallor */}
                                    {latestVitals.pallor_score && latestVitals.pallor_score > 0.4 && (
                                        <div className="flex items-center justify-between text-xs text-purple-300 bg-purple-500/10 px-3 py-1.5 rounded-lg">
                                            <div className="flex items-center gap-2"><Eye className="w-3.5 h-3.5" />Pallor: {(latestVitals.pallor_score * 100).toFixed(0)}%</div>
                                            {latestVitals.hemoglobin_estimate && <span className="opacity-70 text-[10px]">Hb: {latestVitals.hemoglobin_estimate.toFixed(1)}</span>}
                                        </div>
                                    )}
                                    {/* Signal 12: Facial Asymmetry */}
                                    {latestVitals.facial_asymmetry_score && latestVitals.facial_asymmetry_score > 0.2 && (
                                        <div className="flex items-center gap-2 text-xs text-red-300 bg-red-500/10 px-3 py-1.5 rounded-lg">
                                            <AlertTriangle className="w-3.5 h-3.5" />Asymmetry: {(latestVitals.facial_asymmetry_score * 100).toFixed(0)}%
                                        </div>
                                    )}
                                    {/* Signal 10: Skin Condition */}
                                    {latestVitals.skin_condition && latestVitals.skin_condition !== 'normal' && (
                                        <div className="flex items-center justify-between text-xs text-cyan-300 bg-cyan-500/10 px-3 py-1.5 rounded-lg">
                                            <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5" />Skin: {latestVitals.skin_condition}</div>
                                            {latestVitals.skin_classification && <span className="opacity-70 text-[9px]">{latestVitals.skin_classification}</span>}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Alerts Tab */}
                {activeTab === 'alerts' && (
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {activeAlerts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <Shield className="w-8 h-8 mb-3 opacity-30" />
                                <p className="text-sm">No active alerts</p>
                                <p className="text-[10px] mt-1">Alerts appear when vitals exceed thresholds</p>
                            </div>
                        ) : (
                            activeAlerts.map((alert, i) => <AlertBadge key={i} alert={alert} />)
                        )}
                    </div>
                )}

                {/* AI Assistant Tab */}
                {activeTab === 'ai' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {aiError && (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-xs text-red-200">
                                    {aiError}
                                </div>
                            )}
                            {aiHistory.length === 0 && !aiLoading && (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <Brain className="w-8 h-8 mb-3 opacity-30" />
                                    <p className="text-sm font-medium">AI Clinical Assistant</p>
                                    <p className="text-[10px] mt-1 text-center px-4">Ask about medications, interactions, differentials, or get vitals interpretation</p>
                                    <div className="mt-4 space-y-1.5 w-full">
                                        {['Interpret current vitals', 'Suggest differential diagnosis', 'Any drug interactions?'].map(q => (
                                            <button key={q} onClick={() => handleAIQuery(q)}
                                                className="w-full text-left text-xs text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 px-3 py-2 rounded-lg border border-gray-700/50 transition-all">
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {aiHistory.map((entry, idx) => (
                                <div key={idx} className="space-y-2">
                                    {/* Query */}
                                    <div className="flex justify-end">
                                        <div className="max-w-[85%] bg-emerald-600/20 border border-emerald-500/30 rounded-xl px-3 py-2">
                                            <p className="text-sm text-emerald-200">{entry.query}</p>
                                        </div>
                                    </div>
                                    {/* Response */}
                                    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl overflow-hidden">
                                        <div className="p-3">
                                            <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{entry.response.answer}</p>
                                        </div>
                                        {/* Alerts from AI */}
                                        {entry.response.alerts && entry.response.alerts.length > 0 && (
                                            <div className="px-3 pb-2 flex flex-wrap gap-1">
                                                {entry.response.alerts.map((a, i) => (
                                                    <span key={i} className={`text-[10px] px-2 py-0.5 rounded-md ${a.severity === 'critical' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>{a.message}</span>
                                                ))}
                                            </div>
                                        )}
                                        {/* Expandable clinical details */}
                                        {hasClinicalDetails(entry.response) && (
                                            <div className="border-t border-gray-700/50">
                                                <button onClick={() => setExpandedAI(expandedAI === idx ? null : idx)}
                                                    className="w-full px-3 py-2 flex items-center justify-between text-[10px] text-gray-400 hover:bg-gray-700/30">
                                                    <span>Clinical Details</span>
                                                    {expandedAI === idx ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                </button>
                                                {expandedAI === idx && (
                                                    <div className="px-3 pb-3 space-y-3 text-xs">
                                                        {entry.response.vitals_interpretation && (
                                                            <div>
                                                                <p className="text-[10px] text-emerald-400 font-medium mb-1">Vitals Interpretation</p>
                                                                <p className="text-gray-300">{entry.response.vitals_interpretation}</p>
                                                            </div>
                                                        )}
                                                        {entry.response.suggested_medications && entry.response.suggested_medications.length > 0 && (
                                                            <div>
                                                                <p className="text-[10px] text-green-400 font-medium mb-1">Medications</p>
                                                                {entry.response.suggested_medications.map((med, mi) => (
                                                                    <div key={mi} className="bg-gray-700/40 rounded-lg p-2 mb-1">
                                                                        <div className="flex justify-between"><span className="font-medium text-white">{med.name}</span><span className="text-gray-400">{med.dosage}</span></div>
                                                                        <p className="text-gray-400">{med.frequency} × {med.duration}</p>
                                                                        {med.notes && <p className="text-yellow-400/80 text-[10px] mt-1">⚠️ {med.notes}</p>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {entry.response.differential_diagnoses && entry.response.differential_diagnoses.length > 0 && (
                                                            <div>
                                                                <p className="text-[10px] text-blue-400 font-medium mb-1">Differentials</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {entry.response.differential_diagnoses.map((dx, di) => (
                                                                        <span key={di} className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md text-[10px]">{dx}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {entry.response.recommended_tests && entry.response.recommended_tests.length > 0 && (
                                                            <div>
                                                                <p className="text-[10px] text-amber-400 font-medium mb-1">Tests</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {entry.response.recommended_tests.map((t, ti) => (
                                                                        <span key={ti} className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md text-[10px]">{t}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {entry.response.severity_assessment && (
                                                            <p className="text-[10px]"><span className="text-gray-400">Severity: </span>
                                                                <span className={`font-medium ${entry.response.severity_assessment === 'severe' || entry.response.severity_assessment === 'critical' ? 'text-red-400' : entry.response.severity_assessment === 'moderate' ? 'text-yellow-400' : 'text-green-400'}`}>
                                                                    {entry.response.severity_assessment}
                                                                </span>
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {aiLoading && (
                                <div className="flex items-center gap-2 text-emerald-300 text-sm"><Loader2 className="w-4 h-4 animate-spin" />Analyzing with live vitals...</div>
                            )}
                        </div>

                        {/* AI Input */}
                        <div className="p-3 border-t border-gray-800 bg-gray-900">
                            <div className="mb-2">
                                <button
                                    onClick={handleGenerateSummary}
                                    disabled={aiLoading}
                                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 rounded-xl border border-blue-500/30 transition-all text-xs font-medium disabled:opacity-50"
                                >
                                    <Brain className="w-3.5 h-3.5" />
                                    Generate Clinical Summary
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="text" value={aiQuery} onChange={e => setAiQuery(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAIQuery()}
                                    placeholder="Ask about meds, interactions..."
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                                    disabled={aiLoading} />
                                <button onClick={() => handleAIQuery()} disabled={aiLoading || !aiQuery.trim()}
                                    className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40">
                                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-[9px] text-gray-600 mt-1.5 text-center">Powered by VAIDIDEA AI • Verify before prescribing</p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
