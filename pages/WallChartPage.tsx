import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import * as api from '../services/apiService';
import { Player, Match, Tournament } from '../types';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import SkeletonLoader from '../components/SkeletonLoader';

const WallChartSkeleton: React.FC = () => (
    <div className="p-4 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
                <SkeletonLoader className="h-10 w-64 mb-1" />
                <SkeletonLoader className="h-5 w-80" />
            </div>
        </div>
        <div className="overflow-x-auto bg-slate-800 rounded-lg p-4 shadow-lg">
            <table className="w-full min-w-[800px] border-collapse">
                <thead>
                    <tr>
                        <th className="p-2 border border-slate-700 bg-slate-900/50 w-32"><SkeletonLoader className="h-6" /></th>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <th key={i} className="p-1 border border-slate-700 bg-slate-900/50">
                                <SkeletonLoader className="h-24 w-6 mx-auto" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}>
                            <td className="p-2 border border-slate-700 bg-slate-900/50"><SkeletonLoader className="h-6" /></td>
                            {Array.from({ length: 6 }).map((_, j) => (
                                <td key={j} className="p-2 border border-slate-700">
                                    {i !== j && <SkeletonLoader className="h-6" />}
                                    {i === j && <div className="bg-slate-700 h-6 rounded"></div>}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const WallChartPage: React.FC<{ isPublic?: boolean }> = ({ isPublic = false }) => {
    const { tournamentId: idFromParams, slug } = useParams<{ tournamentId: string; slug: string }>();
    const context = useOutletContext<{ tournament: Tournament | null }>();
    const tournamentId = isPublic ? context?.tournament?.id : idFromParams;

    const [players, setPlayers] = useState<Player[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (tournamentId) {
            setLoading(true);
            const tournamentData = isPublic ? context?.tournament : await api.getTournament(tournamentId);
            setTournament(tournamentData || null);

            if (tournamentData) {
                const [playersData, matchesData] = await Promise.all([
                    api.getPlayers(tournamentId),
                    api.getMatches(tournamentId),
                ]);
                setPlayers(playersData);
                setMatches(matchesData);
            }
            setLoading(false);
        }
    }, [tournamentId, isPublic, context?.tournament]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useRealtimeUpdates(fetchData);

    const sortedPlayers = useMemo(() => {
        return [...players].sort((a,b) => a.seed - b.seed);
    }, [players]);

    const matchMap = useMemo(() => {
        const map = new Map<string, Match>();
        matches.forEach(match => {
            if (match.playerB) {
                const key1 = `${match.playerA.id}-${match.playerB.id}`;
                const key2 = `${match.playerB.id}-${match.playerA.id}`;
                map.set(key1, match);
                map.set(key2, match);
            }
        });
        return map;
    }, [matches]);

    if (loading) return <WallChartSkeleton />;

    if (!tournament) return <div className="p-8 text-center text-red-400">Tournament not found.</div>;
    
    return (
        <div className="p-4 md:p-8 printable-area">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">Wall Chart</h1>
                    <p className="text-gray-400 mt-1">{tournament.name}</p>
                </div>
                <button onClick={() => window.print()} className="px-4 py-2 text-sm font-bold rounded-lg bg-slate-600 hover:bg-slate-500 text-white transition no-print mt-4 sm:mt-0">
                    Print
                </button>
            </div>
            
            <div className="overflow-x-auto bg-slate-800 rounded-lg p-4 shadow-lg">
                <table className="w-full min-w-[800px] border-collapse">
                    <thead>
                        <tr>
                            <th className="p-2 border border-slate-700 bg-slate-900/50 w-32"></th>
                            {sortedPlayers.map(p => (
                                <th key={p.id} className="p-1 border border-slate-700 bg-slate-900/50 text-xs text-white" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                    <div className="py-2">
                                        <Link to={isPublic && slug ? `/public/t/${slug}/player/${p.id}` : `/tournament/${tournamentId}/player/${p.id}`} className="hover:text-cool-blue-400 whitespace-nowrap">{p.name} (#{p.seed})</Link>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedPlayers.map(rowPlayer => (
                            <tr key={rowPlayer.id} className="hover:bg-slate-700/50">
                                <td className="p-2 border border-slate-700 bg-slate-900/50 text-white font-bold text-xs truncate">
                                    <Link to={isPublic && slug ? `/public/t/${slug}/player/${rowPlayer.id}` : `/tournament/${tournamentId}/player/${rowPlayer.id}`} className="hover:text-cool-blue-400">{rowPlayer.name} (#{rowPlayer.seed})</Link>
                                </td>
                                {sortedPlayers.map(colPlayer => {
                                    if (rowPlayer.id === colPlayer.id) {
                                        return <td key={colPlayer.id} className="p-2 border border-slate-700 bg-slate-700"></td>;
                                    }
                                    const match = matchMap.get(`${rowPlayer.id}-${colPlayer.id}`);
                                    let content = '';
                                    let className = 'text-gray-400';
                                    if (match) {
                                        if (match.status === 'completed' && match.scoreA !== null && match.scoreB !== null) {
                                            const isRowPlayerA = match.playerA.id === rowPlayer.id;
                                            const rowPlayerScore = isRowPlayerA ? match.scoreA : match.scoreB;
                                            const colPlayerScore = isRowPlayerA ? match.scoreB : match.scoreA;

                                            if (rowPlayerScore > colPlayerScore) {
                                                content = 'W';
                                                className = 'text-green-300 font-bold';
                                            } else if (colPlayerScore > rowPlayerScore) {
                                                content = 'L';
                                                className = 'text-red-400';
                                            } else {
                                                content = 'T';
                                                className = 'text-yellow-300';
                                            }
                                        }
                                    }

                                    return (
                                        <td key={colPlayer.id} className={`p-2 border border-slate-700 text-center font-mono ${className}`}>
                                            {content}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {sortedPlayers.length === 0 && <p className="p-4 text-center text-gray-400">No players in this tournament to display.</p>}
            </div>
        </div>
    );
};

export default WallChartPage;