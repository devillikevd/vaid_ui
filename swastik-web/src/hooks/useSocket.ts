'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { vitalsApi } from '@/lib/api';
import { PUBLIC_AI_WS_URL, PUBLIC_SOCKET_URL } from '@/lib/env';
import { useAuthStore } from '@/stores/authStore';

// Socket.IO event types
export interface Notification {
    id?: string;
    type: string;
    title: string;
    message: string;
    timestamp: string;
    data?: Record<string, unknown>;
}

export interface AppointmentUpdate {
    id?: string;
    appointmentId?: string;
    patient_id?: string;
    doctor_id?: string;
    status: string;
    doctorName?: string;
    date?: string;
    appointment_date?: string;
    timeSlot?: string;
    time_slot?: string;
    timestamp?: string;
}

// AmbulanceUpdate type moved to hooks/useAmbulanceTracking.ts (AmbulancePosition)

export interface OrderUpdate {
    orderId: string;
    orderNumber: string;
    status: string;
    message: string;
    timestamp: string;
}

export interface DiagnosticBookingUpdate {
    id: string;
    status: string;
    patient_name?: string;
    test_name?: string;
    booking_date?: string;
    result_url?: string;
    message?: string;
    timestamp?: string;
}

export interface VitalUpdate {
    patientId: string;
    vital: {
        id: string;
        type: string;
        value: string;
        unit?: string;
        notes?: string;
        recorded_at: string;
    };
}

export interface ConsultationReady {
    consultationId: string;
    doctorName: string;
    roomId: string;
    timestamp: string;
}

export interface ChatMessage {
    id?: string;
    consultationId?: string;
    userId: string;
    message: string;
    timestamp: string;
}

export interface ConsultationStarted {
    consultationId: string;
    appointmentId: string;
    doctorName: string;
    roomId: string;
    type?: string;
    timestamp: string;
}

export interface ConsultationEnded {
    consultationId: string;
    appointmentId?: string;
    duration?: number;
    prescriptionId?: string;
    timestamp: string;
}

export interface ConsultationPatientLeft {
    consultationId: string;
    patientUserId: string;
    doctorUserId?: string;
    timestamp: string;
}

export type ConsultationVideoMode = 'video' | 'audio' | 'chat';

export interface ConsultationModeUpdate {
    roomId: string;
    mode: ConsultationVideoMode;
    preferredMode?: ConsultationVideoMode;
    effectiveMode?: ConsultationVideoMode;
    from?: string;
    timestamp?: string;
}

export interface PrescriptionUpdate {
    id: string;
    consultationId?: string;
    doctorName?: string;
    medications?: unknown[];
    diagnosis?: string;
    timestamp: string;
}

// Socket connection options
const SOCKET_URL = PUBLIC_SOCKET_URL;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SocketListener = (...args: any[]) => void;

// ── Singleton socket instance (shared across all useSocket() calls) ──
let globalSocket: Socket | null = null;
let globalSocketToken: string | null = null;
let socketRefCount = 0;
let disconnectTimer: NodeJS.Timeout | null = null;
const globalEventListeners = new Map<string, Set<SocketListener>>();

function attachGlobalEventListeners(socket: Socket) {
    for (const [event, listeners] of globalEventListeners.entries()) {
        listeners.forEach((listener) => {
            socket.on(event, listener);
        });
    }
}

function addGlobalEventListener(event: string, listener: SocketListener) {
    let listeners = globalEventListeners.get(event);
    if (!listeners) {
        listeners = new Set<SocketListener>();
        globalEventListeners.set(event, listeners);
    }
    if (listeners.has(listener)) return;
    listeners.add(listener);
    globalSocket?.on(event, listener);
}

function removeGlobalEventListener(event: string, listener?: SocketListener) {
    const listeners = globalEventListeners.get(event);
    if (!listeners) return;

    if (listener) {
        listeners.delete(listener);
        globalSocket?.off(event, listener);
        if (listeners.size === 0) {
            globalEventListeners.delete(event);
        }
        return;
    }

    listeners.forEach((registeredListener) => {
        globalSocket?.off(event, registeredListener);
    });
    globalEventListeners.delete(event);
}

function getOrCreateSocket(token: string): Socket {
    // BUG-02 Fix: If token changed, disconnect old socket and create new one
    // This handles token refresh — the socket must re-auth with the new JWT
    if (globalSocket && globalSocketToken === token) {
        return globalSocket;
    }

    // Token changed or no socket — disconnect old and create new
    if (globalSocket) {
        globalSocket.removeAllListeners();
        globalSocket.disconnect();
        globalSocket = null;
    }

    globalSocketToken = token;
    globalSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        randomizationFactor: 0.5,
    });

    attachGlobalEventListeners(globalSocket);

    globalSocket.on('connect', () => {
        console.log('Socket connected:', globalSocket?.id);
        globalSocket?.emit('subscribe:notifications');
        // Subscribe to role-specific channel for targeted broadcasts
        globalSocket?.emit('subscribe:role');
    });

    return globalSocket;
}

/**
 * Hook for managing Socket.IO connection and real-time events.
 * Uses a SINGLETON socket — multiple components calling useSocket()
 * share the same underlying connection.
 */
