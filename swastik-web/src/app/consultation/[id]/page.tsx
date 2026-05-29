'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useVideoConsultation, useConsultationChat, useConsultationEnded, useConsultationPatientLeft, useVitalsStream, type ConsultationVideoMode, type VitalsStreamData } from '@/hooks/useSocket';
import { api } from '@/lib/api';
import DoctorVitalsPanel from '@/components/consultation/DoctorVitalsPanel';

import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    Phone,
    MessageCircle,
    FileText,
    Users,
    Maximize,
    Minimize,
    Send,
    X,
    AlertCircle,
    Wifi,
    WifiOff,
    PhoneCall,
    Bot,
} from 'lucide-react';

// ── ICE Servers with TURN fallback for NAT traversal ───────────────
// Primary TURN config comes from env vars (set in Vercel dashboard):
//   NEXT_PUBLIC_TURN_URL, NEXT_PUBLIC_TURN_USERNAME, NEXT_PUBLIC_TURN_CREDENTIAL
// Dynamic TURN config is fetched from backend at runtime via /ice-servers API.
// This constant is only used as a last-resort fallback if both sources fail.
const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // TURN server from Vercel env vars (required for mobile network NAT traversal)
        ...(process.env.NEXT_PUBLIC_TURN_URL
            ? [{
                urls: process.env.NEXT_PUBLIC_TURN_URL,
                username: process.env.NEXT_PUBLIC_TURN_USERNAME || '',
                credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || '',
            }]
            : []),
    ],
    iceTransportPolicy: 'all' as RTCIceTransportPolicy,
};

function normalizeIceServers(payload: any): RTCConfiguration {
    const servers = Array.isArray(payload?.iceServers) ? payload.iceServers : [];
    if (servers.length === 0) return ICE_SERVERS;

    return {
        iceServers: servers
            .map((server: any) => ({
                urls: Array.isArray(server.urls) ? server.urls : [server.urls].filter(Boolean),
                username: server.username || undefined,
                credential: server.credential || undefined,
            }))
            .filter((server: RTCIceServer) => Array.isArray(server.urls) ? server.urls.length > 0 : Boolean(server.urls)),
        iceTransportPolicy: 'all',
    };
}

// ── Network quality classification ─────────────────────────────────
type ConnectionMode = ConsultationVideoMode;
interface NetworkStats { rtt: number; packetsLost: number; bitrate: number; quality: 'excellent' | 'good' | 'poor' | 'critical'; }
interface BrowserSignalSample { timeMs: number; value: number; }
interface RgbStats { red: number; green: number; blue: number; luminance: number; saturation: number; }

function classifyQuality(
    rtt: number,
    lossRate: number,
    bitrate: number,
    mediaKind: 'video' | 'audio' = 'video',
    transportBitrate: number = 0
): NetworkStats['quality'] {
    const effectiveBitrate = Math.max(bitrate, transportBitrate);

    if (lossRate > 25 || rtt > 1200) return 'critical';
    if (lossRate > 12 || rtt > 600) return 'poor';

    if (mediaKind === 'audio') {
        if (rtt > 0 && rtt < 150 && lossRate < 2 && effectiveBitrate > 24) return 'excellent';
        return 'good';
    }

    // Bitrate alone is not a reliable downgrade signal: static frames, camera pauses,
    // and browser estimator quirks can all look like "low bitrate" on healthy links.
    if (rtt > 0 && rtt < 100 && lossRate < 1 && effectiveBitrate > 500) return 'excellent';
    return 'good';
}

function modeRank(mode: ConnectionMode): number {
    switch (mode) {
        case 'chat':
            return 0;
        case 'audio':
            return 1;
        case 'video':
        default:
            return 2;
    }
}

function mostRestrictiveMode(...modes: ConnectionMode[]): ConnectionMode {
    return modes.reduce((current, next) => (modeRank(next) < modeRank(current) ? next : current), 'video');
}

function estimateDominantFrequency(
    samples: BrowserSignalSample[],
    minHz: number,
    maxHz: number,
    minDurationMs: number,
    minSamples: number
): number | null {
    if (samples.length < minSamples) return null;
    const durationMs = samples[samples.length - 1].timeMs - samples[0].timeMs;
    if (durationMs < minDurationMs) return null;

    const mean = samples.reduce((sum, sample) => sum + sample.value, 0) / samples.length;
    let bestHz = 0;
    let bestPower = 0;
    let totalPower = 0;

    for (let hz = minHz; hz <= maxHz; hz += 0.03) {
        let real = 0;
        let imag = 0;
        for (const sample of samples) {
            const t = (sample.timeMs - samples[0].timeMs) / 1000;
            const centered = sample.value - mean;
            const angle = 2 * Math.PI * hz * t;
            real += centered * Math.cos(angle);
            imag -= centered * Math.sin(angle);
        }
        const power = Math.sqrt(real * real + imag * imag);
        totalPower += power;
        if (power > bestPower) {
            bestPower = power;
            bestHz = hz;
        }
    }

    const confidence = totalPower > 0 ? bestPower / totalPower : 0;
    return confidence >= 0.05 ? bestHz : null;
}

function readPatchStats(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
): RgbStats | null {
    const image = context.getImageData(x, y, Math.max(1, width), Math.max(1, height));
    const { data } = image;
    if (data.length === 0) return null;

    let red = 0;
    let green = 0;
    let blue = 0;
    let count = 0;
    for (let index = 0; index < data.length; index += 16) {
        red += data[index] || 0;
        green += data[index + 1] || 0;
        blue += data[index + 2] || 0;
        count += 1;
    }
    if (count === 0) return null;

    red /= count * 255;
    green /= count * 255;
    blue /= count * 255;
    const maxChannel = Math.max(red, green, blue);
    const minChannel = Math.min(red, green, blue);
    const luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
    const saturation = maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;
    return { red, green, blue, luminance, saturation };
}

