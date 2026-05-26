'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useVideoConsultation, useConsultationChat, useConsultationEnded, useConsultationPatientLeft, type ConsultationVideoMode } from '@/hooks/useSocket';
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
const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // TURN servers (env-configurable, with free fallback for dev)
        ...(process.env.NEXT_PUBLIC_TURN_URL
            ? [{
                urls: process.env.NEXT_PUBLIC_TURN_URL,
                username: process.env.NEXT_PUBLIC_TURN_USERNAME || '',
                credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || '',
            }]
            : [
                { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
                { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
            ]),
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

function classifyQuality(
    rtt: number,
    lossRate: number,
    bitrate: number,
    mediaKind: 'video' | 'audio' = 'video'
): NetworkStats['quality'] {
    if (mediaKind === 'audio') {
        if (rtt < 150 && lossRate < 2 && bitrate > 24) return 'excellent';
        if (rtt < 300 && lossRate < 5 && bitrate > 12) return 'good';
        if (rtt < 600 && lossRate < 15 && bitrate > 6) return 'poor';
        return 'critical';
    }
    if (rtt < 150 && lossRate < 2 && bitrate > 500) return 'excellent';
    if (rtt < 300 && lossRate < 5 && bitrate > 200) return 'good';
    if (rtt < 600 && lossRate < 15 && bitrate > 50) return 'poor';
    return 'critical';
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

export default function VideoConsultation() {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuthStore();
    const consultationId = params.id as string;
    const isDoctor = user?.role === 'doctor';

    // Refs
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
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
    const previousSampleKindRef = useRef<'video' | 'audio' | null>(null);
    const participantsCountRef = useRef(0);
    const cameraUnavailableRef = useRef(false);
    const bannerTimerRef = useRef<NodeJS.Timeout | null>(null); // BUG-A3: track banner timeout
    const localBandwidthModeRef = useRef<ConnectionMode>('video'); // BUG-A2: stable ref for quality handler
    const chatEndRef = useRef<HTMLDivElement>(null); // MOD-1: auto-scroll chat
    const rtcConfigRef = useRef<RTCConfiguration>(ICE_SERVERS);
    const recoveryTimerRef = useRef<NodeJS.Timeout | null>(null);

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

    // ── Network degradation state ──────────────────────────────────
    const [connectionMode, setConnectionMode] = useState<ConnectionMode>('video');
    const [localBandwidthMode, _setLocalBandwidthMode] = useState<ConnectionMode>('video');
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
        sendOffer,
        sendAnswer,
        sendIceCandidate,
        sendModeChange,
    } = useVideoConsultation(consultationId, localBandwidthMode);

    const { messages, sendMessage, setTyping, typingUsers } = useConsultationChat(consultationId);

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

    // MOD-1: Auto-scroll chat to bottom when new messages arrive
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    // BUG-A1: Wrap cleanup in useCallback for stable reference in useConsultationEnded
    const cleanup = useCallback(() => {
        if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
        if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }
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
        setRemoteStreamReady(false);
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
            sendModeChange(localBandwidthMode);
        }
    }, [localBandwidthMode, participants.length, sendModeChange]);

    useEffect(() => {
        const effectiveMode = mostRestrictiveMode(localBandwidthMode, remoteMode);
        applyLocalMediaState(effectiveMode);
    }, [applyLocalMediaState, localBandwidthMode, remoteMode]);

    useEffect(() => {
        if (remoteMode === previousRemoteModeRef.current) return;

        if (remoteMode === 'chat') {
            setModeBannerSafe('Peer switched to Chat mode for network stability', 5000);
        } else if (remoteMode === 'audio') {
            setModeBannerSafe('Peer switched to Audio-only mode for network stability', 5000);
        } else if (previousRemoteModeRef.current !== 'video') {
            setModeBannerSafe('Peer network recovered', 3000);
        }

        previousRemoteModeRef.current = remoteMode;
    }, [remoteMode, setModeBannerSafe]);

    // ── Auto-degrade / upgrade mode based on quality ───────────────
    // BUG-A2: Read from ref instead of closure to avoid stale localBandwidthMode
    const handleQualityChange = useCallback((quality: NetworkStats['quality']) => {
        let nextMode: ConnectionMode =
            quality === 'critical' ? 'chat' :
                quality === 'poor' ? 'audio' :
                    'video';

        if (cameraUnavailableRef.current && nextMode === 'video') {
            nextMode = 'audio';
        }

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
            setModeBannerSafe('✅ Network recovered — Video restored', 3000);
        } else if (nextMode === 'video' && currentMode === 'audio') {
            setModeBannerSafe('✅ Network improved — Video restored', 3000);
        }
    }, [setLocalBandwidthMode, setModeBannerSafe]);

    // ── Network quality monitoring ─────────────────────────────────
    useEffect(() => {
        if (!isConnected || !peerConnectionRef.current) return;
        statsIntervalRef.current = setInterval(async () => {
            const pc = peerConnectionRef.current;
            if (!pc) return;
            try {
                const stats = await pc.getStats();
                let currentRtt = 0;
                let videoSample: { kind: 'video'; packetsLost: number; packetsReceived: number; bytesReceived: number; timestamp: number } | null = null;
                let audioSample: { kind: 'audio'; packetsLost: number; packetsReceived: number; bytesReceived: number; timestamp: number } | null = null;
                stats.forEach((report: any) => {
                    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                        currentRtt = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
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
                let hasUsableBitrateSample = false;
                if (prevBytesRef.current > 0 && prevTimestampRef.current > 0) {
                    const timeDiff = (timestamp - prevTimestampRef.current) / 1000;
                    if (timeDiff > 0) {
                        bitrate = Math.max(0, ((bytesReceived - prevBytesRef.current) * 8) / timeDiff / 1000);
                        hasUsableBitrateSample = true;
                    }
                }
                prevBytesRef.current = bytesReceived;
                prevTimestampRef.current = timestamp;
                const currentMode = localBandwidthModeRef.current;
                if (!hasUsableBitrateSample && currentMode === 'video') return;
                const quality: NetworkStats['quality'] = currentMode === 'video'
                    ? classifyQuality(currentRtt, lossRate, bitrate, kind)
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
                const threshold = isDegrading ? 3 : isRestoring ? 4 : 1;

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
            applyLocalMediaState(mostRestrictiveMode(localBandwidthMode, remoteMode));
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
                setLocalBandwidthMode('audio');
                applyLocalMediaState(mostRestrictiveMode('audio', remoteMode));
                setupPeerConnection();
                setIsConnecting(false);
                setModeBannerSafe('📷 Camera unavailable — Audio-only mode', 4000);
            } catch {
                cameraUnavailableRef.current = true;
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
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // Handle remote stream
        pc.ontrack = (event) => {
            const remoteStream = event.streams[0];
            if (remoteStream) {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remoteStream;
                }
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
            if (pc.signalingState !== 'stable') return;
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
                await Promise.all([
                    pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit),
                ]);
                hasInitiatedOfferRef.current = false;
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
        applyLocalMediaState(mostRestrictiveMode(localBandwidthMode, remoteMode));
    };

    const toggleVideo = () => {
        if (connectionMode === 'chat') return;
        if (cameraUnavailableRef.current) {
            setModeBannerSafe('📷 Camera unavailable — staying in Audio-only mode', 4000);
            return;
        }
        userVideoEnabledRef.current = !userVideoEnabledRef.current;
        applyLocalMediaState(mostRestrictiveMode(localBandwidthMode, remoteMode));
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
                            className="w-full h-full object-cover"
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
                                className={`w-full h-full object-cover ${!isVideoOn && 'hidden'}`}
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
                            onClick={() => router.push(`/doctor/prescriptions/new?consultation=${consultationId}`)}
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
                        <button onClick={() => router.push(`/doctor/prescriptions/new?consultation=${consultationId}`)} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-full text-white font-medium">
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