export function useSocket() {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastPing, setLastPing] = useState<Date | null>(null);
    const { accessToken, isAuthenticated } = useAuthStore();

    // Initialize socket connection (singleton)
    useEffect(() => {
        if (!isAuthenticated || !accessToken) {
            if (socketRef.current) {
                socketRef.current = null;
                setIsConnected(false);
            }
            return;
        }

        const socket = getOrCreateSocket(accessToken);
        socketRef.current = socket;
        socketRefCount++;
        if (disconnectTimer) {
            clearTimeout(disconnectTimer);
            disconnectTimer = null;
        }

        // Track connection state locally
        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);
        const onConnectError = () => setIsConnected(false);
        const onPong = () => setLastPing(new Date());

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);
        socket.on('pong', onPong);

        // Set initial state
        setIsConnected(socket.connected);

        // If not yet connected, connect
        if (!socket.connected) {
            socket.connect();
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.off('pong', onPong);
            // BUG-06 Fix: Only decrement if this cleanup corresponds to a real mount
            // React Strict Mode double-invokes effects, so guard against going negative
            socketRefCount = Math.max(0, socketRefCount - 1);

            // Only disconnect when last consumer unmounts AND not in strict mode re-run
            if (socketRefCount === 0 && globalSocket === socket) {
                disconnectTimer = setTimeout(() => {
                    if (socketRefCount === 0 && globalSocket === socket) {
                        socket.disconnect();
                        globalSocket = null;
                        globalSocketToken = null;
                    }
                }, 500);
            }
            socketRef.current = null;
        };
    }, [isAuthenticated, accessToken]);

    // Get socket instance
    const getSocket = useCallback(() => socketRef.current, []);

    // Emit event
    const emit = useCallback((event: string, data?: unknown) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data);
        }
    }, []);

    // Subscribe to event
    const on = useCallback((event: string, callback: SocketListener) => {
        addGlobalEventListener(event, callback);
        return () => {
            removeGlobalEventListener(event, callback);
        };
    }, []);

    // Unsubscribe from event
    const off = useCallback((event: string, callback?: SocketListener) => {
        removeGlobalEventListener(event, callback);
    }, []);

    return {
        socket: socketRef.current,
        isConnected,
        lastPing,
        emit,
        on,
        off,
        getSocket,
    };
}

/**
 * Hook for handling notifications — persists in localStorage to survive page refreshes.
 */
export function useNotifications(onNotification?: (notification: Notification) => void) {
    const dedupeNotifications = useCallback((list: Notification[]) => {
        const seenIds = new Set<string>();
        const unique: Notification[] = [];

        for (const n of list) {
            const id = n.id?.trim();
            if (id) {
                if (seenIds.has(id)) continue;
                seenIds.add(id);
            }
            unique.push(n);
            if (unique.length >= 50) break;
        }

        return unique;
    }, []);

    const { on } = useSocket();
    const { user, isAuthenticated } = useAuthStore();
    const storageKey = user?.id && user?.role
        ? `swastik-notifications:${user.id}:${user.role}`
        : null;

    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Hydrate notifications for current authenticated role/user only.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!isAuthenticated || !storageKey) {
            setNotifications([]);
            return;
        }

        try {
            const stored = localStorage.getItem(storageKey);
            if (!stored) {
                setNotifications([]);
                return;
            }

            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) {
                setNotifications([]);
                return;
            }

            const seenIds = new Set<string>();
            const unique: Notification[] = [];
            for (const n of parsed as Notification[]) {
                const id = n?.id?.trim();
                if (id) {
                    if (seenIds.has(id)) continue;
                    seenIds.add(id);
                }
                unique.push(n);
                if (unique.length >= 50) break;
            }
            setNotifications(unique);
        } catch {
            // Corrupted scoped cache — clear only this user's scoped key
            try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
            setNotifications([]);
        }
    }, [isAuthenticated, storageKey]);

    // Persist to localStorage whenever notifications change
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!storageKey) return;
        try {
            localStorage.setItem(storageKey, JSON.stringify(notifications.slice(0, 50)));
        } catch { /* quota exceeded — ignore */ }
    }, [notifications, storageKey]);

    useEffect(() => {
        const handleNotification = (notification: Notification) => {
            // Optional role-target guard if payload contains role hint
            const targetRole = (notification?.data?.role || notification?.data?.targetRole) as string | undefined;
            if (targetRole && user?.role && targetRole !== user.role) {
                return;
            }
            setNotifications((prev) => dedupeNotifications([notification, ...prev]));
            onNotification?.(notification);
        };

        return on('notification:new', handleNotification);
    }, [on, onNotification, dedupeNotifications, user?.role]);

    // BUG-14 Fix: Mark a notification as read
    const markRead = useCallback((notificationId: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
    }, []);

    const markAllRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
        if (typeof window !== 'undefined' && storageKey) {
            localStorage.removeItem(storageKey);
        }
    }, [storageKey]);

    // BUG-14 Fix: unreadCount now counts only notifications without read flag
    const unreadCount = notifications.filter((n) => !(n as any).read).length;

    return { notifications, unreadCount, clearNotifications, markRead, markAllRead };
}