export default function VideoConsultation() {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuthStore();
    const consultationId = params.id as string;
    const isDoctor = user?.role === 'doctor';

    // Refs
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const prevBytesRef = useRef<number>(0);
    const prevTimestampRef = useRef<number>(0);
    const prevPacketsLostRef = useRef<number>(0);
    const prevPacketsReceivedRef = useRef<number>(0);
    const pendingQualityRef = useRef<NetworkStats['quality'] | null>(null);
    const qualityStreakRef = useRef<number>(0);
    const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
    const hasRemoteDescriptionRef = useRef<boolean>(false);
    const hasInitiatedOfferRef = useRef(false);
    const userMicEnabledRef = useRef(true);
    const userVideoEnabledRef = useRef(true);
    const previousRemoteModeRef = useRef<ConnectionMode>('video');
    const previousRemotePreferredModeRef = useRef<ConnectionMode>('video');
    const previousSampleKindRef = useRef<'video' | 'audio' | null>(null);
    const participantsCountRef = useRef(0);
    const cameraUnavailableRef = useRef(false);
    const bannerTimerRef = useRef<NodeJS.Timeout | null>(null); // BUG-A3: track banner timeout
    const localBandwidthModeRef = useRef<ConnectionMode>('video'); // BUG-A2: stable ref for quality handler
    const chatEndRef = useRef<HTMLDivElement>(null); // MOD-1: auto-scroll chat
    const rtcConfigRef = useRef<RTCConfiguration>(ICE_SERVERS);
    const recoveryTimerRef = useRef<NodeJS.Timeout | null>(null);
    const browserVitalsCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const browserPulseSamplesRef = useRef<BrowserSignalSample[]>([]);
    const browserRespirationSamplesRef = useRef<BrowserSignalSample[]>([]);

    // State
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [consultationData, setConsultationData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [callDuration, setCallDuration] = useState(0);
    const [isPeerReady, setIsPeerReady] = useState(false);
    const [remoteStreamReady, setRemoteStreamReady] = useState(false);
    const [remotePlaybackBlocked, setRemotePlaybackBlocked] = useState(false);

    // ── Network degradation state ──────────────────────────────────
    const [connectionMode, setConnectionMode] = useState<ConnectionMode>('video');
    const [localBandwidthMode, _setLocalBandwidthMode] = useState<ConnectionMode>('video');
    const [localPreferredMode, setLocalPreferredMode] = useState<ConnectionMode>('video');
    const [networkStats, setNetworkStats] = useState<NetworkStats>({ rtt: 0, packetsLost: 0, bitrate: 0, quality: 'good' });

    // BUG-A2: keep ref in sync so handleQualityChange never reads a stale closure
    const setLocalBandwidthMode = useCallback((mode: ConnectionMode) => {
        localBandwidthModeRef.current = mode;
        _setLocalBandwidthMode(mode);
    }, []);
    const [modeBanner, _setModeBanner] = useState<string | null>(null);

    // BUG-A3: wrap setModeBanner to clear any pending timer before setting a new one
    const setModeBannerSafe = useCallback((banner: string | null, autoClearMs?: number) => {
        if (bannerTimerRef.current) { clearTimeout(bannerTimerRef.current); bannerTimerRef.current = null; }
        _setModeBanner(banner);
        if (banner && autoClearMs) {
            bannerTimerRef.current = setTimeout(() => _setModeBanner(null), autoClearMs);
        }
    }, []);

    // ── Doctor side panel state ────────────────────────────────────
    const [showAIPanel, setShowAIPanel] = useState(false);

    // Socket hooks
    const {
        participants,
        offer,
        answer,
        iceCandidate,
        remoteMode,
        remotePreferredMode,
        sendOffer,
        sendAnswer,
        sendIceCandidate,
        sendModeChange,
    } = useVideoConsultation(consultationId, localBandwidthMode, localPreferredMode, connectionMode);

    const { messages, sendMessage, setTyping, typingUsers } = useConsultationChat(consultationId);
    const { sendVitals: sendPatientVitals } = useVitalsStream(user?.role === 'patient' ? consultationId : null, 'patient');

    useEffect(() => {
        participantsCountRef.current = participants.length;
    }, [participants.length]);

    // Chat input state
    const [chatInput, setChatInput] = useState('');
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleChatInputChange = (value: string) => {
        setChatInput(value);
        setTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTyping(false), 2000);
    };

    const applyLocalMediaState = useCallback((effectiveMode: ConnectionMode) => {
        const audioEnabled = userMicEnabledRef.current && effectiveMode !== 'chat';
        const videoEnabled = userVideoEnabledRef.current && effectiveMode === 'video';

        localStreamRef.current?.getAudioTracks().forEach((track) => {
            track.enabled = audioEnabled;
        });
        localStreamRef.current?.getVideoTracks().forEach((track) => {
            track.enabled = videoEnabled;
        });

        setIsMuted(!audioEnabled);
        setIsVideoOn(videoEnabled);
        setConnectionMode(effectiveMode);
        if (effectiveMode === 'chat') {
            setShowChat(true);
        }
    }, []);

    const attachRemoteStreamToElements = useCallback((stream = remoteStreamRef.current) => {
        if (!stream) return;

        if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== stream) {
            remoteAudioRef.current.srcObject = stream;
        }
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== stream) {
            remoteVideoRef.current.srcObject = stream;
        }
    }, []);

    const resumeRemotePlayback = useCallback(async () => {
        const stream = remoteStreamRef.current;
        if (!stream) return;

        attachRemoteStreamToElements(stream);

        try {
            await remoteAudioRef.current?.play();
            setRemotePlaybackBlocked(false);
        } catch (error) {
            console.warn('Remote audio playback blocked:', error);
            setRemotePlaybackBlocked(true);
        }

        remoteVideoRef.current?.play().catch(() => {});
    }, [attachRemoteStreamToElements]);

    useEffect(() => {
        if (!remoteStreamRef.current || !remoteStreamReady) return;
        attachRemoteStreamToElements();
        resumeRemotePlayback();
    }, [attachRemoteStreamToElements, connectionMode, remoteStreamReady, resumeRemotePlayback]);

    // MOD-1: Auto-scroll chat to bottom when new messages arrive
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    useEffect(() => {
        if (user?.role !== 'patient' || !isConnected || !isVideoOn || connectionMode !== 'video') return;

        const trimSamples = (samples: BrowserSignalSample[], windowMs: number, now: number) => {
            while (samples.length > 0 && now - samples[0].timeMs > windowMs) {
                samples.shift();
            }
        };

        const publishBrowserVitals = () => {
            const video = localVideoRef.current;
            if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
                return;
            }

            const canvas = browserVitalsCanvasRef.current || document.createElement('canvas');
            browserVitalsCanvasRef.current = canvas;
            canvas.width = 96;
            canvas.height = 72;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context) return;

            try {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const now = Date.now();
                const facePatch = readPatchStats(context, 28, 12, 40, 34);
                const chestPatch = readPatchStats(context, 24, 42, 48, 22);
                if (!facePatch) return;

                const brightnessQuality = 1 - Math.min(1, Math.abs(facePatch.luminance - 0.55) / 0.55);
                const saturationQuality = Math.min(1, facePatch.saturation / 0.32);
                const signalQuality = Math.max(0, Math.min(1, (brightnessQuality * 0.65) + (saturationQuality * 0.35)));

                const pulseSamples = browserPulseSamplesRef.current;
                pulseSamples.push({
                    timeMs: now,
                    value: facePatch.green - ((facePatch.red + facePatch.blue) * 0.5),
                });
                trimSamples(pulseSamples, 15_000, now);

                const respirationSamples = browserRespirationSamplesRef.current;
                if (chestPatch) {
                    respirationSamples.push({
                        timeMs: now,
                        value: chestPatch.luminance,
                    });
                    trimSamples(respirationSamples, 20_000, now);
                }

                const heartHz = signalQuality >= 0.3
                    ? estimateDominantFrequency(pulseSamples, 0.8, 2.4, 8_000, 6)
                    : null;
                const respirationHz = estimateDominantFrequency(respirationSamples, 0.10, 0.60, 10_000, 7);
                const redRatio = facePatch.red / Math.max(facePatch.green + facePatch.blue, 0.001);
                const pallorScore = Math.max(0, Math.min(1, (((0.42 - facePatch.saturation) / 0.42) * 0.65) + (((0.9 - redRatio) / 0.9) * 0.35)));

                const payload: Partial<VitalsStreamData> & Record<string, unknown> = {
                    session_id: consultationId,
                    processed_at: new Date(now).toISOString(),
                    source: 'web-browser-cv',
                    signal_quality: Number(signalQuality.toFixed(3)),
                    skin_condition: 'normal',
                    fall_detected: false,
                    tremor_detected: false,
                };

                if (heartHz) payload.heart_rate = Number(Math.max(45, Math.min(160, heartHz * 60)).toFixed(1));
                if (respirationHz) payload.respiration_rate = Number(Math.max(6, Math.min(32, respirationHz * 60)).toFixed(1));
                if (Number.isFinite(pallorScore)) payload.pallor_score = Number(pallorScore.toFixed(3));

                payload.active_signals = Object.keys(payload).filter((key) => !['session_id', 'processed_at', 'source', 'active_signals', 'total_signals'].includes(key));
                payload.total_signals = (payload.active_signals as string[]).length;

                sendPatientVitals(payload);
            } catch (error) {
                console.warn('Browser CV vitals sample skipped:', error);
            }
        };

        publishBrowserVitals();
        const interval = window.setInterval(publishBrowserVitals, 1500);
        return () => window.clearInterval(interval);
    }, [consultationId, connectionMode, isConnected, isVideoOn, sendPatientVitals, user?.role]);

    // BUG-A1: Wrap cleanup in useCallback for stable reference in useConsultationEnded
    const cleanup = useCallback(() => {
        if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
        if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        remoteStreamRef.current = null;
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
        hasRemoteDescriptionRef.current = false;
        pendingIceCandidatesRef.current = [];
        hasInitiatedOfferRef.current = false;
        previousSampleKindRef.current = null;
        prevBytesRef.current = 0;
        prevTimestampRef.current = 0;
        prevPacketsLostRef.current = 0;
        prevPacketsReceivedRef.current = 0;
        pendingQualityRef.current = null;
        qualityStreakRef.current = 0;
        cameraUnavailableRef.current = false;
        setLocalPreferredMode('video');
        setRemoteStreamReady(false);
        setRemotePlaybackBlocked(false);
        setIsPeerReady(false);
    }, []);

    // ── Remote call-ended detection ────────────────────────────────
    const [callEndedByRemote, setCallEndedByRemote] = useState(false);
    useConsultationEnded(
        useCallback((data: { consultationId: string }) => {
            if (data.consultationId === consultationId) {
                setCallEndedByRemote(true);
                cleanup();
                setTimeout(() => {
                    router.push(user?.role === 'doctor' ? '/doctor/consultations' : '/');
                }, 4000);
            }
        }, [consultationId, router, user?.role, cleanup])
    );

    useConsultationPatientLeft(
        useCallback((data: { consultationId: string }) => {
            if (!isDoctor || data.consultationId !== consultationId) return;
            localStreamRef.current?.getTracks().forEach((track) => {
                track.enabled = false;
            });
            setLocalBandwidthMode('chat');
            applyLocalMediaState('chat');
            setIsConnected(false);
            setIsMuted(true);
            setIsVideoOn(false);
            setConnectionMode('chat');
            setShowChat(true);
            setRemoteStreamReady(false);
            setRemotePlaybackBlocked(false);
            remoteStreamRef.current = null;
            if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
            setModeBannerSafe('Patient left the consultation', 5000);
            hasInitiatedOfferRef.current = false;
        }, [applyLocalMediaState, consultationId, isDoctor, setLocalBandwidthMode, setModeBannerSafe])
    );

    // Timer for call duration
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isConnected) {
            interval = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isConnected]);

    // Initialize media and peer connection — calls join API first
    useEffect(() => {
        if (!user?.role) return;
        initializeCall();
        return () => { cleanup(); };
    }, [consultationId, user?.role]);

    // Handle incoming WebRTC signaling
    useEffect(() => {
        if (offer) {
            handleIncomingOffer(offer);
        }
    }, [offer]);

    useEffect(() => {
        if (answer && peerConnectionRef.current) {
            handleIncomingAnswer(answer);
        }
    }, [answer]);

    useEffect(() => {
        if (iceCandidate && peerConnectionRef.current) {
            handleIncomingIceCandidate(iceCandidate);
        }
    }, [iceCandidate]);

    // When remote user joins, initiate connection
    useEffect(() => {
        if (participants.length === 0) {
            hasInitiatedOfferRef.current = false;
            return;
        }
        if (isDoctor && isPeerReady && participants.length > 0 && !isConnected && !hasInitiatedOfferRef.current) {
            initiateCall();
        }
    }, [isConnected, isDoctor, isPeerReady, participants]);

    useEffect(() => {
        if (!isPeerReady || participants.length === 0 || isConnected) return;
        if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = setTimeout(() => {
            const pc = peerConnectionRef.current;
            if (!pc || isConnected) return;
            if (pc.connectionState === 'failed' || pc.iceConnectionState === 'failed') {
                restartMediaNegotiation();
            }
            if (isDoctor && !hasInitiatedOfferRef.current) {
                initiateCall();
            }
            setModeBannerSafe('Still connecting media. Chat remains available while video recovers.', 5000);
        }, 8000);
        return () => {
            if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
        };
    }, [isConnected, isDoctor, isPeerReady, participants.length, setModeBannerSafe]);

    useEffect(() => {
        if (participants.length > 0) {
            sendModeChange(localBandwidthMode, localPreferredMode, connectionMode);
        }
    }, [connectionMode, localBandwidthMode, localPreferredMode, participants.length, sendModeChange]);

    useEffect(() => {
        const effectiveMode = mostRestrictiveMode(localBandwidthMode, localPreferredMode, remoteMode);
        applyLocalMediaState(effectiveMode);
    }, [applyLocalMediaState, localBandwidthMode, localPreferredMode, remoteMode]);

    useEffect(() => {
        const previousRemoteMode = previousRemoteModeRef.current;
        const previousRemotePreferredMode = previousRemotePreferredModeRef.current;
        if (remoteMode === previousRemoteMode && remotePreferredMode === previousRemotePreferredMode) return;

        if (remoteMode === 'chat') {
            setModeBannerSafe('Peer switched to Chat mode for network stability', 5000);
        } else if (remoteMode === 'audio') {
            setModeBannerSafe('Peer switched to Audio-only mode for network stability', 5000);
        } else if (remotePreferredMode === 'chat') {
            setModeBannerSafe('Peer switched to Chat mode', 5000);
        } else if (remotePreferredMode === 'audio') {
            setModeBannerSafe('Peer camera is off — Audio-only mode active', 5000);
        } else if (previousRemoteMode !== 'video') {
            setModeBannerSafe('Peer network recovered', 3000);
        } else if (previousRemotePreferredMode !== 'video') {
            setModeBannerSafe('Peer video restored', 3000);
        }

        previousRemoteModeRef.current = remoteMode;
        previousRemotePreferredModeRef.current = remotePreferredMode;
    }, [remoteMode, remotePreferredMode, setModeBannerSafe]);

    // ── Auto-degrade / upgrade mode based on quality ───────────────
    // BUG-A2: Read from ref instead of closure to avoid stale localBandwidthMode
    const handleQualityChange = useCallback((quality: NetworkStats['quality']) => {
        const nextMode: ConnectionMode =
            quality === 'critical' ? 'chat' :
                quality === 'poor' ? 'audio' :
                    'video';

        const currentMode = localBandwidthModeRef.current;
        if (nextMode === currentMode) return;

        setLocalBandwidthMode(nextMode);
        if (modeRank(nextMode) > modeRank(currentMode)) {
            restartMediaNegotiation();
        }
        if (nextMode === 'chat') {
            setModeBannerSafe('⚠️ Very poor network — switched to Chat mode', 5000);
        } else if (nextMode === 'audio' && currentMode === 'video') {
            setModeBannerSafe('📶 Low bandwidth — switched to Audio-only mode', 5000);
        } else if (nextMode === 'audio' && currentMode === 'chat') {
            setModeBannerSafe('📶 Connection stabilizing — switched to Audio-only mode', 5000);
        } else if (nextMode === 'video' && currentMode === 'chat') {
            const restoredMode = mostRestrictiveMode(nextMode, localPreferredMode, remoteMode);
            setModeBannerSafe(restoredMode === 'video' ? '✅ Network recovered — Video restored' : '✅ Network recovered', 3000);
        } else if (nextMode === 'video' && currentMode === 'audio') {
            const restoredMode = mostRestrictiveMode(nextMode, localPreferredMode, remoteMode);
            setModeBannerSafe(restoredMode === 'video' ? '✅ Network improved — Video restored' : '✅ Network improved', 3000);
        }
    }, [localPreferredMode, remoteMode, remotePreferredMode, setLocalBandwidthMode, setModeBannerSafe]);

    // ── Network quality monitoring ─────────────────────────────────
    useEffect(() => {
        if (!isConnected || !peerConnectionRef.current) return;
        statsIntervalRef.current = setInterval(async () => {
            const pc = peerConnectionRef.current;
            if (!pc) return;
            try {
                const stats = await pc.getStats();
                let currentRtt = 0;
                let transportBitrate = 0;
                let videoSample: { kind: 'video'; packetsLost: number; packetsReceived: number; bytesReceived: number; timestamp: number } | null = null;
                let audioSample: { kind: 'audio'; packetsLost: number; packetsReceived: number; bytesReceived: number; timestamp: number } | null = null;
                stats.forEach((report: any) => {
                    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                        currentRtt = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
                        const availableIncomingBitrate = typeof report.availableIncomingBitrate === 'number'
                            ? report.availableIncomingBitrate
                            : 0;
                        const availableOutgoingBitrate = typeof report.availableOutgoingBitrate === 'number'
                            ? report.availableOutgoingBitrate
                            : 0;
                        transportBitrate = Math.max(transportBitrate, availableIncomingBitrate, availableOutgoingBitrate) / 1000;
                    }
                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                        videoSample = {
                            kind: 'video',
                            packetsLost: report.packetsLost || 0,
                            packetsReceived: report.packetsReceived || 0,
                            bytesReceived: report.bytesReceived || 0,
                            timestamp: report.timestamp || 0,
                        };
                    }
                    if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                        audioSample = {
                            kind: 'audio',
                            packetsLost: report.packetsLost || 0,
                            packetsReceived: report.packetsReceived || 0,
                            bytesReceived: report.bytesReceived || 0,
                            timestamp: report.timestamp || 0,
                        };
                    }
                });
                const preferAudioStats = localBandwidthModeRef.current !== 'video';
                const activeSample = preferAudioStats
                    ? (audioSample ?? videoSample)
                    : (videoSample ?? audioSample);
                if (!activeSample) return;

                const { kind, packetsLost, packetsReceived, bytesReceived, timestamp } = activeSample;
                if (previousSampleKindRef.current !== kind) {
                    prevBytesRef.current = 0;
                    prevTimestampRef.current = 0;
                    prevPacketsLostRef.current = 0;
                    prevPacketsReceivedRef.current = 0;
                    previousSampleKindRef.current = kind;
                }
                const deltaPacketsLost = Math.max(0, packetsLost - prevPacketsLostRef.current);
                const deltaPacketsReceived = Math.max(0, packetsReceived - prevPacketsReceivedRef.current);
                const totalDeltaPackets = deltaPacketsLost + deltaPacketsReceived;
                const lossRate = totalDeltaPackets > 0 ? (deltaPacketsLost / totalDeltaPackets) * 100 : 0;
                prevPacketsLostRef.current = packetsLost;
                prevPacketsReceivedRef.current = packetsReceived;
                let bitrate = 0;
                if (prevBytesRef.current > 0 && prevTimestampRef.current > 0) {
                    const timeDiff = (timestamp - prevTimestampRef.current) / 1000;
                    if (timeDiff > 0) {
                        bitrate = Math.max(0, ((bytesReceived - prevBytesRef.current) * 8) / timeDiff / 1000);
                    }
                }
                prevBytesRef.current = bytesReceived;
                prevTimestampRef.current = timestamp;
                const currentMode = localBandwidthModeRef.current;
                const quality: NetworkStats['quality'] = currentMode === 'video'
                    ? classifyQuality(currentRtt, lossRate, bitrate, kind, transportBitrate)
                    : (
                        lossRate > 15 || currentRtt > 800 ? 'critical' :
                            lossRate > 5 || currentRtt > 400 ? 'poor' :
                                currentRtt > 0 && currentRtt < 150 && lossRate < 2 ? 'excellent' :
                                    'good'
                    );
                setNetworkStats({ rtt: Math.round(currentRtt), packetsLost: packetsLost, bitrate: Math.round(bitrate), quality });
                const targetMode: ConnectionMode =
                    quality === 'critical' ? 'chat' :
                        quality === 'poor' ? 'audio' :
                            'video';
                const isDegrading = modeRank(targetMode) < modeRank(currentMode);
                const isRestoring = modeRank(targetMode) > modeRank(currentMode);
                const threshold = isDegrading ? 6 : isRestoring ? 8 : 1;

                if (pendingQualityRef.current === quality) {
                    qualityStreakRef.current += 1;
                } else {
                    pendingQualityRef.current = quality;
                    qualityStreakRef.current = 1;
                }

                if (qualityStreakRef.current >= threshold) {
                    qualityStreakRef.current = 0;
                    handleQualityChange(quality);
                }
            } catch { /* stats unavailable */ }
        }, 3000);
        return () => { if (statsIntervalRef.current) clearInterval(statsIntervalRef.current); };
    }, [handleQualityChange, isConnected]);

    // ── Initialization: join API → media → peer connection ─────────
    const initializeCall = async () => {
        let loadedConsultation: any = null;
        try {
            setError(null);

            const response = user?.role === 'patient'
                ? await api.consultations.join(consultationId)
                : await api.consultations.getDetails(consultationId);

            if (!response.success || !response.data) {
                setError(response.error || response.message || 'Unable to load consultation');
                setIsConnecting(false);
                return;
            }

            loadedConsultation = response.data;
            setConsultationData(loadedConsultation);
        } catch {
            setError('Unable to load consultation');
            setIsConnecting(false);
            return;
        }

        try {
            const iceResponse = await api.consultations.getIceServers(loadedConsultation?.id || consultationId);
            rtcConfigRef.current = iceResponse.success && iceResponse.data
                ? normalizeIceServers(iceResponse.data)
                : ICE_SERVERS;
        } catch {
            rtcConfigRef.current = ICE_SERVERS;
        }

        await initializeMedia();
    };

    const fetchConsultationData = async () => {
        try {
            const response = await api.consultations.getDetails(consultationId);
            if (response.success) {
                setConsultationData(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch consultation:', err);
        }
    };

    const initializeMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            cameraUnavailableRef.current = false;
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            applyLocalMediaState(mostRestrictiveMode(localBandwidthMode, localPreferredMode, remoteMode));
            setupPeerConnection();
            setIsConnecting(false);
        } catch (err) {
            console.error('Media access error:', err);
            // Try audio-only if camera fails
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                cameraUnavailableRef.current = true;
                localStreamRef.current = audioStream;
                userVideoEnabledRef.current = false;
                setLocalPreferredMode('audio');
                applyLocalMediaState(mostRestrictiveMode(localBandwidthMode, 'audio', remoteMode));
                setupPeerConnection();
                setIsConnecting(false);
                setModeBannerSafe('📷 Camera unavailable — Audio-only mode', 4000);
            } catch {
                cameraUnavailableRef.current = true;
                setLocalPreferredMode('chat');
                setError('Failed to access camera and microphone. Please check permissions.');
                setIsConnecting(false);
                setConnectionMode('chat'); setShowChat(true);
            }
        }
    };

    const setupPeerConnection = () => {
        const pc = new RTCPeerConnection(rtcConfigRef.current);
        peerConnectionRef.current = pc;
        setIsPeerReady(true);

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                const sender = pc.addTrack(track, localStreamRef.current!);
                if (track.kind === 'video') {
                    const params = sender.getParameters();
                    if (!params.encodings) {
                        params.encodings = [{}];
                    }
                    // BALANCED is best for telemedicine over harsh networks:
                    // it allows smooth resolution drops without destroying framerate (no lag)
                    params.degradationPreference = 'balanced';
                    params.encodings[0].networkPriority = 'high';
                    sender.setParameters(params).catch(e => console.warn('Failed to set WebRTC encoding params', e));
                }
            });
        }

        // Handle remote stream
        pc.ontrack = (event) => {
            const remoteStream = event.streams[0];
            if (remoteStream) {
                remoteStreamRef.current = remoteStream;
                attachRemoteStreamToElements(remoteStream);
                resumeRemotePlayback();
                setRemoteStreamReady(remoteStream.getVideoTracks().length > 0 || remoteStream.getAudioTracks().length > 0);
            }
            setIsConnected(true);
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendIceCandidate(event.candidate.toJSON());
            }
        };

        // Connection state changes — with reconnection handling
        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            if (state === 'connected') {
                setIsConnected(true);
                setModeBannerSafe(null);
            } else if (state === 'disconnected') {
                setModeBannerSafe('⚠️ Connection interrupted — reconnecting...', 5000);
            } else if (state === 'failed') {
                setLocalBandwidthMode('chat');
                applyLocalMediaState('chat');
                restartMediaNegotiation();
                setModeBannerSafe('Connection lost — switched to Chat mode while media reconnects');
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'failed') restartMediaNegotiation();
        };
    };

    async function initiateCall() {
        try {
            const pc = peerConnectionRef.current;
            if (!pc) return;

            hasInitiatedOfferRef.current = true;
            const offerDescription = await pc.createOffer({
                offerToReceiveVideo: true,
                offerToReceiveAudio: true,
            });

            await pc.setLocalDescription(offerDescription);
            sendOffer(offerDescription);
        } catch (err) {
            console.error('Failed to create offer:', err);
            hasInitiatedOfferRef.current = false;
            setError('Failed to initiate call');
        }
    }

    async function restartMediaNegotiation() {
        const pc = peerConnectionRef.current;
        if (!pc || participantsCountRef.current === 0) return;

        try {
            pc.restartIce();
            hasInitiatedOfferRef.current = true;
            const offerDescription = await pc.createOffer({
                offerToReceiveVideo: true,
                offerToReceiveAudio: true,
                iceRestart: true,
            });
            await pc.setLocalDescription(offerDescription);
            sendOffer(offerDescription);
        } catch (err) {
            console.error('Failed to renegotiate media:', err);
            hasInitiatedOfferRef.current = false;
        }
    }

    const handleIncomingOffer = async (offerData: RTCSessionDescriptionInit) => {
        try {
            const pc = peerConnectionRef.current;
            if (!pc) return;

            if (pc.signalingState !== 'stable') {
                if (isDoctor) {
                    console.log('Glare detected. As the Doctor (caller), ignoring incoming offer (impolite peer).');
                    if (pc.localDescription && pc.localDescription.type === 'offer') {
                        // Re-transmit to break potential deadlocks if our offer was dropped!
                        sendOffer(pc.localDescription);
                    }
                    return;
                } else {
                    console.log('Glare detected. As the Patient (callee), rolling back local description (polite peer).');
                    await Promise.all([
                        pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit),
                    ]);
                    hasInitiatedOfferRef.current = false;
                }
            }

            await pc.setRemoteDescription(new RTCSessionDescription(offerData));
            hasRemoteDescriptionRef.current = true;

            // Drain buffered ICE candidates
            for (const candidate of pendingIceCandidatesRef.current) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingIceCandidatesRef.current = [];

            const answerDescription = await pc.createAnswer();
            await pc.setLocalDescription(answerDescription);

            sendAnswer(answerDescription);
        } catch (err) {
            console.error('Failed to handle offer:', err);
        }
    };

    const handleIncomingAnswer = async (answerData: RTCSessionDescriptionInit) => {
        try {
            const pc = peerConnectionRef.current;
            if (!pc || pc.signalingState !== 'have-local-offer') return;

            await pc.setRemoteDescription(new RTCSessionDescription(answerData));
            hasRemoteDescriptionRef.current = true;

            // Drain buffered ICE candidates
            for (const candidate of pendingIceCandidatesRef.current) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingIceCandidatesRef.current = [];
        } catch (err) {
            console.error('Failed to handle answer:', err);
        }
    };

    const handleIncomingIceCandidate = async (candidate: RTCIceCandidateInit) => {
        try {
            const pc = peerConnectionRef.current;
            if (!pc) return;

            // Buffer ICE candidates until remote description is set
            if (!hasRemoteDescriptionRef.current) {
                pendingIceCandidatesRef.current.push(candidate);
                return;
            }

            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
            console.error('Failed to add ICE candidate:', err);
        }
    };

    const toggleMute = () => {
        userMicEnabledRef.current = !userMicEnabledRef.current;
        applyLocalMediaState(mostRestrictiveMode(localBandwidthMode, localPreferredMode, remoteMode));
    };

    const toggleVideo = () => {
        if (connectionMode === 'chat') return;
        if (cameraUnavailableRef.current) {
            setModeBannerSafe('📷 Camera unavailable — staying in Audio-only mode', 4000);
            return;
        }
        const nextPreferredMode: ConnectionMode = userVideoEnabledRef.current ? 'audio' : 'video';
        userVideoEnabledRef.current = !userVideoEnabledRef.current;
        setLocalPreferredMode(nextPreferredMode);
        applyLocalMediaState(mostRestrictiveMode(localBandwidthMode, nextPreferredMode, remoteMode));
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const endCall = async () => {
        try {
            if (user?.role === 'doctor') {
                await api.consultations.end(consultationId, {
                    duration: callDuration,
                    notes: '',
                });
            } else {
                // Patients leave — they can't end the consultation
                await api.consultations.leave(consultationId).catch(() => {});
            }
        } catch (err) {
            console.error('Failed to end/leave consultation:', err);
        } finally {
            cleanup();
            router.push(user?.role === 'doctor' ? '/doctor/consultations' : '/');
        }
    };

    // BUG-A1: cleanup is now declared above via useCallback for stable reference

    const handleSendMessage = () => {
        if (chatInput.trim()) {
            sendMessage(chatInput.trim());
            setChatInput('');
            setTyping(false);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const counterpartName = user?.role === 'doctor'
        ? (consultationData?.patient?.name || 'Patient')
        : (consultationData?.doctor?.name ? `Dr. ${consultationData.doctor.name}` : 'Doctor');

    return (
        <div className="relative flex h-screen flex-col overflow-hidden bg-[linear-gradient(180deg,#07101f_0%,#0d1730_44%,#13233f_100%)]">
            <audio ref={remoteAudioRef} autoPlay className="hidden" />
            <div className="pointer-events-none absolute -right-20 top-0 h-56 w-56 rounded-full bg-blue-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 bottom-8 h-44 w-44 rounded-full bg-teal-400/10 blur-3xl" />
            {/* ── Remote call-ended overlay ──────────────────────────── */}
            {callEndedByRemote && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-950/90">
                    <Phone className="h-16 w-16 text-red-400 rotate-[135deg]" />
                    <h2 className="text-2xl font-bold text-white">Call Ended</h2>
                    <p className="text-gray-400">The other participant has ended the consultation.</p>
                    <p className="text-gray-500 text-sm">Redirecting in a few seconds…</p>
                    <button
                        onClick={() => router.push(user?.role === 'doctor' ? '/doctor/consultations' : '/')}
                        className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        Go Back Now
                    </button>
                </div>
            )}

            {/* Header */}
            <header className="border-b border-white/10 bg-slate-950/65 px-4 py-3 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 rounded-full bg-white/6 px-3 py-1.5">
                        <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                        <span className="text-sm font-medium text-white">
                            {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Waiting'}
                        </span>
                    </div>
                    {isConnected && (
                        <>
                            <span className="rounded-full bg-white/6 px-3 py-1 text-sm text-slate-200">
                                {formatDuration(callDuration)}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${connectionMode === 'video' ? 'bg-emerald-500/15 text-emerald-300' : connectionMode === 'audio' ? 'bg-amber-500/15 text-amber-300' : 'bg-blue-500/15 text-blue-300'}`}>
                                {connectionMode === 'video' ? 'Video' : connectionMode === 'audio' ? 'Voice' : 'Chat'}
                            </span>
                            <span
                                className={`text-xs ${networkStats.quality === 'excellent' || networkStats.quality === 'good' ? 'text-green-400' : networkStats.quality === 'poor' ? 'text-yellow-400' : 'text-red-400'}`}
                                title={`RTT: ${networkStats.rtt}ms | Bitrate: ${networkStats.bitrate}kbps | Loss: ${networkStats.packetsLost} pkts | Quality: ${networkStats.quality}`}
                            >
                                {networkStats.quality === 'critical' ? <WifiOff className="w-4 h-4 inline" /> : <Wifi className="w-4 h-4 inline" />}
                            </span>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {consultationData && (
                        <span className="text-sm text-slate-300">
                            {user?.role === 'doctor'
                                ? `Patient: ${consultationData.patient?.name}`
                                : `Dr. ${consultationData.doctor?.name}`}
                        </span>
                    )}
                </div>
                </div>
            </header>

            {/* Main Video Area */}
            {modeBanner && (
                <div className="bg-amber-400/95 py-2 text-center text-sm font-medium text-slate-950">
                    {modeBanner}
                </div>
            )}
            <div className={`flex-1 flex overflow-hidden ${showAIPanel ? '' : ''}`}>
            <div className="flex-1 relative overflow-hidden">
                {error && connectionMode !== 'chat' ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-white mb-2">Connection Error</h2>
                            <p className="text-gray-400 mb-4">{error}</p>
                            <button
                                onClick={() => router.back()}
                                className="px-4 py-2 bg-gray-700 text-white rounded-lg"
                            >
                                Go Back
                            </button>
                        </div>
                    </div>
                ) : connectionMode === 'chat' ? (
                    /* ── Full-screen Chat Mode ─────────────────────── */
                    <div className="flex flex-col h-full bg-gray-800">
                        <div className="p-4 border-b border-gray-700 flex items-center gap-3">
                            <MessageCircle className="w-5 h-5 text-blue-400" />
                            <h3 className="font-semibold text-white">Chat Consultation</h3>
                            <span className="text-xs text-gray-400">(Poor network — media disabled)</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.length === 0 && <p className="text-center text-gray-500 mt-8">Send a message to continue the consultation</p>}
                            {messages.map((msg, index) => (
                                <div key={`${msg.userId}-${msg.timestamp}-${index}`} className={`max-w-[80%] p-3 rounded-xl ${msg.userId === user?.id ? 'ml-auto bg-blue-500 text-white' : 'bg-gray-700 text-white'}`}>
                                    <p className="text-sm">{msg.message}</p>
                                    <p className="text-xs opacity-60 mt-1">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        {typingUsers.length > 0 && (
                            <div className="px-4 py-2 border-t border-gray-700/50">
                                <div className="flex items-center gap-2 text-gray-400 text-xs">
                                    <span className="flex gap-0.5"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></span>
                                    <span>Someone is typing…</span>
                                </div>
                            </div>
                        )}
                        <div className="p-4 border-t border-gray-700">
                            <div className="flex items-center gap-2">
                                <input type="text" value={chatInput} onChange={(e) => handleChatInputChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type a message..." className="flex-1 bg-gray-700 border border-gray-600 rounded-xl px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500" />
                                <button onClick={handleSendMessage} className="p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600"><Send className="w-5 h-5" /></button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Remote Video / Audio-only placeholder */}
                        {connectionMode === 'audio' ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 animate-pulse">
                                        <PhoneCall className="w-14 h-14 text-white" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-white mb-1">Audio Consultation</h2>
                                    <p className="text-slate-300 text-sm">Low bandwidth, video paused to keep the call stable.</p>
                                    {isConnected && <p className="text-emerald-400 text-sm mt-2">{formatDuration(callDuration)}</p>}
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Remote Video (Large) */}
                                <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            width={1280}
                            height={720}
                            className="w-full h-full object-contain"
                        />

                        {/* Placeholder when no remote video */}
                        {!remoteStreamReady && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-teal-400">
                                        <Users className="w-12 h-12 text-white" />
                                    </div>
                                    <div className="mb-3 inline-flex rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-slate-200">
                                        Secure teleconsultation
                                    </div>
                                    <h2 className="text-xl font-semibold text-white mb-2">
                                        {isConnecting ? 'Preparing secure call' : `Waiting for ${counterpartName}`}
                                    </h2>
                                    <p className="text-slate-300">The room is ready and we will connect as soon as both sides finish joining.</p>
                                    <div className="mt-4 flex items-center justify-center gap-2">
                                        <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-200">{consultationData?.type || 'Video consultation'}</span>
                                        <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-200">Chat fallback ready</span>
                                    </div>
                                </div>
                            </div>
                        )}
                            </>
                        )}

                        {/* Local Video (Small/PIP) */}
                        <div className="absolute bottom-24 right-4 h-36 w-48 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/60 shadow-2xl backdrop-blur">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-contain ${!isVideoOn && 'hidden'}`}
                            />
                            {!isVideoOn && (
                                <div className="flex h-full w-full items-center justify-center bg-slate-900/90">
                                    {connectionMode === 'audio' ? <Mic className="w-8 h-8 text-emerald-500" /> : <VideoOff className="w-8 h-8 text-gray-500" />}
                                </div>
                            )}
                            <div className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white">
                                You
                            </div>
                        </div>
                    </>
                )}

                {remotePlaybackBlocked && remoteStreamReady && connectionMode !== 'chat' && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <button
                            type="button"
                            onClick={resumeRemotePlayback}
                            className="flex flex-col items-center gap-3 rounded-2xl bg-blue-600/95 px-8 py-6 text-white shadow-2xl shadow-blue-950/50 transition-all hover:bg-blue-700 hover:scale-105 animate-pulse"
                        >
                            <PhoneCall className="h-10 w-10" />
                            <span className="text-lg font-bold">Tap to Enable Audio</span>
                            <span className="text-xs text-blue-200">Browser requires interaction to play sound</span>
                        </button>
                    </div>
                )}

                {/* Chat Panel (side panel — only in video/audio mode) */}
                {showChat && connectionMode !== 'chat' && (
                    <div className="absolute right-0 top-0 bottom-20 flex w-80 flex-col border-l border-white/10 bg-slate-950/78 backdrop-blur-xl">
                        <div className="flex items-center justify-between border-b border-white/10 p-4">
                            <h3 className="font-semibold text-white">Chat</h3>
                            <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.map((msg, index) => (
                                <div
                                    key={`${msg.userId}-${msg.timestamp}-${index}`}
                                    className={`max-w-[80%] p-3 rounded-xl ${msg.userId === user?.id
                                            ? 'ml-auto bg-blue-500 text-white'
                                            : 'bg-gray-700 text-white'
                                        }`}
                                >
                                    <p className="text-sm">{msg.message}</p>
                                    <p className="text-xs opacity-60 mt-1">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {typingUsers.length > 0 && (
                            <div className="px-4 py-2 border-t border-gray-700/50">
                                <div className="flex items-center gap-2 text-gray-400 text-xs">
                                    <span className="flex gap-0.5"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></span>
                                    <span>Someone is typing…</span>
                                </div>
                            </div>
                        )}
                            <div className="border-t border-white/10 p-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => handleChatInputChange(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Type a message..."
                                        className="flex-1 rounded-xl border border-white/10 bg-white/6 px-4 py-2 text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        className="rounded-xl bg-blue-500 p-2 text-white hover:bg-blue-600"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Doctor Vitals + AI Side Panel */}
            {showAIPanel && user?.role === 'doctor' && (
                <DoctorVitalsPanel consultationId={consultationId} isDoctor={user?.role === 'doctor'} />
            )}
            </div>

            {/* Controls Bar */}
            {connectionMode !== 'chat' ? (
            <div className="border-t border-white/10 bg-slate-950/70 px-4 py-4 backdrop-blur-xl">
                <div className="mx-auto flex max-w-3xl items-center justify-center gap-4 rounded-[28px] border border-white/10 bg-white/6 px-4 py-3">
                    {/* Mute Button */}
                    <button
                        onClick={toggleMute}
                        className={`rounded-full p-4 transition-colors ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/15'
                            }`}
                    >
                        {isMuted ? (
                            <MicOff className="w-6 h-6 text-white" />
                        ) : (
                            <Mic className="w-6 h-6 text-white" />
                        )}
                    </button>

                    {/* Video Toggle */}
                    <button
                        onClick={toggleVideo}
                        className={`rounded-full p-4 transition-colors ${!isVideoOn ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/15'
                            }`}
                    >
                        {!isVideoOn ? (
                            <VideoOff className="w-6 h-6 text-white" />
                        ) : (
                            <Video className="w-6 h-6 text-white" />
                        )}
                    </button>

                    {/* End Call */}
                    <button
                        onClick={endCall}
                        className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                    >
                        <Phone className="w-6 h-6 text-white rotate-[135deg]" />
                    </button>

                    {/* Chat Toggle */}
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className={`rounded-full p-4 transition-colors ${showChat ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/15'
                            }`}
                    >
                        <MessageCircle className="w-6 h-6 text-white" />
                    </button>

                    {/* Fullscreen */}
                    <button
                        onClick={toggleFullscreen}
                        className="rounded-full bg-white/10 p-4 transition-colors hover:bg-white/15"
                    >
                        {isFullscreen ? (
                            <Minimize className="w-6 h-6 text-white" />
                        ) : (
                            <Maximize className="w-6 h-6 text-white" />
                        )}
                    </button>

                    {/* Prescription (Doctor only) */}
                    {user?.role === 'doctor' && (
                        <button
                            onClick={() => window.open(`/doctor/prescriptions/new?consultation=${consultationId}`, '_blank')}
                            className="rounded-full bg-white/10 p-4 transition-colors hover:bg-white/15"
                            title="Create Prescription"
                        >
                            <FileText className="w-6 h-6 text-white" />
                        </button>
                    )}

                    {/* AI Clinical Assistant (Doctor only) */}
                    {user?.role === 'doctor' && (
                        <button
                            onClick={() => setShowAIPanel(!showAIPanel)}
                            className={`rounded-full p-4 transition-colors ${showAIPanel ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white/10 hover:bg-white/15'}`}
                            title="Vitals and AI Assistant"
                        >
                            <Bot className="w-6 h-6 text-white" />
                        </button>
                    )}
                </div>
            </div>
            ) : (
                /* Chat-mode end call bar */
                <div className="flex items-center justify-center gap-4 border-t border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur-xl">
                    <button onClick={endCall} className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 rounded-full text-white font-medium">
                        <Phone className="w-5 h-5 rotate-[135deg]" /> End Consultation
                    </button>
                    {user?.role === 'doctor' && (
                        <button onClick={() => window.open(`/doctor/prescriptions/new?consultation=${consultationId}`, '_blank')} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-full text-white font-medium">
                            <FileText className="w-5 h-5" /> Write Prescription
                        </button>
                    )}
                    {user?.role === 'doctor' && (
                        <button onClick={() => setShowAIPanel(!showAIPanel)} className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium ${showAIPanel ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-white/10 hover:bg-white/15 text-white'}`}>
                            <Bot className="w-5 h-5" /> Vitals & AI
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
