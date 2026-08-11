'use client';

import { Pause, Play } from 'lucide-react';

interface PauseResumeBannerProps {
    paused: boolean;
    ownAction?: boolean;
    pausedByName?: string | null;
    onResume?: () => void;
}

export function PauseResumeBanner({ paused, ownAction, pausedByName, onResume }: PauseResumeBannerProps) {
    if (!paused) return null;

    return (
        <div className="flex items-center justify-center gap-3 border-b border-amber-500/30 bg-amber-500/15 px-4 py-2.5 backdrop-blur-xl">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20">
                <Pause className="h-4 w-4 text-amber-400" />
            </span>
            <span className="text-sm font-medium text-amber-200">
                {ownAction
                    ? 'Consultation paused — video and audio are muted for the patient.'
                    : `Consultation paused by ${pausedByName || 'the other participant'} — waiting for them to resume.`}
            </span>
            {ownAction && onResume && (
                <button
                    onClick={onResume}
                    className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400"
                >
                    <Play className="h-3.5 w-3.5" /> Resume
                </button>
            )}
        </div>
    );
}