/**
 * Hook for handling appointment updates
 */
export function useAppointmentUpdates(onUpdate?: (update: AppointmentUpdate) => void) {
    const { on } = useSocket();
    const [lastUpdate, setLastUpdate] = useState<AppointmentUpdate | null>(null);

    useEffect(() => {
        const handleUpdate = (update: AppointmentUpdate) => {
            setLastUpdate(update);
            onUpdate?.(update);
        };

        const unsubUpdate = on('appointment:update', handleUpdate);
        const unsubNew = on('appointment:new', handleUpdate);
        const unsubConfirmed = on('appointment:confirmed', handleUpdate);
        const unsubCancelled = on('appointment:cancelled', handleUpdate);

        return () => {
            unsubUpdate();
            unsubNew();
            unsubConfirmed();
            unsubCancelled();
        };
    }, [on, onUpdate]);

    return { lastUpdate };
}

// NOTE: useAmbulanceTracking is in hooks/useAmbulanceTracking.ts (dedicated file with start/stop controls)

/**
 * Hook for order updates
 */
export function useOrderUpdates(onUpdate?: (update: OrderUpdate) => void, onNewOrder?: (order: OrderUpdate) => void) {
    const { on } = useSocket();
    const [lastUpdate, setLastUpdate] = useState<OrderUpdate | null>(null);
    const [newOrders, setNewOrders] = useState<OrderUpdate[]>([]);

    useEffect(() => {
        const handleUpdate = (update: OrderUpdate) => {
            setLastUpdate(update);
            onUpdate?.(update);
        };

        const handleNewOrder = (order: OrderUpdate) => {
            setNewOrders((prev) => [order, ...prev].slice(0, 20));
            onNewOrder?.(order);
        };

        const unsubUpdate = on('order:update', handleUpdate);
        const unsubNew = on('order:new', handleNewOrder);

        return () => {
            unsubUpdate();
            unsubNew();
        };
    }, [on, onUpdate, onNewOrder]);

    return { lastUpdate, newOrders };
}

/**
 * Hook for diagnostic booking updates (for diagnostic center owners)
 */
export function useDiagnosticUpdates(
    onNewBooking?: (booking: DiagnosticBookingUpdate) => void,
    onStatusUpdate?: (booking: DiagnosticBookingUpdate) => void,
    onResultReady?: (booking: DiagnosticBookingUpdate) => void
) {
    const { on } = useSocket();
    const [newBookings, setNewBookings] = useState<DiagnosticBookingUpdate[]>([]);
    const [lastUpdate, setLastUpdate] = useState<DiagnosticBookingUpdate | null>(null);

    useEffect(() => {
        const handleNewBooking = (booking: DiagnosticBookingUpdate) => {
            setNewBookings((prev) => [booking, ...prev].slice(0, 20));
            onNewBooking?.(booking);
        };

        const handleStatusUpdate = (booking: DiagnosticBookingUpdate) => {
            setLastUpdate(booking);
            onStatusUpdate?.(booking);
        };

        const handleResultReady = (booking: DiagnosticBookingUpdate) => {
            setLastUpdate(booking);
            onResultReady?.(booking);
        };

        const unsubs = [
            on('diagnostic:new-booking', handleNewBooking),
            on('diagnostic:booking-confirmed', handleNewBooking),
            on('diagnostic:booking-updated', handleStatusUpdate),
            on('diagnostic:result-ready', handleResultReady),
        ];

        return () => { unsubs.forEach((unsub) => unsub()); };
    }, [on, onNewBooking, onStatusUpdate, onResultReady]);

    return { newBookings, lastUpdate };
}

/**
 * Hook for vitals updates (for doctors)
 */
export function useVitalsUpdates(onNewVital?: (vital: VitalUpdate) => void) {
    const { on } = useSocket();
    const [newVitals, setNewVitals] = useState<VitalUpdate[]>([]);

    useEffect(() => {
        const handleNewVital = (vital: VitalUpdate) => {
            setNewVitals((prev) => [vital, ...prev].slice(0, 50));
            onNewVital?.(vital);
        };

        return on('vitals:new', handleNewVital);
    }, [on, onNewVital]);

    return { newVitals };
}

/**
 * Hook for video consultation events
 */
