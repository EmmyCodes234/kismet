import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTournament, getMatches, getPlayers } from '../services/localStorageService';
import { Tournament, Match, Player } from '../types';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';

const PublicPairingsPage: React.FC = () => {
    const { tournamentId } = useParams<{ tournamentId: string }>();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [allMatches, setAllMatches] = useState<Match[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRound, setSelectedRound] = useState<number | null>(null);
    const [selectedDivisionId, setSelectedDivisionId] = useState<number | 'all'>('all');

    const fetchData = useCallback(() => {
        if (!tournamentId) return;
        setLoading(true);
        try {
            const tournamentData = getTournament(tournamentId);
            setTournament(tournamentData || null);
            const matchesData = getMatches(tournamentId);
            setAllMatches(matchesData);
            const playersData = getPlayers(tournamentId);
            setPlayers(playersData);

            if (tournamentData?.divisions && tournamentData.divisions.length > 0 && selectedDivisionId === 'all') {
                setSelectedDivisionId(tournamentData.divisions[0].id);
            }

            if (matchesData.length > 0) {
                const latestRound = Math.max(...matchesData.map(m => m.round));
                if (!selectedRound) {
                    setSelectedRound(latestRound);
                }
            } else if (tournamentData) {
                if (!selectedRound) {
                    setSelectedRound(1);
                }
            }

        } catch (error) {
            console.error("Failed to fetch pairings data:", error);
        } finally {
            setLoading(false);
        }
    }, [tournamentId, selectedRound, selectedDivisionId]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useRealtimeUpdates(fetchData);

    const roundsAvailable = useMemo(() => {
        if (!tournament) return [];
        const pairedRounds = [...new Set(allMatches.map(m => m.round))].sort((a,b) => Number(a) - Number(b));
        if (pairedRounds.length > 0) return pairedRounds;
        // If no rounds paired, show all potential rounds
        return Array.from({length: tournament.totalRounds}, (_, i) => i + 1);
    }, [allMatches, tournament]);
    
    const matchesForSelectedRoundAndDivision = useMemo(() => {
        let matches = allMatches.filter(m => m.round === selectedRound);
        if (selectedDivisionId !== 'all') {
            const playerIdsInDivision = new Set(players.filter(p => p.divisionId === selectedDivisionId).map(p => p.id));
            matches = matches.filter(m => playerIdsInDivision.has(m.playerA.id));
        }
        return matches.sort((a,b) => a.id - b.id);
    }, [allMatches, selectedRound, selectedDivisionId, players]);

    if (loading) {
        return <div className="p-8 text-center text-gray-400">Loading pairings...</div>;
    }
    
    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
             <h1 className="text-3xl md:text-4xl font-bold text-white">Pairings & Results</h1>
             <p className="text-gray-400 mt-1 mb-6">{tournament?.name}</p>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <label htmlFor="roundSelector" className="block text-sm font-bold text-gray-300 mb-2">Select Round</label>
                    <select 
                        id="roundSelector"
                        value={selectedRound || ''} 
                        onChange={e => setSelectedRound(Number(e.target.value))}
                        className="w-full bg-slate-700 text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500"
                    >
                        {roundsAvailable.map(r => <option key={r} value={r}>Round {r}</option>)}
                    </select>
                </div>
                {tournament && tournament.divisions.length > 1 && (
                     <div className="flex-1">
                        <label htmlFor="divisionSelector" className="block text-sm font-bold text-gray-300 mb-2">Select Division</label>
                        <select 
                            id="divisionSelector"
                            value={selectedDivisionId} 
                            onChange={e => setSelectedDivisionId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="w-full bg-slate-700 text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500"
                        >
                            {tournament.divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                )}
            </div>
            <div className="space-y-4">
                {matchesForSelectedRoundAndDivision.length > 0 ? (
                    matchesForSelectedRoundAndDivision.map(match => (
                        <div key={match.id} className="bg-slate-800 rounded-lg shadow-md p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="w-full sm:w-2/5 flex items-center justify-between sm:justify-start">
                                <Link to={`/public/tournament/${tournamentId}/player/${match.playerA.id}`} className="font-semibold text-white truncate hover:text-cool-blue-400 hover:underline">{match.playerA.name}</Link>
                                {match.status === 'completed' && match.scoreA !== null && match.scoreB !== null && match.playerB !== null && (
                                     <span className={`font-mono text-lg ml-4 px-3 py-1 rounded-md ${match.scoreA > match.scoreB ? 'bg-green-500/20 text-green-300' : 'bg-slate-700'}`}>{match.scoreA}</span>
                                )}
                            </div>

                            <div className="text-center text-gray-400 font-mono text-sm">
                                {match.playerB ? 'vs' : 'BYE'}
                            </div>

                            <div className="w-full sm:w-2/5 flex items-center justify-between sm:justify-end">
                               {match.playerB ? (
                                   <>
                                    {match.status === 'completed' && match.scoreA !== null && match.scoreB !== null && match.playerB !== null && (
                                        <span className={`font-mono text-lg mr-4 px-3 py-1 rounded-md ${match.scoreB > match.scoreA ? 'bg-green-500/20 text-green-300' : 'bg-slate-700'}`}>{match.scoreB}</span>
                                    )}
                                     <Link to={`/public/tournament/${tournamentId}/player/${match.playerB.id}`} className="font-semibold text-white truncate text-right sm:text-left hover:text-cool-blue-400 hover:underline">{match.playerB.name}</Link>
                                   </>
                               ) : (
                                   <span className="font-semibold text-green-400">Automatic Win</span>
                               )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-slate-800 rounded-lg p-6 text-center text-gray-400">
                        <p>Pairings for Round {selectedRound} will be available here once they are generated.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicPairingsPage;