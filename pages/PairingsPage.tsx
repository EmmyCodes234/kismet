import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import * as api from '../services/apiService';
import { Tournament, Match, Player, Team } from '../types';
import PublicTournamentHeader from '../components/PublicTournamentHeader';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import SkeletonLoader from '../components/SkeletonLoader';

const PairingsSkeleton: React.FC = () => (
    <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
                <SkeletonLoader className="h-8 w-48 mb-1" />
                <SkeletonLoader className="h-4 w-32" />
            </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-6">
            <SkeletonLoader className="h-10 w-24" />
            <SkeletonLoader className="h-10 w-24" />
            <SkeletonLoader className="h-10 w-24" />
        </div>
        
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-900/50 text-xs text-gray-300 uppercase tracking-wider">
                        <tr>
                            <th className="p-3 w-16 text-center"><SkeletonLoader className="h-4 w-8 mx-auto" /></th>
                            <th className="p-3"><SkeletonLoader className="h-4 w-24" /></th>
                            <th className="p-3 w-12 text-center"><SkeletonLoader className="h-4 w-4 mx-auto" /></th>
                            <th className="p-3"><SkeletonLoader className="h-4 w-24" /></th>
                            <th className="p-3 w-24 text-center"><SkeletonLoader className="h-4 w-16 mx-auto" /></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <tr key={i} className="hover:bg-slate-700/30">
                                <td className="p-3 text-center"><SkeletonLoader className="h-5 w-6 mx-auto" /></td>
                                <td className="p-3"><SkeletonLoader className="h-5 w-32" /></td>
                                <td className="p-3 text-center"><SkeletonLoader className="h-5 w-5 mx-auto" /></td>
                                <td className="p-3"><SkeletonLoader className="h-5 w-32" /></td>
                                <td className="p-3 text-center"><SkeletonLoader className="h-6 w-16 mx-auto" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const PairingsPage: React.FC<{isPublic?: boolean}> = ({ isPublic = false }) => {
    const { tournamentId: idFromParams, slug } = useParams<{ tournamentId: string; slug: string }>();
    const context = useOutletContext<{ tournament: Tournament | null }>();
    
    const tournamentId = isPublic ? context?.tournament?.id : idFromParams;

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [allMatches, setAllMatches] = useState<Match[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRound, setSelectedRound] = useState<number | null>(null);
    const [selectedDivisionId, setSelectedDivisionId] = useState<number | 'all'>('all');
    const [viewMode, setViewMode] = useState<'list' | 'team'>('list');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        if (!tournamentId) return;
        try {
            const tournamentData = isPublic ? context?.tournament : await api.getTournament(tournamentId);
            setTournament(tournamentData || null);

            if (tournamentData) {
                const [matchesData, playersData, teamsData] = await Promise.all([
                    api.getMatches(tournamentId),
                    api.getPlayers(tournamentId),
                    tournamentData.tournamentMode === 'team' ? api.getTeams(tournamentId) : Promise.resolve([]),
                ]);

                setAllMatches(matchesData);
                setPlayers(playersData);
                setTeams(teamsData);

                if (selectedRound === null) {
                    const latestRound = matchesData.length > 0 ? Math.max(...matchesData.map(m => m.round)) : 1;
                    setSelectedRound(latestRound);
                }
                
                if (tournamentData.divisions && tournamentData.divisions.length > 0 && selectedDivisionId === 'all') {
                    setSelectedDivisionId(tournamentData.divisions[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch pairings data:", error);
        } finally {
            setLoading(false);
        }
    }, [tournamentId, selectedRound, selectedDivisionId, isPublic, context?.tournament]);

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [fetchData]);

    useRealtimeUpdates(fetchData);

    const roundsAvailable = useMemo(() => {
        if (!tournament) return [];
        return Array.from({length: tournament.totalRounds}, (_, i) => i + 1);
    }, [tournament]);
    
    const matchesForSelectedRoundAndDivision = useMemo(() => {
        let matches = allMatches.filter(m => m.round === selectedRound);
        if (selectedDivisionId !== 'all' && tournament?.divisionMode === 'multiple') {
            const playerIdsInDivision = new Set(players.filter(p => p.divisionId === selectedDivisionId).map(p => p.id));
            matches = matches.filter(m => playerIdsInDivision.has(m.playerA.id));
        }
        
        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            matches = matches.filter(match => 
                match.playerA.name.toLowerCase().includes(term) || 
                (match.playerB && match.playerB.name.toLowerCase().includes(term))
            );
        }
        
        return matches.sort((a,b) => a.id - b.id);
    }, [allMatches, selectedRound, selectedDivisionId, players, tournament, searchTerm]);

    const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t.name])), [teams]);
    const playerTeamMap = useMemo(() => new Map(players.map(p => [p.id, p.teamId])), [players]);

    const renderPlayerName = (player: Player) => (
        <span className="font-medium">
            {player.name}
            {tournament?.teamSettings.displayTeamNames && player.teamId && teamMap.get(player.teamId) && (
                <span className="text-gray-400 text-xs ml-2">({teamMap.get(player.teamId)})</span>
            )}
        </span>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900">
                {tournament && <PublicTournamentHeader tournament={tournament} />}
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <PairingsSkeleton />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            {tournament && <PublicTournamentHeader tournament={tournament} />}
            
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">Pairings & Results</h1>
                        <p className="text-gray-400 mt-1">{tournament?.name}</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Round</label>
                        <div className="flex flex-wrap gap-2">
                            {roundsAvailable.map(round => (
                                <button
                                    key={round}
                                    onClick={() => setSelectedRound(round)}
                                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                                        selectedRound === round 
                                            ? 'bg-cool-blue-600 text-white' 
                                            : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                                    }`}
                                >
                                    Round {round}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {tournament?.divisions && tournament.divisions.length > 1 && (
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Division</label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setSelectedDivisionId('all')}
                                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                                        selectedDivisionId === 'all' 
                                            ? 'bg-cool-blue-600 text-white' 
                                            : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                                    }`}
                                >
                                    All Divisions
                                </button>
                                {tournament.divisions.map(division => (
                                    <button
                                        key={division.id}
                                        onClick={() => setSelectedDivisionId(division.id)}
                                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                                            selectedDivisionId === division.id 
                                                ? 'bg-cool-blue-600 text-white' 
                                                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                                        }`}
                                    >
                                        {division.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Search */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Search Players</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by player name..."
                            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cool-blue-500"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Pairings Table */}
                <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-900/50 text-xs text-gray-300 uppercase tracking-wider sticky top-0">
                                <tr>
                                    <th className="p-3 w-16 text-center">Board</th>
                                    <th className="p-3 text-left">Player A</th>
                                    <th className="p-3 w-12 text-center"></th>
                                    <th className="p-3 text-left">Player B</th>
                                    <th className="p-3 w-24 text-center">Result</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {matchesForSelectedRoundAndDivision.map((match, index) => {
                                    const playerA = match.playerA;
                                    const playerB = match.playerB;
                                    const isCompleted = match.status === 'completed';

                                    return (
                                        <tr key={match.id} className="hover:bg-slate-700/30">
                                            <td className="p-3 text-center font-mono text-cool-blue-400">{index + 1}</td>
                                            <td className="p-3">
                                                {renderPlayerName(playerA)}
                                                {match.firstTurnPlayerId === playerA.id && (
                                                    <span className="ml-2 text-xs bg-amber-900/50 text-amber-300 px-2 py-1 rounded">First Turn</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center text-gray-400">vs</td>
                                            <td className="p-3">
                                                {playerB ? (
                                                    <>
                                                        {renderPlayerName(playerB)}
                                                        {match.firstTurnPlayerId === playerB.id && (
                                                            <span className="ml-2 text-xs bg-amber-900/50 text-amber-300 px-2 py-1 rounded">First Turn</span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-gray-500">BYE</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                {isCompleted ? (
                                                    <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-xs font-medium">
                                                        {match.scoreA} - {match.scoreB}
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-slate-700 text-gray-400 rounded-full text-xs font-medium">
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        
                        {matchesForSelectedRoundAndDivision.length === 0 && (
                            <div className="p-8 text-center text-gray-400">
                                {searchTerm 
                                    ? `No matches found for "${searchTerm}" in Round ${selectedRound}` 
                                    : `No pairings available for Round ${selectedRound}`}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PairingsPage;