export function useVideoConsultation(
    roomId: string | null,
    localMode?: ConsultationVideoMode,
    localPreferredMode: ConsultationVideoMode = 'video',
    localEffectiveMode: ConsultationVideoMode = localMode || localPreferredMode
) {
    const { emit, on } = useSocket();
    const [participants, setParticipants] = useState<string[]>([]);
    const [offer, setOffer] = useState<RTCSessionDescriptionInit | null>(null);
    const [answer, setAnswer] = useState<RTCSessionDescriptionInit | null>(null);
    const [iceCandidates, setIceCandidates] = useState<RTCIceCandidateInit[]>([]);
    const [remoteMode, setRemoteMode] = useState<ConsultationVideoMode>('video');
    const [remotePreferredMode, setRemotePreferredMode] = useState<ConsultationVideoMode>('video');
    const [remoteEffectiveMode, setRemoteEffectiveMode] = useState<ConsultationVideoMode>('video');
    const localModeRef = useRef<ConsultationVideoMode | undefined>(localMode);
    const localPreferredModeRef = useRef<ConsultationVideoMode>(localPreferredMode);
    const localEffectiveModeRef = useRef<ConsultationVideoMode>(localEffectiveMode);

    const emitModeState = useCallback((targetRoomId: string) => {
        if (!localModeRef.current) return;
        emit('video:mode', {
            roomId: targetRoomId,
            mode: localModeRef.current,
            preferredMode: localPreferredModeRef.current,
            effectiveMode: localEffectiveModeRef.current,
        });
    }, [emit]);

    useEffect(() => {
        localModeRef.current = localMode;
        localPreferredModeRef.current = localPreferredMode;
        localEffectiveModeRef.current = localEffectiveMode;
        if (roomId && localMode) {
            emitModeState(roomId);
        }
    }, [roomId, localMode, localPreferredMode, localEffectiveMode, emitModeState]);

    useEffect(() => {
        if (!roomId) return;

        const joinRoom = () => emit('video:join', roomId);
        const handleConnect = () => {
            joinRoom();
            emitModeState(roomId);
        };

        // BUG-21 Fix: Only update state if the participant is actually new
        const handleUserJoined = (data: { userId: string }) => {
            setParticipants((prev) => {
                if (prev.includes(data.userId)) return prev;
                return [...prev, data.userId];
            });
        };

        const handleUserLeft = (data: { userId: string }) => {
            setParticipants((prev) => {
                const next = prev.filter((id) => id !== data.userId);
                if (next.length === 0) {
                    setRemoteMode('video');
                    setRemotePreferredMode('video');
                    setRemoteEffectiveMode('video');
                }
                return next;
            });
        };

        const handleRoomState = (data: { roomId?: string; participants?: string[] }) => {
            if (data?.roomId && data.roomId !== roomId) return;
            if (!Array.isArray(data?.participants) || data.participants.length === 0) return;
            const roomParticipants = data.participants;
            setParticipants((prev) => [...new Set([...prev, ...roomParticipants])]);
        };

        const handleOffer = (data: { offer: RTCSessionDescriptionInit }) => setOffer(data.offer);
        const handleAnswer = (data: { answer: RTCSessionDescriptionInit }) => setAnswer(data.answer);
        const handleIceCandidate = (data: { candidate: RTCIceCandidateInit }) => {
            // FIX: Use an array to avoid dropping rapid candidates due to React state batching
            setIceCandidates((prev) => [...prev, data.candidate]);
        };
        const handleMode = (data: ConsultationModeUpdate) => {
            if (!data?.roomId || data.roomId !== roomId) return;
            if (data.mode === 'video' || data.mode === 'audio' || data.mode === 'chat') {
                setRemoteMode(data.mode);
                setRemotePreferredMode(
                    data.preferredMode === 'video' || data.preferredMode === 'audio' || data.preferredMode === 'chat'
                        ? data.preferredMode
                        : 'video'
                );
                setRemoteEffectiveMode(
                    data.effectiveMode === 'video' || data.effectiveMode === 'audio' || data.effectiveMode === 'chat'
                        ? data.effectiveMode
                        : data.mode
                );
            }
        };

        // Register listeners before the initial join so we don't miss the
        // immediate `video:room-state` response when the peer is already present.
        const unsubs = [
            on('connect', handleConnect),
            on('video:room-state', handleRoomState),
            on('video:user-joined', handleUserJoined),
            on('video:user-left', handleUserLeft),
            on('video:offer', handleOffer),
            on('video:answer', handleAnswer),
            on('video:ice-candidate', handleIceCandidate),
            on('video:mode', handleMode),
        ];

        setParticipants([]);
        setOffer(null);
        setAnswer(null);
        setIceCandidates([]);
        setRemoteMode('video');
        setRemotePreferredMode('video');
        setRemoteEffectiveMode('video');
        joinRoom();
        emitModeState(roomId);
        return () => {
            emit('video:leave', roomId);
            unsubs.forEach((unsub) => unsub());
        };
    }, [roomId, emit, emitModeState, on]);

    const sendOffer = useCallback(
        (offerData: RTCSessionDescriptionInit) => {
            emit('video:offer', { roomId, offer: offerData });
        },
        [roomId, emit]
    );

    const sendAnswer = useCallback(
        (answerData: RTCSessionDescriptionInit) => {
            emit('video:answer', { roomId, answer: answerData });
        },
        [roomId, emit]
    );

    const sendIceCandidate = useCallback(
        (candidate: RTCIceCandidateInit) => {
            emit('video:ice-candidate', { roomId, candidate });
        },
        [roomId, emit]
    );

    const sendModeChange = useCallback(
        (
            mode: ConsultationVideoMode,
            preferredMode: ConsultationVideoMode = localPreferredModeRef.current,
            effectiveMode: ConsultationVideoMode = localEffectiveModeRef.current
        ) => {
            emit('video:mode', { roomId, mode, preferredMode, effectiveMode });
        },
        [roomId, emit]
    );

    const consumeIceCandidates = useCallback(() => {
        setIceCandidates([]);
    }, []);

    return {
        participants,
        offer,
        answer,
        iceCandidates,
        consumeIceCandidates,
        remoteMode,
        remotePreferredMode,
        remoteEffectiveMode,
        sendOffer,
        sendAnswer,
        sendIceCandidate,
        sendModeChange,
    };
}

