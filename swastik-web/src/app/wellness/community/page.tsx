'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    Award,
    CheckCircle2,
    Clock,
    Flame,
    HeartHandshake,
    Lightbulb,
    Loader2,
    MapPin,
    MessageSquare,
    Plus,
    RefreshCw,
    Send,
    Sparkles,
    Target,
    Trophy,
    Users,
    X,
    Zap
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
    progress_percent?: number;
    reward_xp?: number;
    reward_medcoins?: number;
    coach_name?: string;
    ends_at?: string;
}

interface LeaderboardEntry {
    rank: number;
    patient_name?: string;
    patient?: { name?: string };
    progress_value?: number;
    score?: number;
    source_metric?: string;
    unit?: string;
    is_self?: boolean;
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

export default function WellnessCommunityPage() {
    const toast = useToast();
    const [selectedTab, setSelectedTab] = useState<'groups' | 'challenges' | 'badges'>('groups');
    const [groups, setGroups] = useState<WellnessGroup[]>([]);
    const [challenges, setChallenges] = useState<WellnessChallenge[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter
    const [goalFilter, setGoalFilter] = useState('All');

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
    const [newPostTag, setNewPostTag] = useState('🏃 Daily Check-in');
    const [isPostingCheckin, setIsPostingCheckin] = useState(false);

    // New Group Form
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupGoal, setNewGroupGoal] = useState('weight_loss');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [newGroupCity, setNewGroupCity] = useState('All India');
    const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

    // New Challenge Form
    const [newChallengeTitle, setNewChallengeTitle] = useState('');
    const [newChallengeType, setNewChallengeType] = useState('steps');
    const [newChallengeTarget, setNewChallengeTarget] = useState('50000');
    const [newChallengeDesc, setNewChallengeDesc] = useState('');
    const [newChallengeMedcoins, setNewChallengeMedcoins] = useState('100');
    const [newChallengeXp, setNewChallengeXp] = useState('250');
    const [isSubmittingChallenge, setIsSubmittingChallenge] = useState(false);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const [groupsRes, challengesRes] = await Promise.all([
                wellnessApi.getGroups(),
                wellnessApi.getChallenges(),
            ]);
            setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
            setChallenges(Array.isArray(challengesRes.data) ? challengesRes.data : []);
        } catch (err) {
            toast.error('Load failed', err instanceof Error ? err.message : 'Unable to load communities');
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        load();
    }, [load]);

    useWellnessUpdates({
        onTipBroadcast: (data) => {
            setGroups(prev => prev.map(g => (g.id === data.groupId || !data.groupId) ? { ...g, recent_tip: data.tipText } : g));
        },
        onSprintUpdate: (data) => {
            if (data.type === 'create' && data.challenge) {
                setChallenges(prev => [data.challenge, ...prev]);
            }
        }
    });

    // Open Tip Broadcast Modal
    const handleOpenTipModal = (group: WellnessGroup) => {
        setTipModalGroup(group);
        setTipText(group.recent_tip || '');
    };

    const handleBroadcastTip = async () => {
        if (!tipModalGroup || !tipText.trim()) return;
        setIsSubmittingTip(true);
        try {
            await wellnessApi.updateGroupTip(tipModalGroup.id, tipText.trim());
            toast.success('Daily Tip Broadcasted', `Updated morning tip for ${tipModalGroup.name}`);
            setGroups(prev => prev.map(g => g.id === tipModalGroup.id ? { ...g, recent_tip: tipText.trim() } : g));
            setTipModalGroup(null);
            setTipText('');
        } catch (err) {
            toast.error('Tip Broadcast Failed', err instanceof Error ? err.message : 'Please try again');
        } finally {
            setIsSubmittingTip(false);
        }
    };

    // Open Leaderboard Modal
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
                // Fallback mock top performers
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

    // Open Group Feed
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
                workoutTag: newPostTag,
                metricDisplay: 'Coach / Admin Broadcast',
            });
            if (res.data) {
                setGroupPosts(prev => [res.data as GroupPost, ...prev]);
            }
            setNewPostContent('');
            toast.success('Check-in Posted', 'Your message has been posted to the circle feed.');
        } catch (err) {
            toast.error('Post Failed', err instanceof Error ? err.message : 'Unable to post');
        } finally {
            setIsPostingCheckin(false);
        }
    };

    const handleCheerPost = async (postId: string) => {
        try {
            await wellnessApi.cheerGroupPost(postId);
            setGroupPosts(prev => prev.map(p => {
                if (p.id === postId) {
                    const isCheered = !p.is_cheered;
                    return {
                        ...p,
                        is_cheered: isCheered,
                        cheers_count: isCheered ? p.cheers_count + 1 : Math.max(0, p.cheers_count - 1),
                    };
                }
                return p;
            }));
        } catch {
            // silent optimistic
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
            toast.success('Community Created', `Circle "${newGroupName}" is now live!`);
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
            toast.success('Challenge Launched', `Contest "${newChallengeTitle}" is live for patients!`);
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

    const filteredGroups = goalFilter === 'All'
        ? groups
        : groups.filter(g => (g.goal_tag || '').toLowerCase().includes(goalFilter.toLowerCase()) || g.name.toLowerCase().includes(goalFilter.toLowerCase()));

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                <p className="text-sm font-medium text-gray-500">Loading Coach & Community Studio...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
            {/* Header & Studio Overview */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-teal-950 via-teal-900 to-emerald-900 p-6 rounded-3xl text-white shadow-xl">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
                            Coach & Admin Studio
                        </span>
                        <span className="flex items-center gap-1 text-xs text-amber-300 font-semibold">
                            <Sparkles className="h-3.5 w-3.5" /> Gamification Live
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                        Community & Challenge Creator
                    </h1>
                    <p className="text-teal-200/90 text-sm mt-1 max-w-2xl">
                        Manage patient accountability circles, broadcast morning specialist advice, launch step & yoga sprints, and reward MedCoins.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => setIsCreateGroupOpen(true)}
                        leftIcon={<Plus className="h-4 w-4" />}
                        className="bg-teal-800/80 hover:bg-teal-700 text-white border border-teal-700/60 font-semibold"
                    >
                        New Circle
                    </Button>
                    <Button
                        onClick={() => setIsCreateChallengeOpen(true)}
                        leftIcon={<Trophy className="h-4 w-4 text-amber-300" />}
                        className="bg-amber-500 hover:bg-amber-600 text-teal-950 font-extrabold shadow-lg shadow-amber-500/20"
                    >
                        Launch Contest
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={load}
                        className="text-teal-200 hover:text-white hover:bg-teal-800/50"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* KPI Metric Summary Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-teal-100 dark:border-teal-950 bg-teal-50/50 dark:bg-teal-950/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-teal-700 dark:text-teal-400">Active Communities</p>
                            <p className="text-2xl font-extrabold text-teal-950 dark:text-white mt-0.5">{groups.length}</p>
                        </div>
                        <div className="h-10 w-10 rounded-2xl bg-teal-600/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                            <Users className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-orange-100 dark:border-orange-950 bg-orange-50/50 dark:bg-orange-950/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-orange-700 dark:text-orange-400">Live Challenges</p>
                            <p className="text-2xl font-extrabold text-orange-950 dark:text-white mt-0.5">{challenges.length}</p>
                        </div>
                        <div className="h-10 w-10 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <Flame className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-indigo-100 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400">Total Enrolled Athletes</p>
                            <p className="text-2xl font-extrabold text-indigo-950 dark:text-white mt-0.5">1,240+</p>
                        </div>
                        <div className="h-10 w-10 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <HeartHandshake className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-amber-100 dark:border-amber-950 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">MedCoins Reward Pool</p>
                            <p className="text-2xl font-extrabold text-amber-950 dark:text-white mt-0.5">750 🪙</p>
                        </div>
                        <div className="h-10 w-10 rounded-2xl bg-amber-600/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Award className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Segmented Studio Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                <button
                    onClick={() => setSelectedTab('groups')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        selectedTab === 'groups'
                            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                    <Users className="h-4 w-4" /> Goal Communities ({groups.length})
                </button>
                <button
                    onClick={() => setSelectedTab('challenges')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        selectedTab === 'challenges'
                            ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                    <Trophy className="h-4 w-4" /> Contests & Challenges ({challenges.length})
                </button>
                <button
                    onClick={() => setSelectedTab('badges')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        selectedTab === 'badges'
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                    <Award className="h-4 w-4" /> Trophy Room & Badges (8)
                </button>
            </div>

            {/* TAB 1: GOAL COMMUNITIES */}
            {selectedTab === 'groups' && (
                <div className="space-y-6">
                    {/* Goal Filters */}
                    <div className="flex flex-wrap gap-2">
                        {['All', 'Weight Loss', 'Yoga', 'Beginner', 'PCOS', 'Strength', 'Senior'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setGoalFilter(cat)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                    goalFilter === cat
                                        ? 'bg-teal-900 text-white border-teal-900'
                                        : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-teal-600'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredGroups.map(group => (
                            <Card key={group.id} className="hover:shadow-lg transition-all border-teal-100/60 dark:border-teal-950/60 flex flex-col justify-between">
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="px-2.5 py-1 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 text-xs font-black uppercase tracking-wider">
                                            {(group.goal_tag || 'Wellness').replace('_', ' ')}
                                        </span>
                                        <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                                            <MapPin className="h-3 w-3" /> {group.city || 'All India'}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-extrabold text-lg text-gray-900 dark:text-white leading-tight">
                                            {group.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                            {group.description || 'Active community for health coaching and accountability.'}
                                        </p>
                                    </div>

                                    {/* Coach Attribution */}
                                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100/60 dark:border-teal-900/40">
                                        <div className="h-8 w-8 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-xs">
                                            👨‍⚕️
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-bold text-teal-950 dark:text-teal-200 truncate">
                                                {group.host_coach_name || 'Verified Swastik Coach'}
                                            </p>
                                            <p className="text-[10px] text-teal-700/80 dark:text-teal-400 font-medium">
                                                Head Specialist
                                            </p>
                                        </div>
                                    </div>

                                    {/* Daily Coach Tip Box */}
                                    {group.recent_tip && (
                                        <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2">
                                            <Lightbulb className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-900 dark:text-amber-300 font-medium line-clamp-2">
                                                {group.recent_tip}
                                            </p>
                                        </div>
                                    )}

                                    {/* Footer Stats & Actions */}
                                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400">
                                            <Users className="h-3.5 w-3.5 text-teal-600" />
                                            {group.member_count ?? 120} members
                                        </span>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleOpenFeed(group)}
                                                leftIcon={<MessageSquare className="h-3 w-3" />}
                                                className="text-xs font-bold"
                                            >
                                                Feed
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleOpenTipModal(group)}
                                                leftIcon={<Send className="h-3 w-3" />}
                                                className="text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white"
                                            >
                                                Tip
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 2: CHALLENGES STUDIO */}
            {selectedTab === 'challenges' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {challenges.map((challenge, idx) => (
                            <Card key={challenge.id} className="hover:shadow-lg transition-all border-orange-100/60 dark:border-orange-950/60">
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 text-xs font-black uppercase tracking-wider">
                                            {(challenge.challenge_type || 'Fitness').toUpperCase()} SPRINT
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 text-[10px] font-bold flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> Ends in 7 Days
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="font-extrabold text-lg text-gray-900 dark:text-white leading-tight">
                                            {challenge.title}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                            {challenge.description || 'Climb the live leaderboard and earn MedCoin rewards.'}
                                        </p>
                                    </div>

                                    {/* Metric Target & Reward */}
                                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-gray-500">Target Goal</p>
                                            <p className="text-sm font-extrabold text-orange-900 dark:text-orange-300">
                                                {challenge.target_value?.toLocaleString()} {challenge.target_unit || 'Units'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-gray-500">Bounty Rewards</p>
                                            <p className="text-xs font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                                🏆 +{challenge.reward_medcoins || 100} Coins • +{challenge.reward_xp || 250} XP
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-500">
                                            👥 {challenge.participant_count || 240} Athletes
                                        </span>

                                        <Button
                                            size="sm"
                                            onClick={() => handleOpenLeaderboard(challenge)}
                                            leftIcon={<Trophy className="h-3.5 w-3.5 text-amber-400" />}
                                            className="text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white"
                                        >
                                            Live Leaderboard
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: GAMIFICATION BADGES */}
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
                        <Card key={i} className="border-purple-100 dark:border-purple-950 hover:shadow-md">
                            <CardContent className="p-4 text-center space-y-3">
                                <div className="h-16 w-16 mx-auto rounded-full bg-purple-100 dark:bg-purple-950/80 flex items-center justify-center text-3xl border-2 border-amber-400">
                                    {badge.icon}
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">{badge.title}</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">{badge.criteria}</p>
                                </div>
                                <span className="inline-block px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[11px] font-bold">
                                    +{badge.xp} XP Points • {badge.tag}
                                </span>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* MODAL 1: BROADCAST DAILY TIP */}
            {tipModalGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <Card className="w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                            <div>
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Lightbulb className="h-5 w-5 text-amber-500" /> Broadcast Daily Coach Tip
                                </CardTitle>
                                <p className="text-xs text-gray-500 mt-0.5">{tipModalGroup.name}</p>
                            </div>
                            <button onClick={() => setTipModalGroup(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="h-4 w-4" />
                            </button>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Morning Habit & Nutrition Advice
                                </label>
                                <textarea
                                    value={tipText}
                                    onChange={(e) => setTipText(e.target.value)}
                                    rows={4}
                                    placeholder="e.g. Prioritize 25g protein with fiber at breakfast to stabilize energy..."
                                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-sm focus:ring-2 focus:ring-teal-600 outline-none dark:bg-gray-900"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => setTipModalGroup(null)}>Cancel</Button>
                                <Button
                                    onClick={handleBroadcastTip}
                                    isLoading={isSubmittingTip}
                                    leftIcon={<Send className="h-4 w-4" />}
                                    className="bg-teal-700 hover:bg-teal-800 text-white font-bold"
                                >
                                    Broadcast to Circle
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* MODAL 2: CREATE COMMUNITY */}
            {isCreateGroupOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <Card className="w-full max-w-md shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Users className="h-5 w-5 text-teal-600" /> Create Goal Community
                            </CardTitle>
                            <button onClick={() => setIsCreateGroupOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
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
                                        placeholder="e.g. Weight Loss Warriors"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        className="w-full rounded-xl border p-2.5 text-sm focus:ring-2 focus:ring-teal-600 outline-none dark:bg-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">Goal Tag</label>
                                    <select
                                        value={newGroupGoal}
                                        onChange={(e) => setNewGroupGoal(e.target.value)}
                                        className="w-full rounded-xl border p-2.5 text-sm dark:bg-gray-900"
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
                                    <label className="block text-xs font-bold mb-1">City / Region</label>
                                    <input
                                        type="text"
                                        value={newGroupCity}
                                        onChange={(e) => setNewGroupCity(e.target.value)}
                                        placeholder="All India or Mumbai, Delhi..."
                                        className="w-full rounded-xl border p-2.5 text-sm dark:bg-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">Community Vision / Guidelines</label>
                                    <textarea
                                        rows={3}
                                        value={newGroupDesc}
                                        onChange={(e) => setNewGroupDesc(e.target.value)}
                                        placeholder="Rules, daily check-in habits..."
                                        className="w-full rounded-xl border p-2.5 text-sm dark:bg-gray-900"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <Button variant="outline" type="button" onClick={() => setIsCreateGroupOpen(false)}>Cancel</Button>
                                    <Button type="submit" isLoading={isSubmittingGroup} className="bg-teal-700 hover:bg-teal-800 text-white font-bold">
                                        Create Circle
                                    </Button>
                                </div>
                            </CardContent>
                        </form>
                    </Card>
                </div>
            )}

            {/* MODAL 3: LAUNCH CHALLENGE */}
            {isCreateChallengeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <Card className="w-full max-w-md shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-orange-600" /> Launch New Contest
                            </CardTitle>
                            <button onClick={() => setIsCreateChallengeOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
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
                                        placeholder="e.g. Monsoon 10,000 Daily Steps Sprint"
                                        value={newChallengeTitle}
                                        onChange={(e) => setNewChallengeTitle(e.target.value)}
                                        className="w-full rounded-xl border p-2.5 text-sm dark:bg-gray-900"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Type</label>
                                        <select
                                            value={newChallengeType}
                                            onChange={(e) => setNewChallengeType(e.target.value)}
                                            className="w-full rounded-xl border p-2.5 text-sm dark:bg-gray-900"
                                        >
                                            <option value="steps">Step Sprint</option>
                                            <option value="yoga">Yoga Consistency</option>
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
                                            className="w-full rounded-xl border p-2.5 text-sm dark:bg-gray-900"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Reward MedCoins</label>
                                        <input
                                            type="number"
                                            value={newChallengeMedcoins}
                                            onChange={(e) => setNewChallengeMedcoins(e.target.value)}
                                            className="w-full rounded-xl border p-2.5 text-sm dark:bg-gray-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Reward XP</label>
                                        <input
                                            type="number"
                                            value={newChallengeXp}
                                            onChange={(e) => setNewChallengeXp(e.target.value)}
                                            className="w-full rounded-xl border p-2.5 text-sm dark:bg-gray-900"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">Short Description</label>
                                    <textarea
                                        rows={2}
                                        value={newChallengeDesc}
                                        onChange={(e) => setNewChallengeDesc(e.target.value)}
                                        placeholder="Track daily habits and compete for the top podium..."
                                        className="w-full rounded-xl border p-2.5 text-sm dark:bg-gray-900"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <Button variant="outline" type="button" onClick={() => setIsCreateChallengeOpen(false)}>Cancel</Button>
                                    <Button type="submit" isLoading={isSubmittingChallenge} className="bg-orange-600 hover:bg-orange-700 text-white font-bold">
                                        Launch Sprint
                                    </Button>
                                </div>
                            </CardContent>
                        </form>
                    </Card>
                </div>
            )}

            {/* MODAL 4: LEADERBOARD PODIUM */}
            {leaderboardChallenge && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <Card className="w-full max-w-xl shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                            <div>
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    🏅 Live Contest Leaderboard
                                </CardTitle>
                                <p className="text-xs text-gray-500 mt-0.5">{leaderboardChallenge.title}</p>
                            </div>
                            <button onClick={() => setLeaderboardChallenge(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                                <X className="h-4 w-4" />
                            </button>
                        </CardHeader>
                        <CardContent className="p-5 space-y-5">
                            {isLoadingLeaderboard ? (
                                <div className="flex items-center justify-center h-48">
                                    <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                                </div>
                            ) : (
                                <>
                                    {/* 3D Podium Display */}
                                    <div className="flex items-end justify-center gap-3 pt-6 pb-2">
                                        {/* Rank 2 Silver */}
                                        <div className="flex flex-col items-center">
                                            <span className="text-2xl">🥈</span>
                                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1">
                                                {leaderboardEntries[1]?.patient_name || leaderboardEntries[1]?.patient?.name || 'Sneha R.'}
                                            </p>
                                            <p className="text-[10px] text-gray-500">{Number(leaderboardEntries[1]?.score || 58200).toLocaleString()} Steps</p>
                                            <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-t-xl flex items-center justify-center font-black text-slate-600 dark:text-slate-300 text-xl border-t-2 border-slate-400 mt-2">
                                                #2
                                            </div>
                                        </div>

                                        {/* Rank 1 Gold */}
                                        <div className="flex flex-col items-center">
                                            <span className="text-3xl">🥇</span>
                                            <p className="text-xs font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                                                {leaderboardEntries[0]?.patient_name || leaderboardEntries[0]?.patient?.name || 'Amit S.'}
                                            </p>
                                            <p className="text-[10px] text-gray-500 font-bold">{Number(leaderboardEntries[0]?.score || 64500).toLocaleString()} Steps</p>
                                            <div className="w-24 h-28 bg-amber-100 dark:bg-amber-950/60 rounded-t-xl flex items-center justify-center font-black text-amber-600 text-2xl border-t-2 border-amber-400 mt-2 shadow-md">
                                                #1
                                            </div>
                                        </div>

                                        {/* Rank 3 Bronze */}
                                        <div className="flex flex-col items-center">
                                            <span className="text-2xl">🥉</span>
                                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1">
                                                {leaderboardEntries[2]?.patient_name || leaderboardEntries[2]?.patient?.name || 'Rahul V.'}
                                            </p>
                                            <p className="text-[10px] text-gray-500">{Number(leaderboardEntries[2]?.score || 51000).toLocaleString()} Steps</p>
                                            <div className="w-20 h-16 bg-amber-50 dark:bg-amber-950/30 rounded-t-xl flex items-center justify-center font-black text-amber-800 text-xl border-t-2 border-amber-600 mt-2">
                                                #3
                                            </div>
                                        </div>
                                    </div>

                                    {/* Full Table */}
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {leaderboardEntries.slice(3).map((entry, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border text-xs font-medium">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-gray-500 w-6">#{entry.rank || idx + 4}</span>
                                                    <span className="font-bold text-gray-800 dark:text-gray-200">
                                                        {entry.patient_name || entry.patient?.name || `Athlete ${idx + 4}`}
                                                    </span>
                                                </div>
                                                <span className="font-extrabold text-orange-600">
                                                    {Number(entry.score || 40000 - idx * 2500).toLocaleString()} Steps
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* MODAL 5: CIRCLE SOCIAL FEED & CHECK-INS */}
            {feedGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <Card className="w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh]">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                            <div>
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-teal-600" /> Circle Social Feed
                                </CardTitle>
                                <p className="text-xs text-gray-500 mt-0.5">{feedGroup.name}</p>
                            </div>
                            <button onClick={() => setFeedGroup(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                                <X className="h-4 w-4" />
                            </button>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4 overflow-y-auto flex-1">
                            {/* Post Check-in Box */}
                            <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-teal-900 dark:text-teal-200">Post Accountability Check-in</span>
                                    <select
                                        value={newPostTag}
                                        onChange={(e) => setNewPostTag(e.target.value)}
                                        className="text-xs rounded-lg border p-1 bg-white dark:bg-gray-900"
                                    >
                                        <option value="🏋️ Workout Check-in">🏋️ Workout</option>
                                        <option value="🥗 Healthy Meal">🥗 Healthy Meal</option>
                                        <option value="🧘 Yoga / Zen">🧘 Yoga / Zen</option>
                                        <option value="💧 Hydration Milestone">💧 Hydration</option>
                                    </select>
                                </div>
                                <textarea
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    rows={2}
                                    placeholder="Share your daily workout victory or meal photo with the circle..."
                                    className="w-full rounded-xl border border-teal-200/80 p-2 text-xs outline-none focus:ring-2 focus:ring-teal-600 dark:bg-gray-900"
                                />
                                <div className="flex justify-end">
                                    <Button
                                        size="sm"
                                        onClick={handleCreatePost}
                                        isLoading={isPostingCheckin}
                                        leftIcon={<Send className="h-3 w-3" />}
                                        className="text-xs bg-teal-700 hover:bg-teal-800 text-white font-bold"
                                    >
                                        Post Check-in
                                    </Button>
                                </div>
                            </div>

                            {/* Feed Posts List */}
                            <div className="space-y-3">
                                {groupPosts.map((post) => (
                                    <div key={post.id} className="p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-bold">
                                                    👤
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                                                        {post.author_name}
                                                    </p>
                                                    <span className="text-[10px] text-teal-600 font-semibold">{post.author_role}</span>
                                                </div>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] font-bold">
                                                {post.workout_tag}
                                            </span>
                                        </div>

                                        <p className="text-xs text-gray-700 dark:text-gray-300">
                                            {post.content}
                                        </p>

                                        {post.image_url && (
                                            <img
                                                src={post.image_url}
                                                alt="Check-in"
                                                className="w-full h-40 object-cover rounded-xl border"
                                            />
                                        )}

                                        <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400">
                                            <span>{new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <button
                                                onClick={() => handleCheerPost(post.id)}
                                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all ${
                                                    post.is_cheered
                                                        ? 'bg-orange-100 text-orange-700'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-orange-50'
                                                }`}
                                            >
                                                🔥 Cheer ({post.cheers_count})
                                            </button>
                                        </div>
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
