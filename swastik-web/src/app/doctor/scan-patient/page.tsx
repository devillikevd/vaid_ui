'use client';

import jsQR from 'jsqr';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL, getTokens } from '@/lib/api';
import {
    ScanLine, Camera, ArrowLeft, Loader2, AlertTriangle,
    CheckCircle, Keyboard, ExternalLink
} from 'lucide-react';
import { DoctorPortalCard } from '@/components/doctor/DoctorPortalCard';
import { Button } from '@/components/ui/Button';

const HEALTH_CARD_TOKEN_PATTERN = '[A-Za-z0-9]{6,16}';
const extractHealthCardToken = (value: string) => {
    const decoded = (() => {
        try { return decodeURIComponent(value); } catch { return value; }
    })();
    const urlMatch = decoded.match(new RegExp(`health-card\\/(${HEALTH_CARD_TOKEN_PATTERN})`, 'i'));
    const rawMatch = decoded.match(new RegExp(`^${HEALTH_CARD_TOKEN_PATTERN}$`, 'i'));
    return (urlMatch?.[1] || (rawMatch ? decoded : null))?.toUpperCase() || null;
};

export default function ScanPatientQRPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationRef = useRef<number>(0);

    const [mode, setMode] = useState<'camera' | 'manual'>('camera');
    const [manualToken, setManualToken] = useState('');
    const [scanning, setScanning] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [validating, setValidating] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; token?: string } | null>(null);

    // Start camera
    useEffect(() => {
        if (mode !== 'camera') return;
        let cancelled = false;

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
                });
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                    setScanning(true);
                    scanFrame();
                }
            } catch (err: any) {
                if (!cancelled) {
                    setCameraError(
                        err.name === 'NotAllowedError' ? 'Camera access denied. Please allow camera permission or use manual entry.' :
                        err.name === 'NotFoundError' ? 'No camera found. Use manual entry instead.' :
                        `Camera error: ${err.message}`
                    );
                }
            }
        };

        startCamera();

        return () => {
            cancelled = true;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            setScanning(false);
        };
    }, [mode]);

    // Frame-by-frame QR scanning using jsQR
    const scanFrame = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const loop = async () => {
            if (!videoRef.current || videoRef.current.readyState !== 4) {
                animationRef.current = requestAnimationFrame(loop);
                return;
            }

            try {
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                }
                
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });
                
                if (code) {
                    const url = code.data;
                    const token = extractHealthCardToken(String(url || ''));
                    if (token) {
                        if (streamRef.current) {
                            streamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop());
                        }
                        setScanning(false);
                        await validateAndNavigate(token);
                        return;
                    }
                }
            } catch {
                // Ignore detection errors, keep scanning
            }
            animationRef.current = requestAnimationFrame(loop);
        };
        animationRef.current = requestAnimationFrame(loop);
    };

    // Validate token and navigate
    const validateAndNavigate = async (token: string) => {
        setValidating(true);
        setResult(null);
        try {
            const { accessToken } = getTokens();
            const res = await fetch(`${API_BASE_URL}/health-card/${token}`, {
                cache: 'no-store',
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setResult({ success: true, message: `Patient: ${data.data.patient.name}`, token });
                // Auto-navigate after 1 second
                setTimeout(() => {
                    window.open(`/health-card/${token}`, '_blank');
                }, 1000);
            } else {
                setResult({ success: false, message: data.message || 'Invalid or expired health card' });
            }
        } catch {
            setResult({ success: false, message: 'Failed to validate health card. Check your connection.' });
        }
        setValidating(false);
    };

    const handleManualSubmit = () => {
        const extracted = extractHealthCardToken(manualToken.trim());
        if (extracted) {
            validateAndNavigate(extracted);
        } else {
            setResult({ success: false, message: 'Invalid token. Paste the full URL or 6-16 character Link ID.' });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">📱 Scan Patient QR</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Scan a patient&apos;s health card QR to view their complete medical records</p>
                </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2">
                <Button variant={mode === 'camera' ? 'primary' : 'outline'} size="sm"
                    onClick={() => { setMode('camera'); setResult(null); setCameraError(null); }}>
                    <Camera className="h-4 w-4 mr-1" /> Camera Scanner
                </Button>
                <Button variant={mode === 'manual' ? 'primary' : 'outline'} size="sm"
                    onClick={() => { setMode('manual'); setResult(null); }}>
                    <Keyboard className="h-4 w-4 mr-1" /> Manual Entry
                </Button>
            </div>

            {/* Camera Mode */}
            {mode === 'camera' && (
                <DoctorPortalCard className="!p-6">
                    {cameraError ? (
                        <div className="text-center py-12">
                            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                            <p className="text-gray-700 dark:text-gray-300 mb-4">{cameraError}</p>
                            <Button variant="outline" onClick={() => setMode('manual')}>
                                <Keyboard className="h-4 w-4 mr-1" /> Use Manual Entry
                            </Button>
                        </div>
                    ) : (
                        <div className="relative">
                            <video ref={videoRef} className="w-full max-h-[400px] rounded-xl bg-black object-cover" playsInline muted />
                            <canvas ref={canvasRef} className="hidden" />
                            {scanning && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-48 h-48 border-2 border-purple-400 rounded-2xl relative">
                                        <ScanLine className="absolute inset-0 m-auto h-6 w-6 text-purple-400 animate-pulse" />
                                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-purple-500 rounded-tl-lg" />
                                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-purple-500 rounded-tr-lg" />
                                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-purple-500 rounded-bl-lg" />
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-purple-500 rounded-br-lg" />
                                    </div>
                                </div>
                            )}
                            {scanning && (
                                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">Point the camera at the patient&apos;s health card QR code</p>
                            )}
                        </div>
                    )}
                </DoctorPortalCard>
            )}

            {/* Manual Mode */}
            {mode === 'manual' && (
                <div className="max-w-md mx-auto mt-8">
                    <DoctorPortalCard className="!p-8 border-purple-100 dark:border-purple-900/30 shadow-lg shadow-purple-500/5 overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-gray-900 pointer-events-none" />
                        <div className="relative z-10">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-2xl flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400">
                                    <Keyboard className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Manual Link ID</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Enter the 6-character Link ID or paste the full health card URL shared by the patient.
                                </p>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={manualToken} 
                                        onChange={e => setManualToken(e.target.value.toUpperCase())}
                                        placeholder="e.g. A2B9X1"
                                        className="w-full py-4 text-xl font-mono tracking-widest uppercase border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:text-base text-center"
                                        onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                                    />
                                </div>
                                <Button 
                                    onClick={handleManualSubmit} 
                                    disabled={!manualToken.trim() || validating}
                                    className="w-full py-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-lg shadow-md shadow-purple-500/20 transition-all"
                                >
                                    {validating ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                            Validating...
                                        </>
                                    ) : (
                                        'View Patient Records'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DoctorPortalCard>
                </div>
            )}

            {/* Result */}
            {validating && (
                <DoctorPortalCard className="!p-6 mt-6">
                    <div className="flex items-center justify-center gap-3 py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                        <span className="text-gray-600 dark:text-gray-400">Validating health card...</span>
                    </div>
                </DoctorPortalCard>
            )}

            {result && (
                <DoctorPortalCard className={`!p-6 mt-6 ${result.success ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                    <div className="flex items-center gap-3 py-2">
                        {result.success ? (
                            <>
                                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="font-medium text-green-800">{result.message}</p>
                                    <p className="text-sm text-green-600 mt-1">Opening health record...</p>
                                </div>
                                {result.token && (
                                    <Button size="sm" variant="outline"
                                        onClick={() => window.open(`/health-card/${result.token}`, '_blank')}>
                                        <ExternalLink className="h-4 w-4 mr-1" /> Open
                                    </Button>
                                )}
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-red-800">{result.message}</p>
                                    <p className="text-sm text-red-600 mt-1">Ask the patient to generate a new QR code from their app.</p>
                                </div>
                            </>
                        )}
                    </div>
                </DoctorPortalCard>
            )}

            {/* Instructions */}
            <DoctorPortalCard className="!p-6 mt-6">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 mt-4">How it works</h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>1️⃣ Patient opens the VAIDIDEA app → Home Screen → taps <strong>&quot;Digital Health Identity&quot;</strong> card</p>
                    <p>2️⃣ Patient taps <strong>&quot;Generate QR Code&quot;</strong> to view the QR code and Link ID</p>
                    <p>3️⃣ Scan the QR code here or click <strong>&quot;Manual Entry&quot;</strong> above to enter the Link ID</p>
                    <p>4️⃣ Complete medical records open instantly — prescriptions, reports, vitals, allergies</p>
                    <p className="text-xs text-gray-400 mt-3">🔒 Health cards are time-limited (24h) and patient-controlled. The patient can revoke access anytime.</p>
                </div>
            </DoctorPortalCard>
        </div>
    );
}