/**
 * Hook for consultation started events (C1) — fires when doctor starts a video consultation
 */
export function useConsultationStarted(onStarted?: (data: ConsultationStarted) => void) {
    const { on } = useSocket();
    const [consultation, setConsultation] = useState<ConsultationStarted | null>(null);

    useEffect(() => {
        const handleStarted = (data: ConsultationStarted) => {
            setConsultation(data);
            onStarted?.(data);
        };

        return on('consultation:started', handleStarted);
    }, [on, onStarted]);

    return { consultation };
}

/**
 * Hook for consultation ended events (M5/I9) — fires when doctor ends a consultation
 */
export function useConsultationEnded(onEnded?: (data: ConsultationEnded) => void) {
    const { on } = useSocket();
    const [endedConsultation, setEndedConsultation] = useState<ConsultationEnded | null>(null);

    useEffect(() => {
        const handleEnded = (data: ConsultationEnded) => {
            setEndedConsultation(data);
            onEnded?.(data);
        };

        return on('consultation:ended', handleEnded);
    }, [on, onEnded]);

    return { endedConsultation };
}

export function useConsultationPatientLeft(onPatientLeft?: (data: ConsultationPatientLeft) => void) {
    const { on } = useSocket();
    const [leftConsultation, setLeftConsultation] = useState<ConsultationPatientLeft | null>(null);

    useEffect(() => {
        const handlePatientLeft = (data: ConsultationPatientLeft) => {
            setLeftConsultation(data);
            onPatientLeft?.(data);
        };

        return on('consultation:patient-left', handlePatientLeft);
    }, [on, onPatientLeft]);

    return { leftConsultation };
}

/**
 * Hook for prescription updates (C2) — fires when doctor creates a new prescription
 */
export function usePrescriptionUpdates(onPrescription?: (data: PrescriptionUpdate) => void) {
    const { on } = useSocket();
    const [lastPrescription, setLastPrescription] = useState<PrescriptionUpdate | null>(null);

    useEffect(() => {
        const handlePrescription = (data: PrescriptionUpdate) => {
            setLastPrescription(data);
            onPrescription?.(data);
        };

        return on('prescription:new', handlePrescription);
    }, [on, onPrescription]);

    return { lastPrescription };
}

/**
 * Hook for consultation chat
 */
export function useConsultationChat(consultationId: string | null) {
    const { emit, on } = useSocket();
    const { user } = useAuthStore();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);

    useEffect(() => {
        if (!consultationId) return;

        const joinChat = () => emit('chat:join', consultationId);

        // BUG-A7 Fix: Deduplicate incoming messages by userId+timestamp+message
        const handleMessage = (message: ChatMessage) => {
            setMessages((prev) => {
                // Skip if this exact message already exists (optimistic append collision)
                const isDupe = prev.some(
                    (m) => m.userId === message.userId && m.timestamp === message.timestamp && m.message === message.message
                );
                if (isDupe) return prev;
                return [...prev, message];
            });
        };

        const handleTyping = (data: { userId: string; isTyping: boolean }) => {
            if (data.isTyping) {
                setTypingUsers((prev) => [...new Set([...prev, data.userId])]);
            } else {
                setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
            }
        };

        const unsubs = [
            on('connect', joinChat),
            on('chat:message', handleMessage),
            on('chat:typing', handleTyping),
        ];

        joinChat();

        return () => {
            unsubs.forEach((unsub) => unsub());
            emit('chat:leave', consultationId);
        };
    }, [consultationId, emit, on]);

    // BUG-A7 Fix: Sender optimistically appends their own message since
    // the server no longer echoes it back via socket.to().
    const sendMessage = useCallback(
        (message: string) => {
            const ts = new Date().toISOString();
            const truncatedMessage = message.trim().slice(0, 2000);
            const optimisticMsg: ChatMessage = {
                userId: user?.id || '',
                message: truncatedMessage,
                timestamp: ts,
            };
            setMessages((prev) => [...prev, optimisticMsg]);
            emit('chat:message', { consultationId, message: truncatedMessage });
        },
        [consultationId, emit, user?.id]
    );

    const setTyping = useCallback(
        (isTyping: boolean) => {
            emit('chat:typing', { consultationId, isTyping });
        },
        [consultationId, emit]
    );

    return {
        messages,
        typingUsers,
        sendMessage,
        setTyping,
    };
}

// ── Vitals Types ──────────────────────────────────────────────────

