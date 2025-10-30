import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as api from '../services/apiService';
import { Tournament, Player, Team } from '../types';
import SkeletonLoader from '../components/SkeletonLoader';

const ManageTeamsSkeleton: React.FC = () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
        <div className="w-full max-w-4xl">
            <SkeletonLoader className="h-10 w-3/4 mx-auto mb-2" />
            <SkeletonLoader className="h-5 w-1/2 mx-auto mb-8" />
            <div className="bg-slate-800 rounded-lg shadow-lg p-8">
                <div className="mb-6">
                    <SkeletonLoader className="h-7 w-48 mb-2" />
                    <div className="flex gap-2">
                        <SkeletonLoader className="h-12 flex-grow" />
                        <SkeletonLoader className="h-12 w-28" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <SkeletonLoader className="h-7 w-1/2 mb-2" />
                        <div className="bg-slate-900/50 p-4 rounded-md space-y-2 min-h-[200px]">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <SkeletonLoader key={i} className="h-10 w-full" />
                            ))}
                        </div>
                    </div>
                    <div>
                        <SkeletonLoader className="h-7 w-1/2 mb-2" />
                        <div className="space-y-4">
                            <SkeletonLoader className="h-24 w-full" />
                            <SkeletonLoader className="h-24 w-full" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);


const ManageTeamsPage: React.FC = () => {
    const { tournamentId } = useParams<{ tournamentId: string }>();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [newTeamName, setNewTeamName] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        if (tournamentId) {
            setLoading(true);
            const t = await api.getTournament(tournamentId);
            if (!t || t.tournamentMode !== 'team') {
                navigate('/dashboard'); // Redirect if not a team tournament
                return;
            }
            const [playersData, teamsData] = await Promise.all([
                api.getPlayers(tournamentId),
                api.getTeams(tournamentId)
            ]);
            setTournament(t);
            setPlayers(playersData);
            setTeams(teamsData);
            setLoading(false);
        }
    }, [tournamentId, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tournamentId || !newTeamName.trim()) return;
        const newTeam = await api.createTeam(tournamentId, newTeamName.trim());
        if (newTeam) {
            setTeams(prev => [...prev, newTeam]);
            setNewTeamName('');
        }
    };

    const handlePlayerTeamChange = async (playerId: number, teamIdStr: string) => {
        if (!tournamentId) return;
        const newTeamId = teamIdStr === 'unassigned' ? null : parseInt(teamIdStr, 10);
        const updatedPlayer = await api.assignPlayerToTeam(playerId, newTeamId);
        if (updatedPlayer) {
            setPlayers(prev => prev.map(p => p.id === playerId ? updatedPlayer : p));
        }
    };

    const handleContinue = () => {
        if (!tournamentId) return;
        // Simple validation: ensure every player is on a team
        if (players.some(p => p.teamId === null)) {
            alert("Please assign all players to a team before continuing.");
            return;
        }
        setSaving(true);
        navigate(`/tournament/${tournamentId}/pairing-scheduler`);
    }

    const unassignedPlayers = players.filter(p => p.teamId === null);
    const getTeamPlayers = (teamId: number) => players.filter(p => p.teamId === teamId);
    
    if (loading) {
        return <ManageTeamsSkeleton />;
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
            <div className="w-full max-w-4xl">
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white text-center">Manage Teams for {tournament?.name}</h1>
                <p className="text-gray-400 mb-8 text-center">Step 2.5: Create teams and assign players.</p>
                <div className="bg-slate-800 rounded-lg shadow-lg p-8">
                    <div className="mb-6">
                         <h3 className="font-bold text-lg text-cool-blue-300 mb-2">Create New Team</h3>
                         <form onSubmit={handleCreateTeam} className="flex flex-col sm:flex-row gap-2">
                             <input 
                                type="text"
                                value={newTeamName}
                                onChange={e => setNewTeamName(e.target.value)}
                                placeholder="Team Name"
                                className="flex-grow p-3 bg-slate-700 rounded-md"
                             />
                             <button type="submit" className="px-6 py-3 bg-slate-600 hover:bg-slate-500 font-bold rounded-lg" disabled={!newTeamName.trim()}>
                                Add Team
                             </button>
                         </form>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                             <h3 className="font-bold text-lg text-cool-blue-300 mb-2">Unassigned Players ({unassignedPlayers.length})</h3>
                             <div className="bg-slate-900/50 p-4 rounded-md space-y-2 min-h-[200px]">
                                {unassignedPlayers.map(p => (
                                    <div key={p.id} className="flex items-center justify-between bg-slate-700 p-2 rounded text-gray-200">
                                        <span>{p.name}</span>
                                        <select value={p.teamId || 'unassigned'} onChange={e => handlePlayerTeamChange(p.id, e.target.value)} className="bg-slate-600 text-xs p-1 rounded">
                                            <option value="unassigned">Assign to...</option>
                                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                ))}
                             </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-cool-blue-300 mb-2">Teams ({teams.length})</h3>
                            <div className="space-y-4">
                                {teams.map(team => (
                                    <div key={team.id} className="bg-slate-900/50 p-4 rounded-md">
                                        <h4 className="font-bold text-white mb-2">{team.name}</h4>
                                        <div className="space-y-2">
                                            {getTeamPlayers(team.id).map(p => (
                                                <div key={p.id} className="flex items-center justify-between bg-slate-700 p-2 rounded text-gray-200">
                                                    <span>{p.name}</span>
                                                    <button onClick={() => handlePlayerTeamChange(p.id, 'unassigned')} className="text-red-400 text-xs hover:text-red-300">Remove</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                <div className="mt-8 pt-4 flex justify-between items-center">
                    <button type="button" onClick={() => navigate(`/tournament/${tournamentId}/add-players`)} className="px-6 py-3 bg-transparent hover:bg-slate-700 text-gray-300 font-bold rounded-lg">
                        &larr; Back
                    </button>
                    <button onClick={handleContinue} disabled={saving} className="px-8 py-3 bg-cool-blue-600 hover:bg-cool-blue-700 disabled:bg-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-lg">
                        {saving ? 'Saving...' : 'Save & Continue'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ManageTeamsPage;