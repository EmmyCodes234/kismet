import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import * as api from '../services/apiService';
import { Tournament, Match, Player, Team } from '../types';
import ScoreEditModal from '../components/ScoreEditModal';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import SkeletonLoader from '../components/SkeletonLoader';

const PairingsSkeleton: React.FC = () => (
    <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
                <SkeletonLoader className="h-10 w-64 mb-1" />
                <SkeletonLoader className="h-5 w-48" />
            </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
                <SkeletonLoader className="h-5 w-32 mb-2" />
                <SkeletonLoader className="h-12" />
            </div>
            <div className="flex-1">
                <SkeletonLoader className="h-5 w-32 mb-2" />
                <SkeletonLoader className="h-12" />
            </div>
        </div>
        <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-slate-800 rounded-lg shadow-md p-4 flex items-center justify-between gap-4">
                    <SkeletonLoader className="h-6 w-1/3" />
                    <SkeletonLoader className="h-4 w-6" />
                    <SkeletonLoader className="h-6 w-1/3" />
                </div>
            ))}
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
    const [editingMatch, setEditingMatch] = useState<Match | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditingPairings, setIsEditingPairings] = useState(false);
    const [draggedPlayer, setDraggedPlayer] = useState<{matchId: number, player: Player} | null>(null);
    const [isUserHeadTd, setIsUserHeadTd] = useState(false);

    const fetchData = useCallback(async () => {
        if (!tournamentId) return;
        try {
            const tournamentData = isPublic ? context?.tournament : await api.getTournament(tournamentId);
            setTournament(tournamentData || null);

            if (tournamentData) {
                const [matchesData, playersData, teamsData, userIsHead] = await Promise.all([
                    api.getMatches(tournamentId),
                    api.getPlayers(tournamentId),
                    tournamentData.tournamentMode === 'team' ? api.getTeams(tournamentId) : Promise.resolve([]),
                    isPublic ? Promise.resolve(false) : api.isHeadTd(tournamentId)
                ]);

                setAllMatches(matchesData);
                setPlayers(playersData);
                setTeams(teamsData);
                setIsUserHeadTd(userIsHead);

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
        return matches.sort((a,b) => a.id - b.id);
    }, [allMatches, selectedRound, selectedDivisionId, players, tournament]);

    const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t.name])), [teams]);
    const playerTeamMap = useMemo(() => new Map(players.map(p => [p.id, p.teamId])), [players]);

    const canEditPairings = useMemo(() => {
      return !isPublic && isUserHeadTd && matchesForSelectedRoundAndDivision.length > 0 && matchesForSelectedRoundAndDivision.every(m => m.status === 'pending');
    }, [isPublic, isUserHeadTd, matchesForSelectedRoundAndDivision]);

    const handleEditClick = (match: Match) => {
        setEditingMatch(match);
        setIsModalOpen(true);
    };

    const handleSaveScore = async (scoreA: number, scoreB: number) => {
        if (editingMatch && tournamentId) {
            await api.editMatchScore(editingMatch.id, scoreA, scoreB);
            setIsModalOpen(false);
            setEditingMatch(null);
        }
    };
    
    if (loading) {
        return <PairingsSkeleton />;
    }

    const renderPlayerName = (player: Player) => (
        <>
          {player.name}
          {tournament?.teamSettings.displayTeamNames && player.teamId && teamMap.get(player.teamId) && (
            <span className="text-gray-400 text-sm ml-2">({teamMap.get(player.teamId)})</span>
          )}
        </>
    );

    const TeamView = () => (
      <div className="space-y-6">
        {teams.map(team => {
          const teamMatches = matchesForSelectedRoundAndDivision.filter(m => 
            m.playerA.teamId === team.id || m.playerB?.teamId === team.id
          );
          if (teamMatches.length === 0) return null;

          return (
            <div key={team.id}>
              <h2 className="text-xl font-bold text-cool-blue-300 mb-3">{team.name}</h2>
              <div className="space-y-4">
                {teamMatches.map(match => {
                  const isPlayerAFromTeam = match.playerA.teamId === team.id;
                  const teamPlayer = isPlayerAFromTeam ? match.playerA : match.playerB!;
                  const opponent = isPlayerAFromTeam ? match.playerB : match.playerA;

                  return (
                    <div key={match.id} className="bg-slate-800 rounded-lg shadow-md p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="w-full sm:w-2/5 font-semibold text-white">{renderPlayerName(teamPlayer)}</div>
                        <div className="text-center text-gray-400 font-mono text-sm">vs</div>
                        <div className="w-full sm:w-2/5 font-semibold text-white text-left sm:text-right">{opponent ? renderPlayerName(opponent) : 'BYE'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );

    const ListView = () => (
      <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 text-sm text-gray-300 uppercase tracking-wider">
              <tr>
                <th className="p-3 w-20 text-center">Board</th>
                <th className="p-3">Who Plays Whom</th>
                {!isPublic && isUserHeadTd && <th className="p-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="text-gray-200">
              {matchesForSelectedRoundAndDivision.map((match, index) => {
                const playerA = match.playerA;
                const playerB = match.playerB;
                const playerAGoesFirst = match.firstTurnPlayerId === playerA.id;
                const playerBGoesFirst = playerB && match.firstTurnPlayerId === playerB.id;

                return (
                  <tr key={match.id} className="border-t border-dotted border-slate-700 odd:bg-green-900/10 hover:bg-slate-700/50">
                    <td className="p-3 font-bold text-center">{index + 1}</td>
                    <td className="p-3 text-lg">
                      <span className="font-semibold">{playerA.name}</span>
                      <span className="text-gray-400 text-sm ml-1">(#{playerA.seed})</span>
                      {playerAGoesFirst && <span className="text-yellow-400 mx-2 text-sm font-mono">*first*</span>}
                      
                      <span className="text-gray-500 mx-2">vs.</span>
                      
                      {playerB ? (
                        <>
                          <span className="font-semibold">{playerB.name}</span>
                          <span className="text-gray-400 text-sm ml-1">(#{playerB.seed})</span>
                          {playerBGoesFirst && <span className="text-yellow-400 ml-2 text-sm font-mono">*first*</span>}
                        </>
                      ) : (
                        <span className="font-semibold text-gray-400">Bye</span>
                      )}
                    </td>
                    {!isPublic && isUserHeadTd && playerB && (
                      <td className="p-3 text-right">
                         <button onClick={() => handleEditClick(match)} className="px-3 py-1 text-xs bg-slate-600 hover:bg-slate-500 rounded">
                           {match.status === 'completed' ? 'Edit Score' : 'Enter Score'}
                         </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {matchesForSelectedRoundAndDivision.length === 0 && (
            <div className="p-6 text-center text-gray-400">
              <p>Pairings for Round {selectedRound} will be available here once they are generated.</p>
            </div>
          )}
        </div>
      </div>
    );

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">Pairings & Results</h1>
                    <p className="text-gray-400 mt-1">{tournament?.name}</p>
                </div>
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    {tournament?.tournamentMode === 'team' && tournament.teamSettings.displayTeamNames && (
                        <div className="flex p-1 bg-slate-700 rounded-lg text-sm">
                            <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded-md ${viewMode === 'list' ? 'bg-cool-blue-600' : ''}`}>List View</button>
                            <button onClick={() => setViewMode('team')} className={`px-3 py-1 rounded-md ${viewMode === 'team' ? 'bg-cool-blue-600' : ''}`}>Group by Team</button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <label htmlFor="roundSelector" className="block text-sm font-bold text-gray-300 mb-2">Select Round</label>
                    <select id="roundSelector" value={selectedRound || ''} onChange={e => setSelectedRound(Number(e.target.value))} className="w-full bg-slate-700 text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500">
                        {roundsAvailable.map(r => <option key={r} value={r}>Round {r}</option>)}
                    </select>
                </div>
                {tournament && tournament.divisions.length > 1 && (
                     <div className="flex-1">
                        <label htmlFor="divisionSelector" className="block text-sm font-bold text-gray-300 mb-2">Select Division</label>
                        <select id="divisionSelector" value={selectedDivisionId} onChange={e => setSelectedDivisionId(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="w-full bg-slate-700 text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500">
                            {tournament.divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {viewMode === 'list' ? <ListView /> : <TeamView />}

            <ScoreEditModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveScore}
                match={editingMatch}
            />
        </div>
    );
};

export default PairingsPage;