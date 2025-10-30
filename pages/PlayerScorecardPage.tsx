import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import * as api from '../services/apiService';
import { PlayerScorecardData, Match, Tournament, Team } from '../types';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import SkeletonLoader from '../components/SkeletonLoader';

const ScorecardSkeleton: React.FC = () => (
    <div>
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <SkeletonLoader className="h-20 w-20 rounded-full" />
            <div className="flex-grow">
                <SkeletonLoader className="h-8 w-64 mb-2" />
                <SkeletonLoader className="h-5 w-80" />
            </div>
        </div>
        <div className="bg-slate-800 rounded-lg shadow-lg p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div><SkeletonLoader className="h-5 w-20 mx-auto mb-1" /><SkeletonLoader className="h-7 w-12 mx-auto" /></div>
                <div><SkeletonLoader className="h-5 w-20 mx-auto mb-1" /><SkeletonLoader className="h-7 w-12 mx-auto" /></div>
                <div><SkeletonLoader className="h-5 w-20 mx-auto mb-1" /><SkeletonLoader className="h-7 w-12 mx-auto" /></div>
                <div><SkeletonLoader className="h-5 w-20 mx-auto mb-1" /><SkeletonLoader className="h-7 w-12 mx-auto" /></div>
            </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-slate-800 p-3 rounded-lg"><SkeletonLoader className="h-20 w-full" /></div>
            ))}
        </div>
    </div>
);


const PlayerScorecardPage: React.FC<{ isPublic?: boolean }> = ({ isPublic = false }) => {
    const { tournamentId: idFromParams, slug, playerId } = useParams<{ tournamentId: string; slug: string; playerId: string }>();
    const context = useOutletContext<{ tournament: Tournament | null }>();
    
    const tournamentFromContext = context?.tournament;
    const tournamentId = isPublic ? tournamentFromContext?.id : idFromParams;

    const [scorecardData, setScorecardData] = useState<PlayerScorecardData | null>(null);
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    
    const fetchData = useCallback(async () => {
        if (!tournamentId || !playerId) return;
        
        try {
            const numericPlayerId = parseInt(playerId, 10);
            if(isNaN(numericPlayerId)) throw new Error("Invalid Player ID");

            let tournamentData = tournamentFromContext;
            if (!isPublic) {
                tournamentData = await api.getTournament(tournamentId);
            }
            setTournament(tournamentData);

            if (tournamentData) {
                const [scorecard, teamsData] = await Promise.all([
                    api.getPlayerScorecard(tournamentId, numericPlayerId),
                    tournamentData.tournamentMode === 'team' ? api.getTeams(tournamentId) : Promise.resolve([])
                ]);
                setScorecardData(scorecard);
                setTeams(teamsData);
            }
        } catch (error) {
            console.error("Failed to fetch scorecard data:", error);
        } finally {
            setLoading(false);
        }
    }, [tournamentId, playerId, isPublic, tournamentFromContext]);
    
    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [fetchData]);

    useRealtimeUpdates(fetchData);

    const getResultStyles = (match: Match, currentPlayerId: number): { border: string; text: string; spread: string; } => {
        if (!match.playerB) return { border: 'border-green-500', text: 'Win (Bye)', spread: '' };
        if (match.status !== 'completed' || match.scoreA === null || match.scoreB === null) return { border: 'border-slate-600', text: 'Pending', spread: '' };
        
        const isPlayerA = match.playerA.id === currentPlayerId;
        const playerScore = isPlayerA ? match.scoreA : match.scoreB;
        const opponentScore = isPlayerA ? match.scoreB : match.scoreA;
        const spread = playerScore - opponentScore;

        if (playerScore > opponentScore) return { border: 'border-green-500', text: 'Win', spread: `+${spread}` };
        if (opponentScore > playerScore) return { border: 'border-red-500', text: 'Loss', spread: `${spread}` };
        return { border: 'border-yellow-500', text: 'Tie', spread: '0' };
    };

    if (loading) {
        return <ScorecardSkeleton />;
    }

    if (!scorecardData || !scorecardData.player || !tournament) {
        return <div className="p-8 text-center text-red-400">Could not load scorecard data.</div>;
    }
    
    const { player, standing, matches } = scorecardData;
    const teamName = player.teamId ? teams.find(t => t.id === player.teamId)?.name : null;

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                </div>
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl font-bold text-white">{player.name}</h1>
                    <p className="text-gray-400">{tournament.name}</p>
                </div>
            </div>

            <div className="bg-slate-800 rounded-lg shadow-lg p-4 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-xs text-gray-400 uppercase">Rank</p>
                        <p className="text-2xl font-bold text-cool-blue-300">{standing?.rank ?? 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase">Record</p>
                        <p className="text-2xl font-bold text-white">{standing ? `${standing.wins}-${standing.losses}` : 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase">Rating</p>
                        <p className="text-2xl font-bold text-white">{player.rating}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase">Team</p>
                        <p className="text-lg font-semibold text-white truncate">{teamName ?? 'Individual'}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                {matches.map(m => {
                    const result = getResultStyles(m, player.id);
                    const opponent = m.playerA.id === player.id ? m.playerB : m.playerA;
                    const scoreStr = m.scoreA !== null && m.scoreB !== null ? `${m.scoreA} - ${m.scoreB}` : '-';

                    return (
                        <div key={m.id} className={`bg-slate-800 rounded-lg shadow-md p-3 border-t-4 ${result.border} flex flex-col justify-between`}>
                            <div>
                                <div className="flex justify-between items-baseline">
                                    <p className="text-xs text-gray-400">Round {m.round}</p>
                                    <p className={`text-xs font-bold ${result.border.replace('border', 'text')}`}>{result.spread}</p>
                                </div>
                                <p className="text-sm font-semibold text-white mt-1 truncate">
                                    vs {opponent ? (
                                        <Link 
                                            to={isPublic ? `/public/t/${slug}/player/${opponent.id}` : `/tournament/${tournamentId}/player/${opponent.id}`}
                                            className="hover:text-cool-blue-300 hover:underline"
                                        >
                                            {opponent.name}
                                        </Link>
                                    ) : 'BYE'}
                                </p>
                            </div>
                            <p className="text-right font-mono text-gray-300 mt-2">{scoreStr}</p>
                        </div>
                    );
                })}
            </div>
            {matches.length === 0 && <p className="p-4 text-center text-gray-400 bg-slate-800 rounded-lg">No matches played yet.</p>}
        </div>
    );
};

export default PlayerScorecardPage;