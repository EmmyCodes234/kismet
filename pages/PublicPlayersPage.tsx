import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPlayers, getTournament, getStandings } from '../services/localStorageService';
import { Player, Tournament, Standing } from '../types';
import ClinchIndicator from '../components/ClinchIndicator';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';

const PublicPlayersPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    if (!tournamentId) return;
    setLoading(true);
    try {
      setPlayers(getPlayers(tournamentId));
      setTournament(getTournament(tournamentId));
      setStandings(getStandings(tournamentId));
    } catch (error) {
      console.error("Failed to fetch public player data:", error);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeUpdates(fetchData);

  const standingsMap = useMemo(() => {
    const map = new Map<number, Standing>();
    standings.forEach(s => map.set(s.player.id, s));
    return map;
  }, [standings]);

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading player roster...</div>;
  }
  
  const sortedPlayers = [...players].sort((a, b) => a.seed - b.seed);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold text-white">Player Roster & Standings</h1>
      <p className="text-gray-400 mt-1 mb-8">{tournament?.name}</p>

      <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] responsive-table">
            <thead className="bg-slate-900/50 text-sm text-gray-300 uppercase tracking-wider">
              <tr>
                <th className="p-4 text-left">Seed</th>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">Rating</th>
                <th className="p-4 text-left">Division</th>
                <th className="p-4 text-center">Rank</th>
                <th className="p-4 text-center">Record</th>
                <th className="p-4 text-right">Spread</th>
              </tr>
            </thead>
            <tbody className="text-gray-200">
              {sortedPlayers.map((player) => {
                const division = tournament?.divisions.find(d => d.id === player.divisionId);
                const standing = standingsMap.get(player.id);
                return (
                    <tr key={player.id} className={`border-b border-slate-700 last:border-b-0 hover:bg-slate-700/50 ${player.status !== 'active' ? 'opacity-50' : ''}`}>
                        <td data-label="Seed" className="p-4">{player.seed}</td>
                        <td data-label="Name" className="p-4 font-medium">
                            <Link to={`/public/tournament/${tournamentId}/player/${player.id}`} className="hover:text-cool-blue-400 hover:underline">
                                {player.name}
                            </Link>
                        </td>
                        <td data-label="Rating" className="p-4">{player.rating}</td>
                        <td data-label="Division" className="p-4">{division?.name || 'N/A'}</td>
                        <td data-label="Rank" className="p-4 text-center">
                            {standing ? (
                                <div className="flex items-center justify-center">
                                    <span>{standing.rank}</span>
                                    {standing.clinchStatus === 'clinched' && <ClinchIndicator />}
                                </div>
                            ) : '-'}
                        </td>
                        <td data-label="Record" className="p-4 text-center font-mono">{standing ? `${standing.wins}-${standing.losses}` : '-'}</td>
                        <td data-label="Spread" className="p-4 text-right font-mono">
                            {standing ? (standing.cumulativeSpread > 0 ? `+${standing.cumulativeSpread}` : standing.cumulativeSpread) : '-'}
                        </td>
                    </tr>
                );
              })}
            </tbody>
          </table>
          {sortedPlayers.length === 0 && <p className="p-4 text-center text-gray-400">No players have been added to this tournament yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default PublicPlayersPage;