export interface VitalsStreamData {
    session_id: string;
    heart_rate?: number;
    respiration_rate?: number;
    posture?: string;
    spine_angle?: number;
    fall_detected?: boolean;
    tremor_detected?: boolean;
    tremor_severity?: number;
    tremor_frequency?: number;
    drowsiness_score?: number;
    facial_asymmetry_score?: number;
    stress_level?: string;
    hrv_rmssd?: number;
    hrv_sdnn?: number;
    pain_score?: number;
    pain_action_units?: string;
    skin_condition?: string;
    skin_classification?: string;
    skin_confidence?: number;
    pallor_score?: number;
    hemoglobin_estimate?: number;
    spo2?: number;
    temperature?: number;
    blood_pressure_systolic?: number;
    blood_pressure_diastolic?: number;
    processed_at?: string;
    patient_user_id?: string;
    alerts?: VitalsAlert[];
    active_signals?: string[];
    total_signals?: number;
    confidence?: number;
    signalQuality?: number;
}

export interface VitalsAlert {
    /** Unique machine-readable alert code, e.g. "TACHYCARDIA", "FALL_DETECTED" */
    code: string;
    /** The CV signal metric that triggered this alert, e.g. "heart_rate" */
    metric: string;
    /** Clinical severity level */
    severity: 'critical' | 'warning' | 'info';
    /** Clinical threshold that was breached (null for boolean signals) */
    threshold?: number | null;
    /** The actual measured value at trigger time */
    current_value?: number | boolean | null;
    /** Human-readable clinical message */
    message: string;
    /** ISO 8601 UTC timestamp */
    timestamp: string;
}

type VitalsSignalToggles = Record<string, boolean>;

const ALERT_TOGGLE_MAP: Record<string, string> = {
    heart_rate: 'heart_rate_rppg',
    respiration_rate: 'respiration_monitoring',
    spo2: 'spo2_estimation',
    stress: 'stress_hrv',
    stress_level: 'stress_hrv',
    hrv_rmssd: 'stress_hrv',
    hrv_sdnn: 'stress_hrv',
    drowsiness_score: 'drowsiness_detection',
    pain_score: 'pain_level_facs',
    pain_action_units: 'pain_level_facs',
    posture: 'posture_analysis',
    spine_angle: 'posture_analysis',
    fall_detected: 'fall_detection',
    tremor: 'tremor_detection',
    tremor_detected: 'tremor_detection',
    tremor_severity: 'tremor_detection',
    tremor_frequency: 'tremor_detection',
    skin_condition: 'skin_condition_screening',
    skin_classification: 'skin_condition_screening',
    pallor: 'facial_pallor_anemia',
    pallor_score: 'facial_pallor_anemia',
    hemoglobin_estimate: 'facial_pallor_anemia',
    facial_asymmetry: 'facial_asymmetry_stroke',
    facial_asymmetry_score: 'facial_asymmetry_stroke',
    temperature: 'temperature_monitoring',
    blood_pressure_systolic: 'blood_pressure_monitoring',
    blood_pressure_diastolic: 'blood_pressure_monitoring',
};

function isToggleEnabled(toggles: VitalsSignalToggles | null | undefined, key: string) {
    if (!toggles) return true;
    return toggles[key] !== false;
}

function filterAlertsByToggles(alerts: VitalsAlert[] | undefined, toggles: VitalsSignalToggles | null | undefined) {
    if (!alerts?.length) return [];
    if (toggles && toggles.risk_alerts === false) return [];

    return alerts.filter((alert) => {
        const metric = alert.metric || alert.code;
        const toggleKey = ALERT_TOGGLE_MAP[metric];
        return toggleKey ? isToggleEnabled(toggles, toggleKey) : true;
    });
}

