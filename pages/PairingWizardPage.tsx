import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as api from '../services/apiService';
import { Tournament, PairingMethod, PairingRule } from '../types';

type UIRule = Omit<PairingRule, 'id'> & { id: number | string };

const PairingScheduleBuilder: React.FC = () => {
    const { tournamentId } = useParams<{ tournamentId: string }>();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [rules, setRules] = useState<UIRule[]>([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTournamentData = async () => {
            if (tournamentId) {
                setLoading(true);
                try {
                    const [t, r] = await Promise.all([
                        api.getTournament(tournamentId),
                        api.getPairingRules(tournamentId),
                    ]);

                    if (t) {
                        setTournament(t);
                        setRules(r.sort((a,b) => a.startRound - b.startRound));
                    } else {
                        navigate('/dashboard');
                    }
                } catch (err: any) {
                    console.error("Error fetching tournament data:", err);
                    setError(err.message || 'An unknown error occurred.');
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchTournamentData();
    }, [tournamentId, navigate]);

    const addRule = () => {
        setError(null);
        if (!tournament) return;
        const lastRule = rules[rules.length - 1];
        const newStartRound = lastRule ? lastRule.endRound + 1 : 1;
        if (newStartRound > tournament.totalRounds) {
            setError("Cannot add rule beyond the tournament's total rounds.");
            return;
        }

        const newRule: UIRule = {
            id: `new-${Date.now()}`,
            startRound: newStartRound,
            endRound: newStartRound,
            pairingMethod: 'Swiss',
            standingsSource: 'PreviousRound',
            allowedRepeats: 0,
            quartilePairingScheme: '1v3_2v4',
        };
        setRules([...rules, newRule]);
    };

    const updateRule = (id: number | string, updatedValues: Partial<UIRule>) => {
        setRules(rules.map(rule => rule.id === id ? { ...rule, ...updatedValues } : rule));
    };

    const removeRule = (id: number | string) => {
        setRules(rules.filter(rule => rule.id !== id));
    };

    const validateRules = (): boolean => {
        setError(null);
        const rounds = new Set<number>();
        for (const rule of rules) {
            if (rule.startRound > rule.endRound) {
                setError(`Rule for rounds ${rule.startRound}-${rule.endRound} is invalid: Start round cannot be after end round.`);
                return false;
            }
            for (let i = rule.startRound; i <= rule.endRound; i++) {
                if (rounds.has(i)) {
                    setError(`Validation Error: Round ${i} is defined in multiple rules. Please correct the overlapping ranges.`);
                    return false;
                }
                rounds.add(i);
            }
        }
        return true;
    }

    const handleSave = async () => {
        if (!tournamentId || !validateRules()) return;
        setSaving(true);
        try {
            await api.savePairingRules(tournamentId, rules);
            navigate(`/tournament/${tournamentId}/dashboard`);
        } catch (error) {
            console.error("Error saving pairing schedule:", error);
            setError((error as Error).message || "An error occurred while saving.");
        } finally {
            setSaving(false);
        }
    };
    
    if (loading || !tournament) {
        return <div className="flex items-center justify-center h-screen bg-slate-900 text-white">Loading Pairing Scheduler...</div>
    }

    const pairingMethods: PairingMethod[] = ['Swiss', 'Round Robin', 'King of the Hill', 'Quartiles', 'Australian Draw', 'Chew Pairings'];
    const standingsSources: UIRule['standingsSource'][] = ['PreviousRound', 'Lagged', 'Round0'];

    return (
       <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
        <div className="w-full max-w-4xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white text-center">Pairing Schedule Builder</h1>
            <p className="text-gray-400 mb-8 text-center">Define the pairing logic for the tournament. Pairings will be generated automatically as rounds complete.</p>
            
            <div className="bg-slate-800 rounded-lg shadow-lg p-6 md:p-8 space-y-4">
                {error && <div className="bg-red-900/50 text-red-300 p-3 rounded-md text-sm">{error}</div>}
                {rules.map((rule) => (
                    <div key={rule.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-cool-blue-300">Rule for Rounds {rule.startRound} to {rule.endRound}</h3>
                            <button onClick={() => removeRule(rule.id)} className="text-red-400 hover:text-red-300 text-sm">Remove</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1">From Round</label>
                                        <input type="number" min="1" max={tournament.totalRounds} value={rule.startRound} onChange={e => updateRule(rule.id, { startRound: parseInt(e.target.value) })} className="w-full p-2 bg-slate-700 rounded-md" />
                                    </div>
                                    <div className="pt-5"> - </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1">To Round</label>
                                        <input type="number" min="1" max={tournament.totalRounds} value={rule.endRound} onChange={e => updateRule(rule.id, { endRound: parseInt(e.target.value) })} className="w-full p-2 bg-slate-700 rounded-md" />
                                    </div>
                                </div>
                                 <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Pairing System</label>
                                    <select value={rule.pairingMethod} onChange={e => updateRule(rule.id, { pairingMethod: e.target.value as PairingMethod })} className="w-full p-2 bg-slate-700 rounded-md">
                                        {pairingMethods.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                 </div>
                            </div>

                             <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Base Standings On</label>
                                <select value={rule.standingsSource} onChange={e => updateRule(rule.id, { standingsSource: e.target.value as UIRule['standingsSource'] })} className="w-full p-2 bg-slate-700 rounded-md">
                                    <option value="PreviousRound">Previous Round</option>
                                    <option value="Lagged">Lagged (2 rounds prior)</option>
                                    <option value="Round0">Initial Ratings (Round 0)</option>
                                </select>
                             </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Allowed Repeats</label>
                                <input type="number" min="0" value={rule.allowedRepeats} onChange={e => updateRule(rule.id, { allowedRepeats: parseInt(e.target.value) })} className="w-full p-2 bg-slate-700 rounded-md" />
                             </div>
                            {rule.pairingMethod === 'Quartiles' && (
                                 <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Quartile Scheme</label>
                                    <select value={rule.quartilePairingScheme} onChange={e => updateRule(rule.id, { quartilePairingScheme: e.target.value as UIRule['quartilePairingScheme'] })} className="w-full p-2 bg-slate-700 rounded-md">
                                        <option value="1v3_2v4">Q1 vs Q3, Q2 vs Q4</option>
                                        <option value="1v2_3v4">Q1 vs Q2, Q3 vs Q4</option>
                                    </select>
                                 </div>
                            )}
                        </div>
                    </div>
                ))}

                <button onClick={addRule} className="w-full mt-4 py-3 border-2 border-dashed border-slate-600 text-slate-400 hover:bg-slate-700 hover:border-slate-500 rounded-lg transition">
                    + Add Pairing Rule
                </button>
            </div>

            <div className="mt-8 pt-4 flex justify-between items-center">
                <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 bg-transparent hover:bg-slate-700 text-gray-300 font-bold rounded-lg">
                    &larr; Back
                </button>
                <button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-cool-blue-600 hover:bg-cool-blue-700 disabled:bg-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-lg">
                    {saving ? 'Saving...' : 'Finish & Go to Dashboard'}
                </button>
            </div>
        </div>
    </div>
    );
};

export default PairingScheduleBuilder;