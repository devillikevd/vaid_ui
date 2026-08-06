'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    ClipboardList,
    Dumbbell,
    Loader2,
    Plus,
    RefreshCw,
    Utensils,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { wellnessApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/authStore';

interface WorkoutPlan { id: string; title: string; goal?: string; level?: string; plan_type?: string; minutes_per_session?: number; duration_weeks?: number; }
interface DietPlan { id: string; title: string; diet_type?: string; daily_calories?: number | null; status: string; patient?: { id?: string; name?: string | null } | null; }
interface CoachPatient { id: string; name?: string | null; }

export default function WellnessPlansPage() {
    const toast = useToast();
    const [plans, setPlans] = useState<WorkoutPlan[]>([]);
    const [coachPlans, setCoachPlans] = useState<WorkoutPlan[]>([]);
    const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
    const [clients, setClients] = useState<CoachPatient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isNutritionist, setIsNutritionist] = useState(false);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const [planRes, coachPlanRes, clientRes, profileRes] = await Promise.all([
                wellnessApi.getWorkoutPlans(undefined, 1, 20),
                wellnessApi.getCoachWorkoutPlans(),
                wellnessApi.getCoachPatients(),
                wellnessApi.getCoachProfile(),
            ]);
            setPlans(Array.isArray(planRes.data) ? planRes.data : []);
            setCoachPlans(coachPlanRes.success ? (Array.isArray(coachPlanRes.data) ? coachPlanRes.data : []) : []);
            setClients(clientRes.success ? (Array.isArray(clientRes.data) ? clientRes.data : []) : []);
            const subRole = profileRes.success ? (profileRes.data as { sub_role?: string })?.sub_role : null;
            setIsNutritionist(subRole === 'nutritionist');
            if (subRole === 'nutritionist') {
                const dietRes = await wellnessApi.getCoachDietPlans();
                setDietPlans(dietRes.success ? (Array.isArray(dietRes.data) ? dietRes.data : []) : []);
            }
        } catch (err) {
            toast.error('Load failed', err instanceof Error ? err.message : 'Unable to load plans');
        } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const createPlan = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const title = String(fd.get('planTitle') || '').trim();
        if (!title) return;
        try {
            const res = await wellnessApi.createCoachWorkoutPlan({
                title, goal: String(fd.get('planGoal') || 'general_fitness'), level: String(fd.get('planLevel') || 'beginner'),
                patient_id: String(fd.get('planPatient') || '') || undefined, assign: fd.get('planAssign') === 'on', is_public: true,
            });
            if (!res.success) throw new Error(res.error || 'Failed');
            toast.success('Plan created', `"${title}" added.`);
            form.reset();
            await load();
        } catch (err) { toast.error('Failed', err instanceof Error ? err.message : 'Unable to create plan'); }
    };

    const createDiet = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const title = String(fd.get('dietTitle') || '').trim();
        if (!title) return;
        try {
            const res = await wellnessApi.createDietPlan({
                title, diet_type: String(fd.get('dietType') || 'balanced'),
                daily_calories: Number(fd.get('dietCalories')) || undefined,
                patient_id: String(fd.get('dietPatient') || '') || undefined,
            });
            if (!res.success) throw new Error(res.error || 'Failed');
            toast.success('Diet plan created', `"${title}" saved.`);
            form.reset();
            await load();
        } catch (err) { toast.error('Failed', err instanceof Error ? err.message : 'Unable to create diet plan'); }
    };

    const archiveDiet = async (id: string, title: string) => {
        try {
            const res = await wellnessApi.archiveDietPlan(id);
            if (!res.success) throw new Error(res.error || 'Failed');
            toast.success('Archived', `"${title}" archived.`);
            await load();
        } catch (err) { toast.error('Failed', err instanceof Error ? err.message : 'Unable to archive'); }
    };

    if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-lime-600" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Plans</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Create workout and diet plans, assign to clients.</p>
                </div>
                <Button variant="outline" onClick={load} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Workout Plan Builder */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5 text-lime-600" /> Workout Plan Builder</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <form onSubmit={createPlan} className="space-y-3">
                            <input name="planTitle" placeholder="Plan title (e.g. 4-week home strength)" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-900" required />
                            <div className="grid grid-cols-2 gap-3">
                                <select name="planLevel" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                                    <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
                                </select>
                                <select name="planGoal" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                                    <option value="general_fitness">General fitness</option><option value="weight_loss">Weight loss</option><option value="strength">Strength</option><option value="stress_reduction">Stress reduction</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <select name="planPatient" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                                    <option value="">No client yet</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name || 'Client'}</option>)}
                                </select>
                                <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700">
                                    <input name="planAssign" type="checkbox" className="h-4 w-4" /> Assign now
                                </label>
                            </div>
                            <Button type="submit" className="w-full" leftIcon={<Plus className="h-4 w-4" />}>Create Plan</Button>
                        </form>
                        {coachPlans.length > 0 && (
                            <div className="space-y-2 mt-4 border-t pt-4 dark:border-gray-800">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Plans ({coachPlans.length})</p>
                                {coachPlans.map(p => (
                                    <div key={p.id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{p.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{[p.level, p.goal].filter(Boolean).join(' • ') || 'Draft'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Diet Plan Builder (nutritionists only) */}
                {isNutritionist && (
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Utensils className="h-5 w-5 text-orange-600" /> Diet Plans</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={createDiet} className="space-y-3">
                                <input name="dietTitle" placeholder="Diet plan title" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-900" required />
                                <div className="grid grid-cols-2 gap-3">
                                    <select name="dietType" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                                        <option value="balanced">Balanced</option><option value="weight_loss">Weight loss</option><option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option><option value="keto">Keto</option>
                                    </select>
                                    <input name="dietCalories" type="number" placeholder="Daily kcal" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
                                </div>
                                <select name="dietPatient" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                                    <option value="">General plan</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name || 'Client'}</option>)}
                                </select>
                                <Button type="submit" className="w-full" leftIcon={<Plus className="h-4 w-4" />}>Create Diet Plan</Button>
                            </form>
                            {dietPlans.length > 0 && (
                                <div className="space-y-2 mt-4 border-t pt-4 dark:border-gray-800">
                                    {dietPlans.map(p => (
                                        <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                                            <div><p className="font-medium text-gray-900 dark:text-gray-100">{p.title}</p>
                                                <p className="text-xs text-gray-500">{[p.diet_type, p.daily_calories ? `${p.daily_calories} kcal` : null, p.patient?.name].filter(Boolean).join(' • ')}</p></div>
                                            {p.status === 'active' && <Button size="sm" variant="outline" onClick={() => archiveDiet(p.id, p.title)}>Archive</Button>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Public plan library */}
                <Card className={isNutritionist ? 'xl:col-span-2' : ''}>
                    <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-purple-600" /> Plan Library ({plans.length})</CardTitle></CardHeader>
                    <CardContent>
                        {plans.length === 0 ? (
                            <p className="text-center py-8 text-gray-500 dark:text-gray-400">No published workout plans yet.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {plans.map(p => (
                                    <div key={p.id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{p.title}</p>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            {[p.goal, p.level, p.minutes_per_session ? `${p.minutes_per_session} min` : null, p.duration_weeks ? `${p.duration_weeks} wk` : null].filter(Boolean).join(' • ') || 'Details not set'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
