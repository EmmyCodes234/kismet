import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import * as api from '../services/apiService';
import { Player, Tournament, Class, Team } from '../types';
import PublicTournamentHeader from '../components/PublicTournamentHeader';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import SkeletonLoader from '../components/SkeletonLoader';

const PlayersSkeleton: React.FC = () => (
    <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
                <SkeletonLoader className="h-8 w-48 mb-1" />
                <SkeletonLoader className="h-4 w-32" />
            </div>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-6">
            <SkeletonLoader className="h-10 w-64" />
            <SkeletonLoader className="h-10 w-32" />
        </div>
        
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-900/50 text-xs text-gray-300 uppercase tracking-wider">
                        <tr>
                            <th className="p-3 text-left"><SkeletonLoader className="h-4 w-16" /></th>
                            <th className="p-3 text-left"><SkeletonLoader className="h-4 w-16" /></th>
                            <th className="p-3 text-left"><SkeletonLoader className="h-4 w-16" /></th>
                            <th className="p-3 text-left"><SkeletonLoader className="h-4 w-16" /></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <tr key={i} className="hover:bg-slate-700/30">
                                <td className="p-3"><SkeletonLoader className="h-5 w-32" /></td>
                                <td className="p-3"><SkeletonLoader className="h-5 w-16" /></td>
                                <td className="p-3"><SkeletonLoader className="h-5 w-24" /></td>
                                <td className="p-3"><SkeletonLoader className="h-5 w-16" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const PlayersPage: React.FC<{isPublic?: boolean}> = ({ isPublic = false }) => {
    const { tournamentId: idFromParams, slug } = useParams<{ tournamentId: string, slug: string }>();
    const context = useOutletContext<{ tournament: Tournament | null }>();
    
    const tournament = context?.tournament;
    const tournamentId = isPublic ? tournament?.id : idFromParams;

    const [players, setPlayers] = useState<Player[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'rating' | 'seed'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const fetchPlayersAndTournament = useCallback(async () => {
        if (!tournamentId || !tournament) return;
        try {
            const [playersData, teamsData] = await Promise.all([
                api.getPlayers(tournamentId),
                tournament.tournamentMode === 'team' ? api.getTeams(tournamentId) : Promise.resolve([]),
            ]);
            
            setPlayers(playersData);
            setTeams(teamsData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    }, [tournamentId, tournament]);

    useEffect(() => {
        setLoading(true);
        fetchPlayersAndTournament();
    }, [fetchPlayersAndTournament]);
    
    useRealtimeUpdates(fetchPlayersAndTournament);

    const getClassName = (clsId: number | null, classes: Class[]): string => {
        const cls = classes.find(c => c.id === clsId);
        return cls ? cls.name : 'N/A';
    };
    
    const getTeamName = (teamId: number | null): string | undefined => {
        if (!teamId) return undefined;
        return teams.find(t => t.id === teamId)?.name;
    };

    // Filter and sort players
    const filteredAndSortedPlayers = useMemo(() => {
        let result = [...players];
        
        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(player => 
                player.name.toLowerCase().includes(term) ||
                (player.teamId && getTeamName(player.teamId)?.toLowerCase().includes(term))
            );
        }
        
        // Apply sorting
        result.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'rating':
                    comparison = a.rating - b.rating;
                    break;
                case 'seed':
                    comparison = a.seed - b.seed;
                    break;
            }
            
            return sortOrder === 'asc' ? comparison : -comparison;
        });
        
        return result;
    }, [players, searchTerm, sortBy, sortOrder, teams]);

    const handleSort = (column: 'name' | 'rating' | 'seed') => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const getSortIndicator = (column: 'name' | 'rating' | 'seed') => {
        if (sortBy === column) {
            return sortOrder === 'asc' ? '↑' : '↓';
        }
        return '';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900">
                {tournament && <PublicTournamentHeader tournament={tournament} />}
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <PlayersSkeleton />
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
                        <h1 className="text-2xl md:text-3xl font-bold text-white">Player Roster</h1>
                        <p className="text-gray-400 mt-1">{tournament?.name}</p>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Search Players</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by player name or team..."
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
                    
                    <div className="md:w-48">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Players Found</label>
                        <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-white">
                            {filteredAndSortedPlayers.length} / {players.length}
                        </div>
                    </div>
                </div>

                {/* Players Table */}
                <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-900/50 text-xs text-gray-300 uppercase tracking-wider sticky top-0">
                                <tr>
                                    <th 
                                        className="p-3 text-left cursor-pointer hover:bg-slate-700/50"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center">
                                            <span>Player</span>
                                            <span className="ml-1">{getSortIndicator('name')}</span>
                                        </div>
                                    </th>
                                    <th 
                                        className="p-3 text-left cursor-pointer hover:bg-slate-700/50"
                                        onClick={() => handleSort('rating')}
                                    >
                                        <div className="flex items-center">
                                            <span>Rating</span>
                                            <span className="ml-1">{getSortIndicator('rating')}</span>
                                        </div>
                                    </th>
                                    <th 
                                        className="p-3 text-left cursor-pointer hover:bg-slate-700/50"
                                        onClick={() => handleSort('seed')}
                                    >
                                        <div className="flex items-center">
                                            <span>Seed</span>
                                            <span className="ml-1">{getSortIndicator('seed')}</span>
                                        </div>
                                    </th>
                                    <th className="p-3 text-left">Division</th>
                                    {tournament?.divisionMode === 'single' && tournament.classes.length > 0 && (
                                        <th className="p-3 text-left">Class</th>
                                    )}
                                    <th className="p-3 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {filteredAndSortedPlayers.map((player) => {
                                    const division = tournament?.divisions.find(d => d.id === player.divisionId);
                                    const teamName = getTeamName(player.teamId);
                                    
                                    return (
                                        <tr key={player.id} className={`hover:bg-slate-700/30 ${player.status !== 'active' ? 'opacity-70' : ''}`}>
                                            <td className="p-3 font-medium">
                                                <Link 
                                                    to={isPublic && slug 
                                                        ? `/public/t/${slug}/player/${player.id}` 
                                                        : `/tournament/${tournamentId}/player/${player.id}`}
                                                    className="hover:text-cool-blue-400 hover:underline"
                                                >
                                                    {player.name}
                                                </Link>
                                                {tournament?.teamSettings.displayTeamNames && teamName && (
                                                    <span className="text-gray-400 text-xs ml-2">({teamName})</span>
                                                )}
                                            </td>
                                            <td className="p-3">{player.rating}</td>
                                            <td className="p-3">#{player.seed}</td>
                                            <td className="p-3">{division?.name || 'N/A'}</td>
                                            {tournament?.divisionMode === 'single' && tournament.classes.length > 0 && (
                                                <td className="p-3">{getClassName(player.classId, tournament.classes)}</td>
                                            )}
                                            <td className="p-3">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${
                                                    player.status === 'active' 
                                                        ? 'bg-green-900/30 text-green-400' 
                                                        : 'bg-slate-700 text-gray-400'
                                                }`}>
                                                    {player.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        
                        {filteredAndSortedPlayers.length === 0 && (
                            <div className="p-8 text-center text-gray-400">
                                {searchTerm 
                                    ? `No players found matching "${searchTerm}"` 
                                    : 'No players have been added to this tournament yet.'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayersPage;