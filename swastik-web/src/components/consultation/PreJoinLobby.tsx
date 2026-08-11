import React, { useEffect, useState, useRef } from 'react';
import { Camera, Mic, Speaker, Wifi, Settings, Loader2, Play, MicOff, VideoOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PreJoinLobbyProps {
    consultationData: any;
    onJoin: (videoDeviceId?: string, audioDeviceId?: string) => void;
    onCancel: () => void;
}

interface NetworkStats {
    rtt: number;
    quality: 'excellent' | 'good' | 'fair' | 'poor' | 'checking';
}

export function PreJoinLobby({ consultationData, onJoin, onCancel }: PreJoinLobbyProps) {
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
                setPermissionError('Camera/Microphone permission denied. Please enable them in your browser settings.');
            } else {
                setPermissionError('Failed to access media devices.');
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

    // Simple network check (mocking RTT for lobby)
    useEffect(() => {
        let isMounted = true;
        const checkNetwork = async () => {
            const start = performance.now();
            try {
                // Fetch a small API to gauge RTT
                await fetch('/api/health'); 
                const rtt = performance.now() - start;
                if (!isMounted) return;
                
                let quality: NetworkStats['quality'] = 'good';
                if (rtt < 150) quality = 'excellent';
                else if (rtt > 400) quality = 'poor';
                else if (rtt > 250) quality = 'fair';

                setNetworkStats({ rtt: Math.round(rtt), quality });
            } catch {
                if (isMounted) setNetworkStats({ rtt: 999, quality: 'poor' });
            }
        };

        checkNetwork();
        const interval = setInterval(checkNetwork, 5000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const handleJoin = () => {
        // Stop lobby stream so main page can acquire it
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }
        onJoin(videoDeviceId, audioDeviceId);
    };

    const toggleCamera = () => setIsCameraOn(p => !p);
    const toggleMic = () => setIsMicOn(p => !p);

    const testSpeaker = () => {
        const audio = new Audio('/sounds/test.mp3'); // We'll assume this exists or use a synth beep
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        }
    };

    return (
        <div className="min-h-screen bg-vd-blue flex items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
                
                {/* Left: Video Preview */}
                <div className="md:w-3/5 bg-gray-900 relative min-h-[300px] md:min-h-[500px] flex items-center justify-center">
                    {isCameraOn ? (
                        <video 
                            ref={videoRef}
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                    ) : (
                        <div className="flex flex-col items-center text-gray-400">
                            <VideoOff className="w-16 h-16 mb-4" />
                            <p>Camera is off</p>
                        </div>
                    )}

                    {/* Overlay controls */}
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                        <button 
                            onClick={toggleMic}
                            className={`p-4 rounded-full shadow-lg transition ${isMicOn ? 'bg-gray-800/80 hover:bg-gray-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                        >
                            {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                        </button>
                        <button 
                            onClick={toggleCamera}
                            className={`p-4 rounded-full shadow-lg transition ${isCameraOn ? 'bg-gray-800/80 hover:bg-gray-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                        >
                            {isCameraOn ? <Camera className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                        </button>
                    </div>

                    {permissionError && (
                        <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white p-3 rounded-lg text-sm text-center">
                            {permissionError}
                            <div className="mt-2">
                                <Button size="sm" variant="outline" className="bg-white/20 border-white/30 hover:bg-white/30" onClick={startPreview}>
                                    Retry
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Settings & Details */}
                <div className="md:w-2/5 p-8 flex flex-col">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to join?</h2>
                    
                    {consultationData ? (
                        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                            <p className="text-sm text-gray-500 font-medium">Consultation Details</p>
                            <p className="font-bold text-gray-900 text-lg mt-1">{consultationData.patient?.name || consultationData.doctor?.name}</p>
                            <p className="text-sm text-gray-600 capitalize">{consultationData.type} Consultation</p>
                            <p className="text-sm text-gray-600 mt-2">{new Date(consultationData.date).toLocaleDateString()} | {consultationData.time_slot}</p>
                        </div>
                    ) : (
                        <div className="animate-pulse bg-gray-100 rounded-xl h-24 mb-6"></div>
                    )}

                    <div className="space-y-4 flex-1">
                        {/* Device Dropdowns */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Microphone</label>
                            <select 
                                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-vd-orange"
                                value={audioDeviceId}
                                onChange={e => setAudioDeviceId(e.target.value)}
                            >
                                {devices.filter(d => d.kind === 'audioinput').map(d => (
                                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.substring(0,5)}`}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Camera</label>
                            <select 
                                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-vd-orange"
                                value={videoDeviceId}
                                onChange={e => setVideoDeviceId(e.target.value)}
                            >
                                {devices.filter(d => d.kind === 'videoinput').map(d => (
                                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.substring(0,5)}`}</option>
                                ))}
                            </select>
                        </div>
                        
                        {/* System Checks */}
                        <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <button onClick={testSpeaker} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition" title="Test Speaker">
                                    <Speaker className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-medium text-gray-600">Test Sound</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {networkStats.quality === 'checking' ? (
                                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                                ) : networkStats.quality === 'excellent' || networkStats.quality === 'good' ? (
                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                ) : (
                                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                )}
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-gray-600 capitalize">Net: {networkStats.quality}</span>
                                    {networkStats.quality === 'poor' && <span className="text-[10px] text-yellow-600 leading-tight">May downgrade video</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
                        <Button 
                            className="flex-1 bg-vd-orange hover:bg-orange-600 text-white shadow-lg shadow-orange-200 font-bold" 
                            onClick={handleJoin}
                            disabled={!!permissionError}
                        >
                            Join Consultation
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
