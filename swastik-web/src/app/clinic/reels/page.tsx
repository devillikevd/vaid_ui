'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Play } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { clinicApi } from '@/lib/api';
import { VideoUpload } from '@/components/shared/VideoUpload';

export default function ClinicReelsPage() {
    const [reels, setReels] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [uploadingUrl, setUploadingUrl] = useState('');

    const fetchReels = async () => {
        try {
            const res = await clinicApi.getProfile();
            if (res.success) {
                const p = (res.data as any)?.clinic || (res.data as any)?.profile || (res.data as any) || {};
                setReels(p.reels || []);
            }
        } catch (error) {
            console.error('Failed to fetch reels:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReels();
    }, []);

    const handleAddReel = async () => {
        if (!uploadingUrl) return;
        setIsUploading(true);
        try {
            const res = await clinicApi.addReel(uploadingUrl, newTitle);
            if (res.success) {
                setNewTitle('');
                setUploadingUrl('');
                await fetchReels();
            }
        } catch (error) {
            console.error('Failed to add reel', error);
            alert('Failed to add reel. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteReel = async (id: string) => {
        if (!confirm('Are you sure you want to delete this reel?')) return;
        try {
            const res = await clinicApi.deleteReel(id);
            if (res.success) {
                await fetchReels();
            }
        } catch (error) {
            console.error('Failed to delete reel', error);
            alert('Failed to delete reel. Please try again.');
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clinic Reels</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Upload short 15-30 second video reels to showcase your clinic&apos;s infrastructure, services, and patient care.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Add New Reel</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <VideoUpload
                            currentVideo={uploadingUrl}
                            onUploadComplete={(url) => setUploadingUrl(url)}
                        />
                        {uploadingUrl && (
                            <div className="space-y-4 mt-4 p-4 border border-blue-100 bg-blue-50/30 rounded-xl dark:border-blue-900/30 dark:bg-blue-900/10">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reel Caption / Title</label>
                                    <Input 
                                        value={newTitle} 
                                        onChange={(e) => setNewTitle(e.target.value)} 
                                        placeholder="e.g., A quick tour of our advanced ICU" 
                                        className="bg-white dark:bg-gray-800"
                                    />
                                </div>
                                <Button 
                                    onClick={handleAddReel} 
                                    isLoading={isUploading} 
                                    leftIcon={<Plus className="h-4 w-4" />}
                                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                                >
                                    Publish Reel
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Published Reels ({reels.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {reels.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Play className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No reels published yet</h3>
                            <p className="text-sm text-gray-500 max-w-sm mx-auto">Upload engaging short videos to help patients explore your clinic and build trust before booking.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {reels.map((reel) => (
                                <div key={reel.id} className="relative group rounded-xl overflow-hidden aspect-[9/16] bg-black border border-gray-200 dark:border-gray-800 shadow-sm">
                                    <video 
                                        src={reel.video_url} 
                                        className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                        muted
                                        loop
                                        playsInline
                                        onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                                        onMouseLeave={(e) => {
                                            const v = e.target as HTMLVideoElement;
                                            v.pause();
                                            v.currentTime = 0;
                                        }}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
                                        <p className="text-white text-sm font-medium line-clamp-2 text-shadow-sm">{reel.title || 'Untitled Reel'}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteReel(reel.id)}
                                        className="absolute top-2 right-2 p-2 bg-red-600/90 hover:bg-red-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete Reel"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
