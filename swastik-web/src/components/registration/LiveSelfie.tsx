/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCcw, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface LiveSelfieProps {
    onCapture: (imageData: string) => void;
    error?: string;
}

export function LiveSelfie({ onCapture, error }: LiveSelfieProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);

    const startCamera = async () => {
        try {
            setCameraError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraActive(true);
            }
        } catch (err: any) {
            setCameraError(err.message || 'Unable to access camera.');
        }
    };

    const stopCamera = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            setIsCameraActive(false);
        }
    }, []);

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    const analyzeImage = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        let brightness = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        brightness = brightness / (width * height);
        
        if (brightness < 40) {
            setWarning('Image is too dark. Please move to a brighter area.');
        } else if (brightness > 240) {
            setWarning('Image is too bright. Please reduce glare.');
        } else {
            setWarning(null);
        }
    };

    const captureSelfie = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                // Draw current frame to canvas
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                analyzeImage(ctx, canvas.width, canvas.height);
                
                const imageData = canvas.toDataURL('image/jpeg');
                setCapturedImage(imageData);
                stopCamera();
                onCapture(imageData);
            }
        }
    };

    const retakeSelfie = () => {
        setCapturedImage(null);
        setWarning(null);
        onCapture('');
        startCamera();
    };

    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-300 mb-2">Live Identity Verification (Selfie)</label>

            {!isCameraActive && !capturedImage && (
                <div className="border-2 border-dashed border-gray-600 bg-gray-800/50 rounded-xl p-8 text-center flex flex-col items-center justify-center">
                    <Camera className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-300 font-medium mb-4">We need to verify your identity</p>
                    <Button onClick={startCamera} type="button" className="bg-emerald-600 hover:bg-emerald-700">
                        Enable Camera
                    </Button>
                    {cameraError && <p className="text-red-500 text-sm mt-3">{cameraError}</p>}
                </div>
            )}

            {isCameraActive && !capturedImage && (
                <div className="relative rounded-xl overflow-hidden bg-black border border-gray-700">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-auto transform scale-x-[-1]"
                    />
                    
                    {/* Face Alignment Overlay (Oval Mask) */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-3/5 h-3/4 border-2 border-dashed border-emerald-400/70 rounded-[100%] shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" />
                    </div>

                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                        <Button onClick={captureSelfie} type="button" size="lg" className="rounded-full h-14 w-14 p-0 bg-emerald-500 hover:bg-emerald-600 border-4 border-emerald-300">
                            <span className="sr-only">Capture</span>
                        </Button>
                    </div>
                </div>
            )}

            {capturedImage && (
                <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-gray-900">
                    <img src={capturedImage} alt="Captured Selfie" className="w-full h-auto transform scale-x-[-1]" />
                    
                    {warning && (
                        <div className="absolute top-2 left-2 right-2 bg-yellow-500/90 text-yellow-50 px-3 py-2 rounded-lg text-sm flex items-center gap-2 backdrop-blur-sm">
                            <AlertTriangle className="h-4 w-4" />
                            {warning}
                        </div>
                    )}
                    
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                        <Button onClick={retakeSelfie} type="button" variant="outline" className="bg-black/50 text-white border-gray-600 hover:bg-black/70">
                            <RefreshCcw className="h-4 w-4 mr-2" /> Retake
                        </Button>
                        <Button type="button" disabled className="bg-emerald-600 text-white opacity-90">
                            <Check className="h-4 w-4 mr-2" /> Looks Good
                        </Button>
                    </div>
                </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
            
            {error && !cameraError && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
        </div>
    );
}
