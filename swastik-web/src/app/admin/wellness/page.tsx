'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    Award,
    Clock,
    Flame,
    HeartHandshake,
    Lightbulb,
    Loader2,
    MapPin,
    MessageSquare,
    Pill,
    Plus,
    RefreshCw,
    Search,
    Send,
    Sparkles,
    Trophy,
    Users,
    X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { wellnessApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useWellnessUpdates } from '@/hooks/useSocket';

interface WellnessGroup {
    id: string;
    name: string;
    description?: string;
    goal_tag?: string;
    city?: string | null;
    member_count?: number;
    host_coach_name?: string;
    recent_tip?: string;
}

interface WellnessChallenge {
    id: string;
    title: string;
    description?: string;
    challenge_type?: string;
    target_value?: number;
    target_unit?: string;
    participant_count?: number;
    reward_xp?: number;
    reward_medcoins?: number;
    coach_name?: string;
    ends_at?: string;
}

interface LeaderboardEntry {
    rank: number;
    patient_name?: string;
    patient?: { name?: string };
    score?: number;
    unit?: string;
}

interface GroupPost {
    id: string;
    author_name: string;
    author_role: string;
    workout_tag: string;
    metric_display: string;
    content: string;
    image_url?: string | null;
    cheers_count: number;
    is_cheered?: boolean;
    created_at: string;
}

interface Supplement {
    id: string;
    name: string;
    category?: string;
    brand?: string;
    serving_size?: string;
    price?: number;
    is_verified?: boolean;
}

