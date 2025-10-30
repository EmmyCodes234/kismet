import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import * as api from '../services/apiService';
import { Standing, Tournament, LastGameInfo, TeamStanding } from '../types';
import ClinchIndicator from '../components/ClinchIndicator';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import PublicTournamentHeader from '../components/PublicTournamentHeader';
import SkeletonLoader from '../components/SkeletonLoader';

const formatLastGame = (lastGame: LastGameInfo | null): string => {
    if (!lastGame) return '-';
    if (lastGame.result === 'B') return 'BYE';
    if (lastGame.result === 'F') return 'FORFEIT';
    return `${lastGame.round}${lastGame.result}:${lastGame.playerScore}-${lastGame.opponentScore}:#${lastGame.opponentSeed}`;
};

interface StandingsTableProps {
    standings: Standing[];
    tournament: Tournament;
    isPublic: boolean;
    slug?: string;
    tournamentId?: string;
}

const StandingsTable: React.FC<StandingsTableProps> = ({ standings, tournament, isPublic, slug, tournamentId }) => {
    const [sortConfig, setSortConfig] = useState<{ key: keyof Standing; direction: 'asc' | 'desc' }>({
        key: 'rank',
        direction: 'asc'
    });

    const sortedStandings = useMemo(() => {
        const sortableItems = [...standings];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [standings, sortConfig]);

    const requestSort = (key: keyof Standing) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof Standing) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'asc' ? '↑' : '↓';
        }
        return '';
    };

    return (
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
            <div className="overflow-x-auto">
                <table className="w-full text-sm md:text-base">
                    <thead className="bg-slate-900/50 text-xs md:text-sm text-gray-300 uppercase tracking-wider sticky top-0">
                        <tr>
                            <th 
                                className="p-3 md:p-4 text-left cursor-pointer hover:bg-slate-700/50"
                                onClick={() => requestSort('rank')}
                            >
                                <div className="flex items-center">
                                    <span>Rank</span>
                                    <span className="ml-1">{getSortIndicator('rank')}</span>
                                </div>
                            </th>
                            <th className="p-3 md:p-4 text-left">Player</th>
                            <th 
                                className="p-3 md:p-4 text-center cursor-pointer hover:bg-slate-700/50"
                                onClick={() => requestSort('wins')}
                            >
                                <div className="flex items-center justify-center">
                                    <span>W-L</span>
                                    <span className="ml-1">{getSortIndicator('wins')}</span>
                                </div>
                            </th>
                            <th 
                                className="p-3 md:p-4 text-right cursor-pointer hover:bg-slate-700/50"
                                onClick={() => requestSort('cumulativeSpread')}
                            >
                                <div className="flex items-center justify-end">
                                    <span>Spread</span>
                                    <span className="ml-1">{getSortIndicator('cumulativeSpread')}</span>
                                </div>
                            </th>
                            <th className="p-3 md:p-4 text-left">Last Game</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {sortedStandings.map((s) => (
                            <tr key={s.player.id} className="hover:bg-slate-700/30">
                                <td className="p-3 md:p-4 font-bold text-base md:text-xl text-cool-blue-400 whitespace-nowrap">{s.rank}</td>
                                <td className="p-3 md:p-4 font-medium whitespace-nowrap">
                                    <div className="flex items-center">
                                        <Link 
                                            to={isPublic && slug 
                                                ? `/public/t/${slug}/player/${s.player.id}`
                                                : `/tournament/${tournamentId}/player/${s.player.id}`} 
                                            className="hover:text-cool-blue-400 hover:underline"
                                        >
                                            {s.player.name}
                                        </Link>
                                        <span className="text-gray-400 ml-2 text-xs">(#{s.player.seed})</span>
                                        {s.clinchStatus === 'clinched' && <ClinchIndicator />}
                                    </div>
                                </td>
                                <td className="p-3 md:p-4 text-center font-mono whitespace-nowrap">
                                    <span className="px-2 py-1 bg-slate-700 rounded">{s.wins}-{s.losses}</span>
                                </td>
                                <td className="p-3 md:p-4 text-right font-mono whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded ${s.cumulativeSpread > 0 ? 'bg-green-900/30 text-green-400' : s.cumulativeSpread < 0 ? 'bg-red-900/30 text-red-400' : 'bg-slate-700'}`}>
                                        {s.cumulativeSpread > 0 ? `+${s.cumulativeSpread}` : s.cumulativeSpread}
                                    </span>
                                </td>
                                <td className="p-3 md:p-4 font-mono text-sm whitespace-nowrap">
                                    <span className="px-2 py-1 bg-slate-700 rounded">
                                        {formatLastGame(s.lastGame)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {sortedStandings.length === 0 && (
                    <div className="p-8 text-center text-gray-400">
                        Standings will be available once the first round is completed.
                    </div>
                )}
            </div>
        </div>
    );
};

const StandingsSkeleton: React.FC = () => (
    <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
        <div className="overflow-x-auto">
            <table className="w-full text-sm md:text-base">
                <thead className="bg-slate-900/50 text-xs md:text-sm text-gray-300 uppercase tracking-wider">
                    <tr>
                        <th className="p-3 md:p-4 text-left"><SkeletonLoader className="h-5 w-16" /></th>
                        <th className="p-3 md:p-4 text-left"><SkeletonLoader className="h-5 w-32" /></th>
                        <th className="p-3 md:p-4 text-center"><SkeletonLoader className="h-5 w-16" /></th>
                        <th className="p-3 md:p-4 text-right"><SkeletonLoader className="h-5 w-16" /></th>
                        <th className="p-3 md:p-4 text-left"><SkeletonLoader className="h-5 w-24" /></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="hover:bg-slate-700/30">
                            <td className="p-3 md:p-4"><SkeletonLoader className="h-6 w-8" /></td>
                            <td className="p-3 md:p-4"><SkeletonLoader className="h-6 w-40" /></td>
                            <td className="p-3 md:p-4"><SkeletonLoader className="h-6 w-16 mx-auto" /></td>
                            <td className="p-3 md:p-4"><SkeletonLoader className="h-6 w-16 ml-auto" /></td>
                            <td className="p-3 md:p-4"><SkeletonLoader className="h-6 w-24" /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const StandingsPage: React.FC<{isPublic?: boolean}> = ({ isPublic = false }) => {
    const { tournamentId: idFromParams, slug } = useParams<{ tournamentId: string; slug: string }>();
    const context = useOutletContext<{ tournament: Tournament | null }>();
    
    const [allIndividualStandings, setAllIndividualStandings] = useState<Standing[]>([]);
    const [allTeamStandings, setAllTeamStandings] = useState<TeamStanding[]>([]);
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'individual' | 'team'>('individual');
    const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);
    const [viewDensity, setViewDensity] = useState<'compact' | 'normal' | 'comfortable'>('normal');

    const tournamentId = isPublic ? context?.tournament?.id : idFromParams;

    const fetchData = useCallback(async () => {
        if (!tournamentId) return;
        try {
            let tournamentData: Tournament | null;
            if (isPublic) {
                tournamentData = context?.tournament ?? null;
            } else {
                tournamentData = await api.getTournament(tournamentId);
            }
            setTournament(tournamentData);

            if (tournamentData) {
                const standingsData = await api.getStandings(tournamentId);
                setAllIndividualStandings(standingsData);
                if (tournamentData.tournamentMode === 'team') {
                    setActiveTab(prev => prev); // keep current tab
                    setAllTeamStandings(await api.getTeamStandings(tournamentId));
                } else {
                    setActiveTab('individual');
                }
                if (tournamentData.divisions && tournamentData.divisions.length > 0 && !selectedDivisionId) {
                    setSelectedDivisionId(tournamentData.divisions[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch standings", error);
        } finally {
            setLoading(false);
        }
    }, [tournamentId, selectedDivisionId, isPublic, context?.tournament]);

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [fetchData]);

    useRealtimeUpdates(fetchData);

    const filteredIndividualStandings = useMemo(() => {
        if (!selectedDivisionId || tournament?.divisionMode === 'single') return allIndividualStandings;
        return allIndividualStandings.filter(s => s.player.divisionId === selectedDivisionId);
    }, [allIndividualStandings, selectedDivisionId, tournament]);

    // Apply view density classes
    const rowClass = useMemo(() => {
        switch (viewDensity) {
            case 'compact': return 'py-1';
            case 'comfortable': return 'py-4';
            default: return 'py-2';
        }
    }, [viewDensity]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900">
                {tournament && <PublicTournamentHeader tournament={tournament} />}
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white">Live Standings</h1>
                            <p className="text-gray-400 mt-1">{tournament?.name}</p>
                        </div>
                        <div className="flex gap-2 mt-4 sm:mt-0">
                            <button 
                                onClick={() => setViewDensity('compact')}
                                className={`px-3 py-1 text-xs rounded ${viewDensity === 'compact' ? 'bg-cool-blue-600 text-white' : 'bg-slate-700 text-gray-300'}`}
                            >
                                Compact
                            </button>
                            <button 
                                onClick={() => setViewDensity('normal')}
                                className={`px-3 py-1 text-xs rounded ${viewDensity === 'normal' ? 'bg-cool-blue-600 text-white' : 'bg-slate-700 text-gray-300'}`}
                            >
                                Normal
                            </button>
                            <button 
                                onClick={() => setViewDensity('comfortable')}
                                className={`px-3 py-1 text-xs rounded ${viewDensity === 'comfortable' ? 'bg-cool-blue-600 text-white' : 'bg-slate-700 text-gray-300'}`}
                            >
                                Comfortable
                            </button>
                        </div>
                    </div>
                    <StandingsSkeleton />
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
                        <h1 className="text-2xl md:text-3xl font-bold text-white">Live Standings</h1>
                        <p className="text-gray-400 mt-1">{tournament?.name}</p>
                    </div>
                    <div className="flex gap-2 mt-4 sm:mt-0">
                        <button 
                            onClick={() => setViewDensity('compact')}
                            className={`px-3 py-1 text-xs rounded ${viewDensity === 'compact' ? 'bg-cool-blue-600 text-white' : 'bg-slate-700 text-gray-300'}`}
                        >
                            Compact
                        </button>
                        <button 
                            onClick={() => setViewDensity('normal')}
                            className={`px-3 py-1 text-xs rounded ${viewDensity === 'normal' ? 'bg-cool-blue-600 text-white' : 'bg-slate-700 text-gray-300'}`}
                        >
                            Normal
                        </button>
                        <button 
                            onClick={() => setViewDensity('comfortable')}
                            className={`px-3 py-1 text-xs rounded ${viewDensity === 'comfortable' ? 'bg-cool-blue-600 text-white' : 'bg-slate-700 text-gray-300'}`}
                        >
                            Comfortable
                        </button>
                        <button 
                            onClick={() => window.print()} 
                            className="px-3 py-1 text-xs font-medium rounded bg-slate-700 hover:bg-slate-600 text-white transition no-print"
                        >
                            Print
                        </button>
                    </div>
                </div>

                {tournament?.tournamentMode === 'team' && (
                    <div className="flex border-b border-slate-700 mb-6 no-print">
                        <button 
                            onClick={() => setActiveTab('individual')} 
                            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'individual' ? 'border-b-2 border-cool-blue-400 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Individual
                        </button>
                        <button 
                            onClick={() => setActiveTab('team')} 
                            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'team' ? 'border-b-2 border-cool-blue-400 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Team
                        </button>
                    </div>
                )}

                {activeTab === 'individual' && tournament && tournament.divisions.length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-6 no-print">
                        {tournament.divisions.map(div => (
                            <button 
                                key={div.id}
                                onClick={() => setSelectedDivisionId(div.id)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${selectedDivisionId === div.id ? 'bg-cool-blue-600 text-white' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}`}
                            >
                                {div.name}
                            </button>
                        ))}
                    </div>
                )}

                {activeTab === 'individual' ? (
                    <StandingsTable 
                        standings={filteredIndividualStandings} 
                        tournament={tournament!} 
                        isPublic={isPublic} 
                        slug={slug} 
                        tournamentId={tournamentId} 
                    />
                ) : ( // Team Standings
                    <div className="space-y-4">
                        {allTeamStandings.map(ts => (
                            <div key={ts.team.id} className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700 transition-all duration-300">
                                <div 
                                    className="flex items-center p-4 cursor-pointer hover:bg-slate-700/50"
                                    onClick={() => setExpandedTeamId(prev => prev === ts.team.id ? null : ts.team.id)}
                                >
                                    <div className="w-12 font-bold text-xl text-cool-blue-400 text-center">{ts.rank}</div>
                                    <div className="flex-grow font-semibold text-lg text-white">{ts.team.name}</div>
                                    <div className="w-20 text-right font-mono font-bold text-xl text-white">{ts.totalScore}</div>
                                    <div className="w-8 text-right">
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-400 transform transition-transform ${expandedTeamId === ts.team.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                                {expandedTeamId === ts.team.id && (
                                    <div className="bg-slate-900/30 px-4 pb-4 border-t border-slate-700">
                                        <table className="w-full text-sm mt-2">
                                            <thead className="text-gray-400">
                                                <tr>
                                                    <th className="p-2 text-left">Player</th>
                                                    <th className="p-2 text-center">Record</th>
                                                    <th className="p-2 text-right">Spread</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700">
                                                {ts.contributingPlayers.map(p => (
                                                    <tr key={p.player.id}>
                                                        <td className="p-2">{p.player.name}</td>
                                                        <td className="p-2 text-center font-mono">{p.wins}-{p.losses}</td>
                                                        <td className="p-2 text-right font-mono">{p.cumulativeSpread > 0 ? `+${p.cumulativeSpread}` : p.cumulativeSpread}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                        {allTeamStandings.length === 0 && (
                            <div className="p-8 text-center text-gray-400 bg-slate-800 rounded-xl border border-slate-700">
                                Team standings will be available once results are entered.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StandingsPage;