function mergeAlerts(existing: VitalsAlert[], incoming: VitalsAlert[]) {
    const seen = new Set<string>();
    const merged: VitalsAlert[] = [];

    for (const alert of [...incoming, ...existing]) {
        const key = `${alert.code}:${alert.timestamp}:${alert.message}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(alert);
        if (merged.length >= 50) break;
    }

    return merged;
}

function filterVitalsPayload<T extends VitalsStreamData & Record<string, unknown>>(
    vitals: T | null,
    toggles: VitalsSignalToggles | null | undefined
): T | null {
    if (!vitals) return null;
    if (!toggles) return vitals;

    const filtered: Record<string, unknown> = {
        session_id: vitals.session_id,
        processed_at: vitals.processed_at,
        patient_user_id: vitals.patient_user_id,
    };

    if ('_stream_id' in vitals) filtered._stream_id = vitals._stream_id;
    if (Array.isArray(vitals.active_signals)) filtered.active_signals = vitals.active_signals;
    if (typeof vitals.total_signals === 'number') filtered.total_signals = vitals.total_signals;

    if (isToggleEnabled(toggles, 'heart_rate_rppg') && vitals.heart_rate !== undefined) filtered.heart_rate = vitals.heart_rate;
    if (isToggleEnabled(toggles, 'respiration_monitoring') && vitals.respiration_rate !== undefined) filtered.respiration_rate = vitals.respiration_rate;
    if (isToggleEnabled(toggles, 'spo2_estimation') && vitals.spo2 !== undefined) filtered.spo2 = vitals.spo2;
    if (isToggleEnabled(toggles, 'stress_hrv')) {
        if (vitals.stress_level !== undefined) filtered.stress_level = vitals.stress_level;
        if (vitals.hrv_rmssd !== undefined) filtered.hrv_rmssd = vitals.hrv_rmssd;
        if (vitals.hrv_sdnn !== undefined) filtered.hrv_sdnn = vitals.hrv_sdnn;
    }
    if (isToggleEnabled(toggles, 'drowsiness_detection') && vitals.drowsiness_score !== undefined) filtered.drowsiness_score = vitals.drowsiness_score;
    if (isToggleEnabled(toggles, 'pain_level_facs')) {
        if (vitals.pain_score !== undefined) filtered.pain_score = vitals.pain_score;
        if (vitals.pain_action_units !== undefined) filtered.pain_action_units = vitals.pain_action_units;
    }
    if (isToggleEnabled(toggles, 'posture_analysis')) {
        if (vitals.posture !== undefined) filtered.posture = vitals.posture;
        if (vitals.spine_angle !== undefined) filtered.spine_angle = vitals.spine_angle;
    }
    if (isToggleEnabled(toggles, 'fall_detection') && vitals.fall_detected !== undefined) filtered.fall_detected = vitals.fall_detected;
    if (isToggleEnabled(toggles, 'tremor_detection')) {
        if (vitals.tremor_detected !== undefined) filtered.tremor_detected = vitals.tremor_detected;
        if (vitals.tremor_severity !== undefined) filtered.tremor_severity = vitals.tremor_severity;
        if (vitals.tremor_frequency !== undefined) filtered.tremor_frequency = vitals.tremor_frequency;
    }
    if (isToggleEnabled(toggles, 'skin_condition_screening')) {
        if (vitals.skin_condition !== undefined) filtered.skin_condition = vitals.skin_condition;
        if (vitals.skin_classification !== undefined) filtered.skin_classification = vitals.skin_classification;
        if (vitals.skin_confidence !== undefined) filtered.skin_confidence = vitals.skin_confidence;
    }
    if (isToggleEnabled(toggles, 'facial_pallor_anemia')) {
        if (vitals.pallor_score !== undefined) filtered.pallor_score = vitals.pallor_score;
        if (vitals.hemoglobin_estimate !== undefined) filtered.hemoglobin_estimate = vitals.hemoglobin_estimate;
    }
    if (isToggleEnabled(toggles, 'facial_asymmetry_stroke') && vitals.facial_asymmetry_score !== undefined) filtered.facial_asymmetry_score = vitals.facial_asymmetry_score;
    if (isToggleEnabled(toggles, 'temperature_monitoring') && vitals.temperature !== undefined) filtered.temperature = vitals.temperature;
    if (isToggleEnabled(toggles, 'blood_pressure_monitoring')) {
        if (vitals.blood_pressure_systolic !== undefined) filtered.blood_pressure_systolic = vitals.blood_pressure_systolic;
        if (vitals.blood_pressure_diastolic !== undefined) filtered.blood_pressure_diastolic = vitals.blood_pressure_diastolic;
    }

    filtered.alerts = filterAlertsByToggles(vitals.alerts, toggles);

    return filtered as T;
}

/**
 * Hook for real-time vitals streaming during consultation.
 * Native FastAPI WebSockets architecture.
 */
/**
 * Hook for real-time vitals streaming during consultation.
 * Production-hardened: JWT auth, exponential backoff reconnect,
 * stream replay via last_id, and application-level ping/pong.
 */
export function useVitalsStream(
    sessionId: string | null,
    role: 'doctor' | 'patient' = 'doctor',
    signalToggles: VitalsSignalToggles | null = null
) {
    const [latestVitals, setLatestVitals] = useState<VitalsStreamData | null>(null);
    const [vitalsHistory, setVitalsHistory] = useState<VitalsStreamData[]>([]);
    const [alerts, setAlerts] = useState<VitalsAlert[]>([]);
    const [criticalAlert, setCriticalAlert] = useState<{ sessionId: string; alerts: VitalsAlert[] } | null>(null);
    const [aiInsights, setAiInsights] = useState<Record<string, unknown> | string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const lastMessageIdRef = useRef<string | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const restPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const isUnmountedRef = useRef(false);
    const connectRef = useRef<(() => void) | null>(null);

    const bootstrapFromBackend = useCallback(async () => {
        if (!sessionId || role !== 'doctor') return;

        try {
            const [latestRes, historyRes, alertsRes] = await Promise.all([
                vitalsApi.getLatest(sessionId),
                vitalsApi.getHistory(sessionId, 30),
                vitalsApi.getAlerts(sessionId),
            ]);

            const history = (Array.isArray(historyRes.data) ? historyRes.data : [])
                .map((entry) => filterVitalsPayload(entry as VitalsStreamData & Record<string, unknown>, signalToggles))
                .filter(Boolean) as VitalsStreamData[];

            if (history.length > 0) {
                setVitalsHistory(history.slice(0, 120));
                setLatestVitals(history[0]);
            } else {
                const latest = filterVitalsPayload(
                    (latestRes.data as VitalsStreamData & Record<string, unknown>) || null,
                    signalToggles
                );
                setLatestVitals(latest);
            }

            const filteredAlerts = filterAlertsByToggles(
                Array.isArray(alertsRes.data) ? alertsRes.data as VitalsAlert[] : [],
                signalToggles
            );
            setAlerts(filteredAlerts.slice(0, 50));
        } catch (err) {
            console.error('Vitals REST bootstrap failed:', err);
        }
    }, [role, sessionId, signalToggles]);

    const applyIncomingVitals = useCallback((payload: VitalsStreamData & Record<string, unknown>) => {
        const filtered = filterVitalsPayload(payload, signalToggles);
        if (!filtered) {
            setLatestVitals(null);
            return;
        }

        setLatestVitals(filtered);
        setVitalsHistory((prev) => [filtered, ...prev].slice(0, 120));

        const incomingAlerts = filtered.alerts ?? [];
        if (incomingAlerts.length > 0) {
            setAlerts((prev) => mergeAlerts(prev, incomingAlerts));
            const criticals = incomingAlerts.filter((alert) => alert.severity === 'critical');
            if (criticals.length > 0 && sessionId) {
                setCriticalAlert({ sessionId, alerts: criticals });
                setTimeout(() => setCriticalAlert(null), 10000);
            }
        }
    }, [sessionId, signalToggles]);

    const connect = useCallback(() => {
        if (!sessionId || isUnmountedRef.current) return;

        // Read JWT from localStorage (written by authStore on login)
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

        // Build WebSocket URL with auth token and optional stream replay ID
        const params = new URLSearchParams();
        if (token) params.set('token', token);
        if (role === 'doctor' && lastMessageIdRef.current) {
            params.set('last_id', lastMessageIdRef.current);
        }
        const query = params.toString();
        const baseUrl = PUBLIC_AI_WS_URL.replace(/^http/, 'ws').replace(/\/$/, '');
        const wsUrl = `${baseUrl}/ws/vitals/${sessionId}/${role}${query ? `?${query}` : ''}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log(`[Vitals WS] ✅ Connected: ${role}/${sessionId}`);
            reconnectAttemptsRef.current = 0; // Reset backoff counter on successful connect
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Respond to server keepalive pings
                if (data.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong', ts: data.ts }));
                    return;
                }
                if (data.type === 'pong') return;

                // Track last Redis stream message ID for replay on reconnect
                if (data._stream_id) lastMessageIdRef.current = data._stream_id;

                // AI reasoning from background LLM inference
                if (data.ai_reasoning) {
                    setAiInsights(data.ai_reasoning);
                    return;
                }

                // Regular CV Edge Stream payload
                applyIncomingVitals(data);
            } catch (err) {
                console.error('FastAPI WS parse error:', err);
            }
        };

        ws.onclose = (event) => {
            console.log(`[Vitals WS] Closed ${role}/${sessionId}: code=${event.code} reason=${event.reason || 'none'}`);
            wsRef.current = null;
            if (isUnmountedRef.current) return;
            // Don't reconnect on auth rejections (4001 = missing/expired token, 4003 = wrong role)
            if (event.code === 4001 || event.code === 4003) {
                console.error(`[Vitals WS] ❌ Auth error [${event.code}]: ${event.reason}`);
                return;
            }
            // Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s cap
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30_000);
            reconnectAttemptsRef.current += 1;
            console.log(`[Vitals WS] Reconnecting in ${delay}ms (attempt #${reconnectAttemptsRef.current})`);
            reconnectTimerRef.current = setTimeout(() => connectRef.current?.(), delay);
        };

        ws.onerror = (event) => {
            console.error(`[Vitals WS] ❌ Error for ${role}/${sessionId}:`, event);
            ws.close();
        };
    }, [applyIncomingVitals, role, sessionId]);

    // BUG-A8 Fix: stable dependency for signalToggles to avoid reconnection storms
    const signalTogglesStr = useMemo(() => JSON.stringify(signalToggles || {}), [signalToggles]);

    useEffect(() => {
        isUnmountedRef.current = false;
        connectRef.current = connect;
        if (role === 'doctor') {
            bootstrapFromBackend();
            restPollingRef.current = setInterval(() => {
                if (wsRef.current?.readyState === WebSocket.OPEN) return;
                bootstrapFromBackend();
            }, 5000);
        }
        connect();
        return () => {
            isUnmountedRef.current = true;
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (restPollingRef.current) clearInterval(restPollingRef.current);
            wsRef.current?.close();
            wsRef.current = null;
        };
    }, [bootstrapFromBackend, connect, role, signalTogglesStr]);

    const pendingVitalsRef = useRef<string | null>(null);

    const sendVitals = useCallback((vitals: Partial<VitalsStreamData>) => {
        if (!sessionId) return;
        const payload = JSON.stringify(vitals);
        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(payload);
            // Also flush any pending payload from before WS was open
            if (pendingVitalsRef.current) {
                ws.send(pendingVitalsRef.current);
                pendingVitalsRef.current = null;
            }
        } else {
            // Buffer latest payload so it's sent as soon as WS opens
            pendingVitalsRef.current = payload;
        }
    }, [sessionId]);

    return { latestVitals, vitalsHistory, alerts, criticalAlert, aiInsights, sendVitals };
}
