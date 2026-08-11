'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { doctorApi } from '@/lib/api';
import { Loader2, Plus, X, Save } from 'lucide-react';

interface PatientMedicalHistoryProps {
    patientId: string;
    allergies: string[];
    chronicConditions: string[];
    currentMedications: any[];
    internalNotes: string;
    onUpdate: () => void;
}

export function PatientMedicalHistory({ patientId, allergies: initialAllergies, chronicConditions: initialChronic, currentMedications: initialMeds, internalNotes: initialNotes, onUpdate }: PatientMedicalHistoryProps) {
    const [allergies, setAllergies] = useState<string[]>(initialAllergies || []);
    const [chronic, setChronic] = useState<string[]>(initialChronic || []);
    const [meds, setMeds] = useState<any[]>(initialMeds || []);
    const [notes, setNotes] = useState(initialNotes || '');

    const [newAllergy, setNewAllergy] = useState('');
    const [newChronic, setNewChronic] = useState('');
    const [newMed, setNewMed] = useState('');
    
    const [isSavingHistory, setIsSavingHistory] = useState(false);
    const [isSavingNotes, setIsSavingNotes] = useState(false);

    const handleSaveHistory = async () => {
        setIsSavingHistory(true);
        try {
            await doctorApi.updatePatientMedicalHistory(patientId, {
                allergies,
                chronic_conditions: chronic,
                current_medications: meds
            });
            onUpdate();
        } catch (error) {
            console.error('Failed to save history', error);
        } finally {
            setIsSavingHistory(false);
        }
    };

    const handleSaveNotes = async () => {
        setIsSavingNotes(true);
        try {
            await doctorApi.updatePatientInternalNotes(patientId, notes);
            onUpdate();
        } catch (error) {
            console.error('Failed to save notes', error);
        } finally {
            setIsSavingNotes(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Medical History</CardTitle>
                    <Button onClick={handleSaveHistory} disabled={isSavingHistory} leftIcon={isSavingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}>
                        Save History
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h4 className="text-sm font-semibold mb-2">Allergies</h4>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {allergies.map((a, i) => (
                                <span key={i} className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                                    {a} <X className="h-3 w-3 cursor-pointer" onClick={() => setAllergies(allergies.filter((_, idx) => idx !== i))} />
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input type="text" value={newAllergy} onChange={e => setNewAllergy(e.target.value)} placeholder="Add allergy..." className="flex-1 rounded-md border p-2 text-sm" onKeyDown={e => {
                                if (e.key === 'Enter' && newAllergy.trim()) {
                                    setAllergies([...allergies, newAllergy.trim()]);
                                    setNewAllergy('');
                                }
                            }} />
                            <Button variant="outline" onClick={() => { if(newAllergy.trim()) { setAllergies([...allergies, newAllergy.trim()]); setNewAllergy(''); } }}>Add</Button>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold mb-2">Chronic Conditions</h4>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {chronic.map((c, i) => (
                                <span key={i} className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                                    {c} <X className="h-3 w-3 cursor-pointer" onClick={() => setChronic(chronic.filter((_, idx) => idx !== i))} />
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input type="text" value={newChronic} onChange={e => setNewChronic(e.target.value)} placeholder="Add condition..." className="flex-1 rounded-md border p-2 text-sm" onKeyDown={e => {
                                if (e.key === 'Enter' && newChronic.trim()) {
                                    setChronic([...chronic, newChronic.trim()]);
                                    setNewChronic('');
                                }
                            }} />
                            <Button variant="outline" onClick={() => { if(newChronic.trim()) { setChronic([...chronic, newChronic.trim()]); setNewChronic(''); } }}>Add</Button>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold mb-2">Current Medications</h4>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {meds.map((m, i) => (
                                <span key={i} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                                    {typeof m === 'string' ? m : m.name || JSON.stringify(m)} <X className="h-3 w-3 cursor-pointer" onClick={() => setMeds(meds.filter((_, idx) => idx !== i))} />
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input type="text" value={newMed} onChange={e => setNewMed(e.target.value)} placeholder="Add medication..." className="flex-1 rounded-md border p-2 text-sm" onKeyDown={e => {
                                if (e.key === 'Enter' && newMed.trim()) {
                                    setMeds([...meds, newMed.trim()]);
                                    setNewMed('');
                                }
                            }} />
                            <Button variant="outline" onClick={() => { if(newMed.trim()) { setMeds([...meds, newMed.trim()]); setNewMed(''); } }}>Add</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Internal Notes (Private)</CardTitle>
                    <Button onClick={handleSaveNotes} disabled={isSavingNotes} leftIcon={isSavingNotes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}>
                        Save Notes
                    </Button>
                </CardHeader>
                <CardContent>
                    <textarea 
                        className="w-full h-32 p-3 border rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="These notes are only visible to you..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