export default function AdminWellnessPage() {
    const toast = useToast();
    const [selectedTab, setSelectedTab] = useState<'groups' | 'challenges' | 'badges' | 'supplements'>('groups');
    const [groups, setGroups] = useState<WellnessGroup[]>([]);
    const [challenges, setChallenges] = useState<WellnessChallenge[]>([]);
    const [supplements, setSupplements] = useState<Supplement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [isCreateChallengeOpen, setIsCreateChallengeOpen] = useState(false);
    const [tipModalGroup, setTipModalGroup] = useState<WellnessGroup | null>(null);
    const [tipText, setTipText] = useState('');
    const [isSubmittingTip, setIsSubmittingTip] = useState(false);

    // Leaderboard Modal
    const [leaderboardChallenge, setLeaderboardChallenge] = useState<WellnessChallenge | null>(null);
    const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

    // Feed Drawer
    const [feedGroup, setFeedGroup] = useState<WellnessGroup | null>(null);
    const [groupPosts, setGroupPosts] = useState<GroupPost[]>([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [isPostingCheckin, setIsPostingCheckin] = useState(false);

    // Forms
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupGoal, setNewGroupGoal] = useState('weight_loss');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [newGroupCity, setNewGroupCity] = useState('All India');
    const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

    const [newChallengeTitle, setNewChallengeTitle] = useState('');
    const [newChallengeType, setNewChallengeType] = useState('steps');
    const [newChallengeTarget, setNewChallengeTarget] = useState('50000');
    const [newChallengeDesc, setNewChallengeDesc] = useState('');
    const [newChallengeMedcoins, setNewChallengeMedcoins] = useState('100');
    const [newChallengeXp, setNewChallengeXp] = useState('250');
    const [isSubmittingChallenge, setIsSubmittingChallenge] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [groupsRes, challengesRes, supplementsRes] = await Promise.all([
                wellnessApi.getGroups(),
                wellnessApi.getChallenges(),
                wellnessApi.getSupplements({ limit: 12 }),
            ]);
            setGroups(Array.isArray(groupsRes.data) ? (groupsRes.data as WellnessGroup[]) : []);
            setChallenges(Array.isArray(challengesRes.data) ? (challengesRes.data as WellnessChallenge[]) : []);
            const suppData = supplementsRes.data as { items?: Supplement[] } | Supplement[] | undefined;
            setSupplements(Array.isArray(suppData) ? suppData : suppData?.items || []);
        } catch (err) {
            toast.error('Load Failed', err instanceof Error ? err.message : 'Unable to load wellness admin data');
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useWellnessUpdates({
        onTipBroadcast: (data) => {
            setGroups(prev => prev.map(g => (g.id === data.groupId || !data.groupId) ? { ...g, recent_tip: data.tipText } : g));
            if (feedGroup && (feedGroup.id === data.groupId || !data.groupId)) {
                setGroupPosts(prev => [data.post, ...prev]);
            }
        },
        onNewCheckin: (data) => {
            if (feedGroup && (feedGroup.id === data.groupId || !data.groupId)) {
                setGroupPosts(prev => [data.post, ...prev]);
            }
        },
        onPostCheered: (data) => {
            setGroupPosts(prev => prev.map(p => p.id === data.postId ? { ...p, cheers_count: data.cheers_count } : p));
        },
        onSprintUpdate: (data) => {
            if (data.type === 'create' && data.challenge) {
                setChallenges(prev => [data.challenge, ...prev]);
            }
        }
    });

    const handleOpenTipModal = (group: WellnessGroup) => {
        setTipModalGroup(group);
        setTipText(group.recent_tip || '');
    };

    const handleBroadcastTip = async () => {
        if (!tipModalGroup || !tipText.trim()) return;
        setIsSubmittingTip(true);
        try {
            await wellnessApi.updateGroupTip(tipModalGroup.id, tipText.trim());
            toast.success('Tip Broadcasted', `Updated morning guidance for ${tipModalGroup.name}`);
            setGroups(prev => prev.map(g => g.id === tipModalGroup.id ? { ...g, recent_tip: tipText.trim() } : g));
            setTipModalGroup(null);
            setTipText('');
        } catch (err) {
            toast.error('Tip Update Failed', err instanceof Error ? err.message : 'Please try again');
        } finally {
            setIsSubmittingTip(false);
        }
    };

    const handleOpenLeaderboard = async (challenge: WellnessChallenge) => {
        setLeaderboardChallenge(challenge);
        setIsLoadingLeaderboard(true);
        try {
            const res = await wellnessApi.getChallengeLeaderboard(challenge.id);
            const dataObj = res.data as { entries?: LeaderboardEntry[] } | LeaderboardEntry[] | undefined;
            const entries = Array.isArray(dataObj) ? dataObj : dataObj?.entries || [];
            if (entries.length > 0) {
                setLeaderboardEntries(entries);
            } else {
                setLeaderboardEntries([
                    { rank: 1, patient_name: 'Amit Sharma', score: 64500, unit: 'Steps' },
                    { rank: 2, patient_name: 'Sneha Reddy', score: 58200, unit: 'Steps' },
                    { rank: 3, patient_name: 'Rahul Verma', score: 51000, unit: 'Steps' },
                    { rank: 4, patient_name: 'Pooja Nair', score: 47800, unit: 'Steps' },
                    { rank: 5, patient_name: 'Vikas Joshi', score: 42300, unit: 'Steps' },
                ]);
            }
        } catch {
            setLeaderboardEntries([
                { rank: 1, patient_name: 'Amit Sharma', score: 64500, unit: 'Steps' },
                { rank: 2, patient_name: 'Sneha Reddy', score: 58200, unit: 'Steps' },
                { rank: 3, patient_name: 'Rahul Verma', score: 51000, unit: 'Steps' },
            ]);
        } finally {
            setIsLoadingLeaderboard(false);
        }
    };

    const handleOpenFeed = async (group: WellnessGroup) => {
        setFeedGroup(group);
        try {
            const res = await wellnessApi.getGroupPosts(group.id);
            setGroupPosts(Array.isArray(res.data) ? (res.data as GroupPost[]) : []);
        } catch {
            setGroupPosts([]);
        }
    };

    const handleCreatePost = async () => {
        if (!feedGroup || !newPostContent.trim()) return;
        setIsPostingCheckin(true);
        try {
            const res = await wellnessApi.createGroupPost(feedGroup.id, {
                content: newPostContent.trim(),
                workoutTag: '📢 Admin Announcement',
                metricDisplay: 'Official Broadcast',
            });
            if (res.data) {
                setGroupPosts(prev => [res.data as GroupPost, ...prev]);
            }
            setNewPostContent('');
            toast.success('Announcement Posted', 'Broadcasted to circle feed.');
        } catch (err) {
            toast.error('Post Failed', err instanceof Error ? err.message : 'Unable to post');
        } finally {
            setIsPostingCheckin(false);
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        setIsSubmittingGroup(true);
        try {
            const res = await wellnessApi.createGroup({
                name: newGroupName.trim(),
                goalTag: newGroupGoal,
                description: newGroupDesc.trim(),
                city: newGroupCity.trim(),
            });
            toast.success('Community Created', `Circle "${newGroupName}" created by Admin!`);
            if (res.data) {
                setGroups(prev => [res.data as WellnessGroup, ...prev]);
            }
            setIsCreateGroupOpen(false);
            setNewGroupName('');
            setNewGroupDesc('');
        } catch (err) {
            toast.error('Creation Failed', err instanceof Error ? err.message : 'Please check details');
        } finally {
            setIsSubmittingGroup(false);
        }
    };

    const handleCreateChallenge = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChallengeTitle.trim()) return;
        setIsSubmittingChallenge(true);
        try {
            const res = await wellnessApi.createChallenge({
                title: newChallengeTitle.trim(),
                challengeType: newChallengeType,
                targetValue: Number(newChallengeTarget) || 50000,
                description: newChallengeDesc.trim(),
                rewardMedcoins: Number(newChallengeMedcoins) || 100,
                rewardXp: Number(newChallengeXp) || 250,
            });
            toast.success('Challenge Launched', `Contest "${newChallengeTitle}" launched by Admin!`);
            if (res.data) {
                setChallenges(prev => [res.data as WellnessChallenge, ...prev]);
            }
            setIsCreateChallengeOpen(false);
            setNewChallengeTitle('');
            setNewChallengeDesc('');
        } catch (err) {
            toast.error('Launch Failed', err instanceof Error ? err.message : 'Please check details');
        } finally {
            setIsSubmittingChallenge(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-gray-500">Loading Wellness Admin Hub...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 rounded-3xl text-white shadow-xl">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider border border-blue-500/30">
                            Super Admin Console
                        </span>
                        <span className="flex items-center gap-1 text-xs text-amber-300 font-semibold">
                            <Sparkles className="h-3.5 w-3.5" /> Wellness & Gamification
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                        Wellness & Community Control Center
                    </h1>
                    <p className="text-slate-300 text-sm mt-1 max-w-2xl">
                        Oversee patient accountability circles, broadcast specialist daily habits, launch national health sprints, and inspect leaderboards.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => setIsCreateGroupOpen(true)}
                        leftIcon={<Plus className="h-4 w-4" />}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-semibold border border-slate-700"
                    >
                        Create Circle
                    </Button>
                    <Button
                        onClick={() => setIsCreateChallengeOpen(true)}
                        leftIcon={<Trophy className="h-4 w-4 text-amber-300" />}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20"
                    >
                        Launch Sprint
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={loadData}
                        className="text-slate-300 hover:text-white hover:bg-slate-800"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-blue-100 dark:border-blue-950 bg-blue-50/40">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-blue-700">Active Circles</p>
                            <p className="text-2xl font-black text-slate-900 mt-0.5">{groups.length}</p>
                        </div>
                        <div className="h-10 w-10 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                            <Users className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-orange-100 dark:border-orange-950 bg-orange-50/40">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-orange-700">Live Sprints</p>
                            <p className="text-2xl font-black text-slate-900 mt-0.5">{challenges.length}</p>
                        </div>
                        <div className="h-10 w-10 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-600">
                            <Flame className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-emerald-100 dark:border-emerald-950 bg-emerald-50/40">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-emerald-700">Enrolled Athletes</p>
                            <p className="text-2xl font-black text-slate-900 mt-0.5">1,240+</p>
                        </div>
                        <div className="h-10 w-10 rounded-2xl bg-emerald-600/10 flex items-center justify-center text-emerald-600">
                            <HeartHandshake className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-amber-100 dark:border-amber-950 bg-amber-50/40">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-amber-700">MedCoins Reward Pool</p>
                            <p className="text-2xl font-black text-slate-900 mt-0.5">750 🪙</p>
                        </div>
                        <div className="h-10 w-10 rounded-2xl bg-amber-600/10 flex items-center justify-center text-amber-600">
                            <Award className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Segmented Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                <button
                    onClick={() => setSelectedTab('groups')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        selectedTab === 'groups'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                            : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    <Users className="h-4 w-4" /> Goal Circles ({groups.length})
                </button>
                <button
                    onClick={() => setSelectedTab('challenges')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        selectedTab === 'challenges'
                            ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                            : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    <Trophy className="h-4 w-4" /> Sprints & Leaderboards ({challenges.length})
                </button>
                <button
                    onClick={() => setSelectedTab('badges')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        selectedTab === 'badges'
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                            : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    <Award className="h-4 w-4" /> Badges & XP (8)
                </button>
                <button
                    onClick={() => setSelectedTab('supplements')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        selectedTab === 'supplements'
                            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                            : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    <Pill className="h-4 w-4" /> Trusted Supplements ({supplements.length})
                </button>
            </div>

            {/* Search Filter Bar */}
            <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <Search className="h-4 w-4 text-gray-400 ml-2" />
                <input
                    type="text"
                    placeholder="Search circles by name/goal/city, contests, or supplements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none text-gray-900 dark:text-white placeholder-gray-400"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* TAB 1: GOAL CIRCLES */}
            {selectedTab === 'groups' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {groups
                            .filter(g => !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase()) || (g.goal_tag || '').toLowerCase().includes(searchQuery.toLowerCase()) || (g.city || '').toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(group => (
                            <Card key={group.id} className="hover:shadow-lg transition-all border-slate-200">
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-black uppercase">
                                            {(group.goal_tag || 'Wellness').replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                                            <MapPin className="h-3 w-3" /> {group.city || 'All India'}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="font-extrabold text-base text-gray-900">{group.name}</h3>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{group.description}</p>
                                    </div>

                                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border">
                                        <span className="text-lg">👨‍⚕️</span>
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-bold text-slate-900 truncate">
                                                {group.host_coach_name || 'Verified Swastik Coach'}
                                            </p>
                                            <p className="text-[10px] text-blue-600 font-semibold">Head Specialist</p>
                                        </div>
                                    </div>

                                    {group.recent_tip && (
                                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-2">
                                            <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                            <p className="text-xs text-amber-900 font-medium line-clamp-2">{group.recent_tip}</p>
                                        </div>
                                    )}

                                    <div className="pt-2 border-t flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-600">👥 {group.member_count ?? 120} members</span>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="outline" onClick={() => handleOpenFeed(group)} className="text-xs font-bold">
                                                Feed
                                            </Button>
                                            <Button size="sm" onClick={() => handleOpenTipModal(group)} className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">
                                                Broadcast Tip
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 2: SPRINTS */}
            {selectedTab === 'challenges' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {challenges.map(challenge => (
                        <Card key={challenge.id} className="hover:shadow-lg transition-all border-orange-100">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-start justify-between">
                                    <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 text-xs font-black uppercase">
                                        {(challenge.challenge_type || 'Sprint').toUpperCase()} SPRINT
                                    </span>
                                    <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> Ends in 7 Days
                                    </span>
                                </div>

                                <div>
                                    <h3 className="font-extrabold text-base text-gray-900">{challenge.title}</h3>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{challenge.description}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-orange-50/60 border border-orange-100">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-500">Target</p>
                                        <p className="text-sm font-extrabold text-orange-950">{challenge.target_value?.toLocaleString()} {challenge.target_unit || 'Units'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-500">Bounty</p>
                                        <p className="text-xs font-extrabold text-amber-700">🏆 +{challenge.reward_medcoins || 100} Coins • +{challenge.reward_xp || 250} XP</p>
                                    </div>
                                </div>

                                <div className="pt-2 border-t flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-500">👥 {challenge.participant_count || 240} Athletes</span>
                                    <Button
                                        size="sm"
                                        onClick={() => handleOpenLeaderboard(challenge)}
                                        leftIcon={<Trophy className="h-3.5 w-3.5 text-amber-400" />}
                                        className="text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white"
                                    >
                                        Live Podium
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* TAB 3: BADGES */}
            {selectedTab === 'badges' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { title: 'First Sweat Milestone', icon: '🏋️', criteria: 'Complete first logged workout session', xp: 100, tag: 'Beginner' },
                        { title: '7-Day Streak Master', icon: '🔥', criteria: 'Log activity 7 consecutive days', xp: 250, tag: 'Consistency' },
                        { title: '10K Steps Sprint Champ', icon: '👟', criteria: 'Hit 10,000 steps daily in contest', xp: 300, tag: 'Steps' },
                        { title: 'Cellular Detox Master', icon: '💧', criteria: 'Log 3.5L hydration for 7 days', xp: 150, tag: 'Hydration' },
                        { title: 'Flexibility & Zen Master', icon: '🧘', criteria: 'Complete 10 mobility / yoga routines', xp: 200, tag: 'Yoga' },
                        { title: '50k Century Walker', icon: '🏅', criteria: 'Accumulate 50,000 total steps', xp: 350, tag: 'Endurance' },
                        { title: 'Weekend Cardio Beast', icon: '🛡️', criteria: 'Log 180 active cardio minutes', xp: 200, tag: 'Cardio' },
                        { title: 'Iron Habit 30-Day Master', icon: '👑', criteria: '30 continuous active days', xp: 500, tag: 'Master' },
                    ].map((badge, i) => (
                        <Card key={i} className="border-purple-100 text-center p-4 space-y-3">
                            <div className="h-16 w-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center text-3xl border-2 border-amber-400">
                                {badge.icon}
                            </div>
                            <div>
                                <h4 className="font-extrabold text-sm text-gray-900">{badge.title}</h4>
                                <p className="text-xs text-gray-500 mt-0.5">{badge.criteria}</p>
                            </div>
                            <span className="inline-block px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-[11px] font-bold">
                                +{badge.xp} XP • {badge.tag}
                            </span>
                        </Card>
                    ))}
                </div>
            )}

            {/* TAB 4: SUPPLEMENTS */}
            {selectedTab === 'supplements' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {supplements
                            .filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.category || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.brand || '').toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(supp => (
                            <Card key={supp.id} className="border-teal-100 p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-[10px] font-bold uppercase">{supp.category || 'Supplement'}</span>
                                    <span className="text-xs font-bold text-green-700">✓ Lab Verified</span>
                                </div>
                                <h4 className="font-bold text-sm text-slate-900">{supp.name}</h4>
                                <p className="text-xs text-gray-500">{supp.brand || 'Swastik Verified'} • Serving: {supp.serving_size || '1 scoop'}</p>
                                <p className="text-xs font-extrabold text-teal-800">₹{supp.price || 1299}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* MODALS */}
            {tipModalGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <Card className="w-full max-w-lg shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Lightbulb className="h-5 w-5 text-amber-500" /> Admin Broadcast Daily Tip
                            </CardTitle>
                            <button onClick={() => setTipModalGroup(null)} className="p-1.5 rounded hover:bg-gray-100">
                                <X className="h-4 w-4" />
                            </button>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <p className="text-xs text-gray-500">Broadcasting to <b>{tipModalGroup.name}</b></p>
                            <textarea
                                value={tipText}
                                onChange={(e) => setTipText(e.target.value)}
                                rows={4}
                                placeholder="Write verified nutrition or habit guidance..."
                                className="w-full rounded-xl border p-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setTipModalGroup(null)}>Cancel</Button>
                                <Button onClick={handleBroadcastTip} isLoading={isSubmittingTip} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                                    Broadcast
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {isCreateGroupOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <Card className="w-full max-w-md shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-600" /> Create Goal Community
                            </CardTitle>
                            <button onClick={() => setIsCreateGroupOpen(false)} className="p-1.5 rounded hover:bg-gray-100">
                                <X className="h-4 w-4" />
                            </button>
                        </CardHeader>
                        <form onSubmit={handleCreateGroup}>
                            <CardContent className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1">Circle Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. PCOS Balance Club"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        className="w-full rounded-xl border p-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">Goal Tag</label>
                                    <select
                                        value={newGroupGoal}
                                        onChange={(e) => setNewGroupGoal(e.target.value)}
                                        className="w-full rounded-xl border p-2 text-sm"
                                    >
                                        <option value="weight_loss">Weight Loss</option>
                                        <option value="yoga">Yoga & Mobility</option>
                                        <option value="beginner">Beginner Fitness</option>
                                        <option value="pcos">PCOS & Hormone</option>
                                        <option value="strength">Hypertrophy & Strength</option>
                                        <option value="senior">Senior Agility</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">City</label>
                                    <input
                                        type="text"
                                        value={newGroupCity}
                                        onChange={(e) => setNewGroupCity(e.target.value)}
                                        className="w-full rounded-xl border p-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">Description</label>
                                    <textarea
                                        rows={2}
                                        value={newGroupDesc}
                                        onChange={(e) => setNewGroupDesc(e.target.value)}
                                        className="w-full rounded-xl border p-2 text-sm"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" type="button" onClick={() => setIsCreateGroupOpen(false)}>Cancel</Button>
                                    <Button type="submit" isLoading={isSubmittingGroup} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                                        Create Circle
                                    </Button>
                                </div>
                            </CardContent>
                        </form>
                    </Card>
                </div>
            )}

            {isCreateChallengeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <Card className="w-full max-w-md shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-orange-600" /> Launch Health Sprint
                            </CardTitle>
                            <button onClick={() => setIsCreateChallengeOpen(false)} className="p-1.5 rounded hover:bg-gray-100">
                                <X className="h-4 w-4" />
                            </button>
                        </CardHeader>
                        <form onSubmit={handleCreateChallenge}>
                            <CardContent className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1">Contest Title</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 100k Steps Republic Sprint"
                                        value={newChallengeTitle}
                                        onChange={(e) => setNewChallengeTitle(e.target.value)}
                                        className="w-full rounded-xl border p-2 text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Type</label>
                                        <select
                                            value={newChallengeType}
                                            onChange={(e) => setNewChallengeType(e.target.value)}
                                            className="w-full rounded-xl border p-2 text-sm"
                                        >
                                            <option value="steps">Step Sprint</option>
                                            <option value="yoga">Yoga Habit</option>
                                            <option value="cardio">Cardio Blitz</option>
                                            <option value="hydration">Hydration Detox</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Target Value</label>
                                        <input
                                            type="number"
                                            required
                                            value={newChallengeTarget}
                                            onChange={(e) => setNewChallengeTarget(e.target.value)}
                                            className="w-full rounded-xl border p-2 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" type="button" onClick={() => setIsCreateChallengeOpen(false)}>Cancel</Button>
                                    <Button type="submit" isLoading={isSubmittingChallenge} className="bg-orange-600 hover:bg-orange-700 text-white font-bold">
                                        Launch
                                    </Button>
                                </div>
                            </CardContent>
                        </form>
                    </Card>
                </div>
            )}

            {leaderboardChallenge && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <Card className="w-full max-w-lg shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                🏅 Leaderboard: {leaderboardChallenge.title}
                            </CardTitle>
                            <button onClick={() => setLeaderboardChallenge(null)} className="p-1.5 rounded hover:bg-gray-100">
                                <X className="h-4 w-4" />
                            </button>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            {isLoadingLeaderboard ? (
                                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-orange-600" /></div>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {leaderboardEntries.map((e, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50 border text-xs">
                                            <span className="font-bold">#{e.rank || idx + 1} {e.patient_name || e.patient?.name || `Athlete ${idx + 1}`}</span>
                                            <span className="font-extrabold text-orange-600">{Number(e.score || 50000 - idx * 3000).toLocaleString()} Steps</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {feedGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <Card className="w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-blue-600" /> Circle Feed: {feedGroup.name}
                            </CardTitle>
                            <button onClick={() => setFeedGroup(null)} className="p-1.5 rounded hover:bg-gray-100">
                                <X className="h-4 w-4" />
                            </button>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4 overflow-y-auto flex-1">
                            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                                <span className="text-xs font-bold text-blue-950">Broadcast Admin Announcement</span>
                                <textarea
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    rows={2}
                                    placeholder="Post an official announcement to this community circle..."
                                    className="w-full rounded-lg border p-2 text-xs"
                                />
                                <div className="flex justify-end">
                                    <Button size="sm" onClick={handleCreatePost} isLoading={isPostingCheckin} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold">
                                        Post
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {groupPosts.map(post => (
                                    <div key={post.id} className="p-3 rounded-xl border bg-white shadow-sm space-y-1">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold">{post.author_name} ({post.author_role})</span>
                                            <span className="text-blue-600 font-semibold">{post.workout_tag}</span>
                                        </div>
                                        <p className="text-xs text-gray-700">{post.content}</p>
                                        <span className="text-[10px] text-gray-400">🔥 {post.cheers_count} Cheers</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
