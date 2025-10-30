import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import * as api from '../services/apiService';
import { Player, Tournament, Class, Team } from '../types';
import PlayerEditModal from '../components/PlayerEditModal';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import SkeletonLoader from '../components/SkeletonLoader';
import { TDPanelContextType } from '../layouts/TDPanelLayout';

const PlayersSkeleton: React.FC = () => (
  <div>
    <SkeletonLoader className="h-10 w-64 mb-1" />
    <SkeletonLoader className="h-5 w-80 mb-6" />
    <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-slate-900/50 text-sm text-gray-300 uppercase tracking-wider">
            <tr>
              <th className="p-4"><SkeletonLoader className="h-5" /></th>
              <th className="p-4"><SkeletonLoader className="h-5" /></th>
              <th className="p-4"><SkeletonLoader className="h-5" /></th>
              <th className="p-4"><SkeletonLoader className="h-5" /></th>
              <th className="p-4"><SkeletonLoader className="h-5" /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-700 last:border-b-0">
                <td className="p-4"><SkeletonLoader className="h-6" /></td>
                <td className="p-4"><SkeletonLoader className="h-6" /></td>
                <td className="p-4"><SkeletonLoader className="h-6" /></td>
                <td className="p-4"><SkeletonLoader className="h-6" /></td>
                <td className="p-4"><SkeletonLoader className="h-6" /></td>
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
  const context = useOutletContext<TDPanelContextType | { tournament: Tournament | null }>();
  
  const tournament = context?.tournament;
  const isUserHeadTd = 'isHeadTd' in context ? context.isHeadTd : false;
  const tournamentId = isPublic ? tournament?.id : idFromParams;

  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleDelete = async (playerId: number) => {
      if(tournamentId && window.confirm("Are you sure you want to delete this player? This cannot be undone.")) {
          await api.deletePlayer(playerId);
          fetchPlayersAndTournament();
      }
  }

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  }

  const handleSave = async (playerToSave: Player) => {
    if (tournamentId) {
      await api.updatePlayer(playerToSave);
      fetchPlayersAndTournament();
      setIsModalOpen(false);
      setEditingPlayer(null);
    }
  }

  const handleWithdraw = async (playerId: number) => {
    if (tournamentId && window.confirm("Are you sure you want to withdraw this player? They will be excluded from future pairings.")) {
        await api.withdrawPlayer(playerId);
        fetchPlayersAndTournament();
    }
  }

  const handleReinstate = async (playerId: number) => {
    if (tournamentId) {
        await api.reinstatePlayer(playerId);
        fetchPlayersAndTournament();
    }
  }


  const isEditingDisabled = tournament?.status !== 'Not Started';
  const getClassName = (clsId: number | null, classes: Class[]): string => {
      const cls = classes.find(c => c.id === clsId);
      return cls ? cls.name : 'N/A';
  }
  
  const getTeamName = (teamId: number | null): string | undefined => {
      if (!teamId) return undefined;
      return teams.find(t => t.id === teamId)?.name;
  }

  if (loading) {
    return <PlayersSkeleton />;
  }

  return (
    <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white">Player Roster</h1>
        <p className="text-gray-400 mt-1 mb-6">{tournament?.name}</p>
        
        {!isPublic && isEditingDisabled && (
            <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg mb-6" role="alert">
                <strong className="font-bold">Roster Locked: </strong>
                <span className="block sm:inline">Deleting players is disabled once a tournament has started. Use 'Withdraw' to remove them from pairings.</span>
            </div>
        )}

      <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] responsive-table">
            <thead className="bg-slate-900/50 text-sm text-gray-300 uppercase tracking-wider">
              <tr>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">Rating</th>
                <th className="p-4 text-left">Division</th>
                {tournament?.divisionMode === 'single' && tournament.classes.length > 0 && <th className="p-4 text-left">Class</th>}
                <th className="p-4 text-left">Status</th>
                {!isPublic && <th className="p-4 text-left">Actions</th>}
              </tr>
            </thead>
            <tbody className="text-gray-200">
              {players.map((player) => {
                const division = tournament?.divisions.find(d => d.id === player.divisionId);
                const teamName = getTeamName(player.teamId);
                return (
                    <tr key={player.id} className={`border-b border-slate-700 last:border-b-0 hover:bg-slate-700/50 ${player.status !== 'active' ? 'opacity-50' : ''}`}>
                        <td data-label="Name" className="p-4 font-medium">
                           <Link 
                                to={isPublic && slug 
                                    ? `/public/t/${slug}/player/${player.id}` 
                                    : `/tournament/${tournamentId}/player/${player.id}`}
                                className="hover:text-cool-blue-400 hover:underline"
                            >
                                {player.name} {tournament?.teamSettings.displayTeamNames && teamName ? `(${teamName})` : ''}
                            </Link>
                        </td>
                        <td data-label="Rating" className="p-4">{player.rating}</td>
                        <td data-label="Division" className="p-4">{division?.name || 'N/A'}</td>
                         {tournament?.divisionMode === 'single' && tournament.classes.length > 0 && <td data-label="Class" className="p-4">{getClassName(player.classId, tournament.classes)}</td>}
                        <td data-label="Status" className="p-4">
                            <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${player.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-slate-600/50 text-slate-300'}`}>
                                {player.status}
                            </span>
                        </td>
                        {!isPublic && (
                            <td data-label="Actions" className="p-4">
                                <div className="flex flex-wrap gap-2">
                                  {isUserHeadTd && <button onClick={() => handleEdit(player)} className="px-3 py-1 text-sm bg-slate-600 hover:bg-slate-500 rounded">Edit</button>}
                                  {tournament?.status !== 'Not Started' && player.status === 'active' &&
                                    <button onClick={() => handleWithdraw(player.id)} className="px-3 py-1 text-sm bg-yellow-800 hover:bg-yellow-700 rounded">Withdraw</button>
                                  }
                                  {tournament?.status !== 'Not Started' && player.status === 'withdrawn' &&
                                    <button onClick={() => handleReinstate(player.id)} className="px-3 py-1 text-sm bg-green-800 hover:bg-green-700 rounded">Reinstate</button>
                                  }
                                  {isUserHeadTd && <button onClick={() => handleDelete(player.id)} disabled={isEditingDisabled} className="px-3 py-1 text-sm bg-red-800 hover:bg-red-700 rounded disabled:bg-slate-700 disabled:cursor-not-allowed">Delete</button>}
                                </div>
                            </td>
                        )}
                    </tr>
                )
              })}
            </tbody>
          </table>
          {players.length === 0 && <p className="p-4 text-center text-gray-400">No players have been added to this tournament yet.</p>}
        </div>
      </div>
      {!isPublic && tournament && (
        <PlayerEditModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSave}
            player={editingPlayer}
            tournament={tournament}
        />
      )}
    </div>
  );
};

export default PlayersPage;
