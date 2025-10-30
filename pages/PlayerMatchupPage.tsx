import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import * as api from '../services/apiService';
import { Player, PlayerMatchup, Tournament } from '../types';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import SkeletonLoader from '../components/SkeletonLoader';

const MatchupSkeleton: React.FC = () => (
    <div className="max-w-4xl mx-auto">
        <SkeletonLoader className="h-10 w-72 mb-2" />
        <SkeletonLoader className="h-6 w-96 mb-8" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800 p-4 rounded-lg mb-8">
            <div>
                <SkeletonLoader className="h-5 w-24 mb-1" />
                <SkeletonLoader className="h-12 w-full" />
            </div>
            <div>
                <SkeletonLoader className="h-5 w-24 mb-1" />
                <SkeletonLoader className="h-12 w-full" />
            </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 text-center mb-6">
            <div className="grid grid-cols-3 divide-x divide-slate-700">
                <div className="px-4"><SkeletonLoader className="h-8 w-1/2 mx-auto" /></div>
                <div className="px-4"><SkeletonLoader className="h-8 w-1/2 mx-auto" /></div>
                <div className="px-4"><SkeletonLoader className="h-8 w-1/2 mx-auto" /></div>
            </div>
        </div>
    </div>
);

const PlayerMatchupPage: React.FC = () => {
    const { tournament: tournamentFromContext } = useOutletContext<{ tournament: Tournament }>();
    const tournamentId = tournamentFromContext.id;

    const [players, setPlayers] = useState<Player[]>([]);
    const [playerAId, setPlayerAId] = useState<string>('');
    const [playerBId, setPlayerBId] = useState<string>('');
    const [matchup, setMatchup] = useState<PlayerMatchup | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (tournamentId) {
            setLoading(true);
            const allPlayers = (await api.getPlayers(tournamentId)).sort((a,b) => a.name.localeCompare(b.name));
            setPlayers(allPlayers);
            if (allPlayers.length >= 2) {
                if (!playerAId) setPlayerAId(allPlayers[0].id.toString());
                if (!playerBId) setPlayerBId(allPlayers[1].id.toString());
            }
            setLoading(false);
        }
    }, [tournamentId, playerAId, playerBId]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    useRealtimeUpdates(fetchData);

    useEffect(() => {
        const fetchHistory = async () => {
            if (tournamentId && playerAId && playerBId && playerAId !== playerBId) {
                const history = await api.getPlayerVsPlayerHistory(tournamentId, parseInt(playerAId), parseInt(playerBId));
                setMatchup(history);
            } else {
                setMatchup(null);
            }
        };
        fetchHistory();
    }, [tournamentId, playerAId, playerBId, players]); // depend on players to re-run after fetch

    const playerA = players.find(p => p.id.toString() === playerAId);
    const playerB = players.find(p => p.id.toString() === playerBId);

    if(loading) {
        return <MatchupSkeleton />;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-white">Head-to-Head Matchup</h1>
            <p className="text-gray-400 mt-1 mb-8">{tournamentFromContext?.name}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800 p-4 rounded-lg mb-8">
                <div>
                    <label htmlFor="playerA" className="block text-sm font-bold text-gray-300 mb-1">Player A</label>
                    <select id="playerA" value={playerAId} onChange={e => setPlayerAId(e.target.value)} className="w-full bg-slate-700 text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500">
                        {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="playerB" className="block text-sm font-bold text-gray-300 mb-1">Player B</label>
                    <select id="playerB" value={playerBId} onChange={e => setPlayerBId(e.target.value)} className="w-full bg-slate-700 text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500">
                        {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            </div>

            {playerA && playerB && matchup && (
                <>
                    <div className="bg-slate-800 rounded-lg p-6 text-center mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-700">
                            <div className="px-4 py-4 md:py-0">
                                <p className="text-4xl font-bold text-cool-blue-300">{matchup.winsA}</p>
                                <p className="text-sm text-gray-400">Wins for {playerA.name}</p>
                            </div>
                            <div className="px-4 py-4 md:py-0">
                                <p className="text-4xl font-bold text-white">{matchup.draws}</p>
                                <p className="text-sm text-gray-400">Draws</p>
                            </div>
                            <div className="px-4 py-4 md:py-0">
                                <p className="text-4xl font-bold text-cool-blue-300">{matchup.winsB}</p>
                                <p className="text-sm text-gray-400">Wins for {playerB.name}</p>
                            </div>
                        </div>
                    </div>
                     <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left responsive-table">
                                <thead className="bg-slate-900/50 text-sm text-gray-400">
                                    <tr>
                                        <th className="p-3">Round</th>
                                        <th className="p-3">Winner</th>
                                        <th className="p-3 text-right">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-200">
                                    {matchup.matches.map(m => {
                                        const winner = m.scoreA! > m.scoreB! ? m.playerA : m.scoreB! > m.scoreA! ? m.playerB : null;
                                        return (
                                            <tr key={m.id} className="border-t border-slate-700">
                                                <td data-label="Round" className="p-3">{m.round}</td>
                                                <td data-label="Winner" className={`p-3 font-bold ${winner ? (winner.id === playerA.id ? 'text-green-300' : 'text-green-300') : 'text-yellow-300'}`}>
                                                    {winner ? winner.name : 'Draw'}
                                                </td>
                                                <td data-label="Score" className="p-3 text-right font-mono">{m.scoreA} - {m.scoreB}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                     </div>
                </>
            )}

            {playerAId && playerBId && playerAId === playerBId && (
                <div className="text-center p-6 bg-slate-800 rounded-lg text-yellow-300">
                    Please select two different players to compare.
                </div>
            )}
        </div>
    );
};

export default PlayerMatchupPage;