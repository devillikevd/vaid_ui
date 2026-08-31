import React, { useEffect, useState, useRef } from 'react';
import { Camera, Mic, Speaker, Loader2, MicOff, VideoOff, CheckCircle, AlertTriangle, ArrowLeft, ShieldCheck, Video } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface PreJoinLobbyProps {
    consultationData: any;
    onJoin: (videoDeviceId?: string, audioDeviceId?: string, initialCameraState?: boolean, initialMicState?: boolean) => void;
    onCancel: () => void;
}

interface NetworkStats {
    rtt: number;
    quality: 'excellent' | 'good' | 'fair' | 'poor' | 'checking';
}

function formatLobbyDate(dateStr?: string): string {
    if (!dateStr) return 'Scheduled Today';
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    }
    return cleanDate;
}

export function PreJoinLobby({ consultationData, onJoin, onCancel }: PreJoinLobbyProps) {
    const { user } = useAuthStore();
    const isDoctor = user?.role === 'doctor';

    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [videoDeviceId, setVideoDeviceId] = useState<string>('');
    const [audioDeviceId, setAudioDeviceId] = useState<string>('');
    const [speakerDeviceId, setSpeakerDeviceId] = useState<string>('');

    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isMicOn, setIsMicOn] = useState(true);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const [networkStats, setNetworkStats] = useState<NetworkStats>({ rtt: 0, quality: 'checking' });

    // Enumerate devices and set defaults
    const getDevices = async () => {
        try {
            const mediaDevices = await navigator.mediaDevices.enumerateDevices();
            setDevices(mediaDevices);
            
            const videos = mediaDevices.filter(d => d.kind === 'videoinput');
            const audios = mediaDevices.filter(d => d.kind === 'audioinput');
            const speakers = mediaDevices.filter(d => d.kind === 'audiooutput');

            if (videos.length > 0 && !videoDeviceId) setVideoDeviceId(videos[0].deviceId);
            if (audios.length > 0 && !audioDeviceId) setAudioDeviceId(audios[0].deviceId);
            if (speakers.length > 0 && !speakerDeviceId) setSpeakerDeviceId(speakers[0].deviceId);
        } catch (error) {
            console.error('Error enumerating devices', error);
        }
    };

    // Request permissions and start preview stream
    const startPreview = async () => {
        setPermissionError(null);
        try {
            const constraints: MediaStreamConstraints = {
                video: isCameraOn ? (videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true) : false,
                audio: isMicOn ? (audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true) : false
            };

            // Stop previous stream
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
            }

            if (!isCameraOn && !isMicOn) {
                if (videoRef.current) videoRef.current.srcObject = null;
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;

            if (videoRef.current && isCameraOn) {
                videoRef.current.srcObject = stream;
            }

            // Once permission is granted, we can get actual device labels
            await getDevices();

        } catch (err: any) {
            console.error('Preview error:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionError('Camera/Microphone permission denied. Please allow access in browser settings to continue.');
            } else {
                setPermissionError('Failed to access media devices. Check if another app is using your camera/microphone.');
            }
        }
    };

    useEffect(() => {
        startPreview();
        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, [videoDeviceId, audioDeviceId, isCameraOn, isMicOn]);

    // Network check for lobby
    useEffect(() => {
        let isMounted = true;
        const checkNetwork = async () => {
            const start = performance.now();
            try {
                await fetch('/api/proxy/health', { method: 'HEAD' }).catch(() => {});
                const rtt = performance.now() - start;
                if (!isMounted) return;
                
                let quality: NetworkStats['quality'] = 'good';
                if (rtt < 150) quality = 'excellent';
                else if (rtt > 400) quality = 'poor';
                else if (rtt > 250) quality = 'fair';

                setNetworkStats({ rtt: Math.round(rtt), quality });
            } catch {
                if (isMounted) setNetworkStats({ rtt: 120, quality: 'good' });
            }
        };

        checkNetwork();
        const interval = setInterval(checkNetwork, 8000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const handleJoin = () => {
        // Stop lobby stream so main video consultation page can acquire it
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }
        onJoin(videoDeviceId, audioDeviceId, isCameraOn, isMicOn);
    };

    const toggleCamera = () => setIsCameraOn(p => !p);
    const toggleMic = () => setIsMicOn(p => !p);

    const testSpeaker = () => {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 chime
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        }
    };

    const partnerName = isDoctor
        ? (consultationData?.patient?.name || 'Patient')
        : (consultationData?.doctor?.name ? `Dr. ${consultationData.doctor.name}` : 'Doctor');
    
    const partnerSpecialty = isDoctor
        ? 'Patient Consultation'
        : (consultationData?.doctor?.specialization || 'Medical Specialist');

    const appointmentDate = formatLobbyDate(
        consultationData?.appointment_date ||
        consultationData?.appointment?.appointment_date ||
        consultationData?.date
    );

    const timeSlot = consultationData?.time_slot || consultationData?.appointment?.time_slot || 'Scheduled Slot';

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#07101f_0%,#0d1730_44%,#13233f_100%)] flex items-center justify-center p-4 sm:p-6">
            <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-stone-200/80">
                
                {/* Left: Video Preview */}
                <div className="md:w-3/5 bg-stone-950 relative min-h-[300px] md:min-h-[480px] flex items-center justify-center overflow-hidden">
                    {isCameraOn ? (
                        <video 
                            ref={videoRef}
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                    ) : (
                        <div className="flex flex-col items-center text-stone-400 p-6 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-stone-850 flex items-center justify-center mb-3 border border-stone-750">
                                <VideoOff className="w-8 h-8 text-stone-500" />
                            </div>
                            <p className="text-sm font-semibold text-stone-300">Camera is turned off</p>
                            <p className="text-xs text-stone-500 font-light mt-0.5">You can turn it on anytime before or during the call</p>
                        </div>
                    )}

                    {/* Top Status Pill */}
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-white text-xs font-medium">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Camera Check</span>
                    </div>

                    {/* Bottom Media Controls */}
                    <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-3">
                        <button 
                            type="button"
                            onClick={toggleMic}
                            className={`p-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center cursor-pointer ${
                                isMicOn 
                                    ? 'bg-stone-900/85 hover:bg-stone-800 text-white border border-white/15' 
                                    : 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-500'
                            }`}
                            title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
                        >
                            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                        </button>
                        <button 
                            type="button"
                            onClick={toggleCamera}
                            className={`p-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center cursor-pointer ${
                                isCameraOn 
                                    ? 'bg-stone-900/85 hover:bg-stone-800 text-white border border-white/15' 
                                    : 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-500'
                            }`}
                            title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
                        >
                            {isCameraOn ? <Camera className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                        </button>
                    </div>

                    {permissionError && (
                        <div className="absolute inset-x-4 top-4 bg-rose-950/90 border border-rose-500/50 backdrop-blur-md text-white p-4 rounded-2xl text-xs space-y-2">
                            <p className="font-semibold text-rose-200">{permissionError}</p>
                            <button
                                type="button"
                                onClick={startPreview}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Settings & Consultation Information */}
                <div className="md:w-2/5 p-6 sm:p-7 flex flex-col justify-between bg-white">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-vd-forest border border-emerald-200 text-[11px] font-bold uppercase tracking-wider mb-2">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Vaididea Telehealth</span>
                        </div>

                        <h2 className="font-heading text-xl sm:text-2xl font-bold text-stone-900">
                            Ready to join?
                        </h2>
                        <p className="text-xs text-stone-500 font-light mt-0.5 mb-4">
                            Test your audio and video before entering the room.
                        </p>
                        
                        {/* Consultation Meta Box */}
                        <div className="bg-stone-50 rounded-2xl p-4 mb-5 border border-stone-200/70 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] uppercase font-bold tracking-wider text-stone-400">
                                    {isDoctor ? 'Patient' : 'Consulting Specialist'}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-vd-forest bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <Video className="w-3 h-3" /> Video Call
                                </span>
                            </div>
                            <p className="font-heading font-bold text-stone-900 text-base">
                                {partnerName}
                            </p>
                            <p className="text-xs text-vd-forest font-medium">
                                {partnerSpecialty}
                            </p>
                            <div className="pt-1 flex items-center gap-2 text-[11px] text-stone-600 font-mono">
                                <span>{appointmentDate}</span>
                                <span>•</span>
                                <span>{timeSlot}</span>
                            </div>
                        </div>

                        <div className="space-y-3.5">
                            {/* Camera Selector */}
                            <div>
                                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1 block">
                                    Camera
                                </label>
                                <select 
                                    className="w-full bg-white border border-stone-300 rounded-xl p-2 text-xs text-stone-800 outline-none focus:border-vd-forest focus:ring-1 focus:ring-vd-forest"
                                    value={videoDeviceId}
                                    onChange={e => setVideoDeviceId(e.target.value)}
                                >
                                    {devices.filter(d => d.kind === 'videoinput').map(d => (
                                        <option key={d.deviceId} value={d.deviceId}>
                                            {d.label || `Camera ${d.deviceId.substring(0, 6)}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Microphone Selector */}
                            <div>
                                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1 block">
                                    Microphone
                                </label>
                                <select 
                                    className="w-full bg-white border border-stone-300 rounded-xl p-2 text-xs text-stone-800 outline-none focus:border-vd-forest focus:ring-1 focus:ring-vd-forest"
                                    value={audioDeviceId}
                                    onChange={e => setAudioDeviceId(e.target.value)}
                                >
                                    {devices.filter(d => d.kind === 'audioinput').map(d => (
                                        <option key={d.deviceId} value={d.deviceId}>
                                            {d.label || `Microphone ${d.deviceId.substring(0, 6)}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Device & Sound Diagnostics */}
                            <div className="pt-2 border-t border-stone-100 grid grid-cols-2 gap-3">
                                <button 
                                    type="button"
                                    onClick={testSpeaker} 
                                    className="flex items-center gap-2 p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer" 
                                    title="Play test audio chime"
                                >
                                    <Speaker className="w-3.5 h-3.5 text-vd-forest" />
                                    <span>Test Speaker</span>
                                </button>
                                
                                <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-xl border border-stone-100">
                                    {networkStats.quality === 'checking' ? (
                                        <Loader2 className="w-3.5 h-3.5 text-stone-400 animate-spin" />
                                    ) : networkStats.quality === 'excellent' || networkStats.quality === 'good' ? (
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-stone-700 capitalize">
                                            Net: {networkStats.quality}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-6 flex items-center gap-3">
                        <button 
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                        </button>
                        <button 
                            type="button"
                            onClick={handleJoin}
                            className="flex-1 py-2.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer text-center"
                        >
                            Join Consultation
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
