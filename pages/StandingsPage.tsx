import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import * as api from '../services/apiService';
import { Standing, Tournament, LastGameInfo, TeamStanding } from '../types';
import ClinchIndicator from '../components/ClinchIndicator';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import SkeletonLoader from '../components/SkeletonLoader';

const formatLastGame = (lastGame: LastGameInfo | null): string => {
    if (!lastGame) return '-';
    if (lastGame.result === 'B') return 'BYE';
    if (lastGame.result === 'F') return 'FORFEIT';
    return `${lastGame.round}${lastGame.result}:${lastGame.playerScore}-${lastGame.opponentScore}:#${lastGame.opponentSeed}`;
}

const StandingsSkeleton: React.FC = () => (
    <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm md:text-base">
          <thead className="bg-slate-900/50 text-xs md:text-sm text-gray-300 uppercase tracking-wider">
            <tr>
              <th className="p-2 md:p-4 text-left w-16"><SkeletonLoader className="h-5" /></th>
              <th className="p-2 md:p-4 text-center w-24"><SkeletonLoader className="h-5" /></th>
              <th className="p-2 md:p-4 text-right w-24"><SkeletonLoader className="h-5" /></th>
              <th className="p-2 md:p-4 text-left"><SkeletonLoader className="h-5" /></th>
              <th className="p-2 md:p-4 text-left"><SkeletonLoader className="h-5" /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-700 last:border-0">
                <td className="p-2 md:p-4"><SkeletonLoader className="h-6" /></td>
                <td className="p-2 md:p-4"><SkeletonLoader className="h-6" /></td>
                <td className="p-2 md:p-4"><SkeletonLoader className="h-6" /></td>
                <td className="p-2 md:p-4"><SkeletonLoader className="h-6" /></td>
                <td className="p-2 md:p-4"><SkeletonLoader className="h-6" /></td>
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


  return (
    <div className="printable-area">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">Live Standings</h1>
          <p className="text-gray-400 mt-1">{tournament?.name}</p>
        </div>
        <button onClick={() => window.print()} className="px-4 py-2 text-sm font-bold rounded-lg bg-slate-600 hover:bg-slate-500 text-white transition no-print mt-4 sm:mt-0">
          Print Standings
        </button>
      </div>

      {tournament?.tournamentMode === 'team' && (
         <div className="flex border-b border-slate-700 mb-6 no-print">
            <button onClick={() => setActiveTab('individual')} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'individual' ? 'border-b-2 border-cool-blue-400 text-white' : 'text-gray-400 hover:text-white'}`}>Individual</button>
            <button onClick={() => setActiveTab('team')} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'team' ? 'border-b-2 border-cool-blue-400 text-white' : 'text-gray-400 hover:text-white'}`}>Team</button>
         </div>
      )}

      {activeTab === 'individual' && tournament && tournament.divisions.length > 1 && (
        <div className="flex border-b border-slate-700 mb-6 no-print">
            {tournament.divisions.map(div => (
                <button 
                    key={div.id}
                    onClick={() => setSelectedDivisionId(div.id)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${selectedDivisionId === div.id ? 'border-b-2 border-cool-blue-400 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    {div.name}
                </button>
            ))}
        </div>
      )}

      {loading ? (
          <StandingsSkeleton />
      ) : activeTab === 'individual' ? (
        <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm md:text-base responsive-table">
              <thead className="bg-slate-900/50 text-xs md:text-sm text-gray-300 uppercase tracking-wider">
                <tr>
                  <th className="p-2 md:p-4 text-left">Rank</th>
                  <th className="p-2 md:p-4 text-center">Won-Lost</th>
                  <th className="p-2 md:p-4 text-right">Spread</th>
                  <th className="p-2 md:p-4 text-left">Player</th>
                  <th className="p-2 md:p-4 text-left">Last Game</th>
                </tr>
              </thead>
              <tbody className="text-gray-200">
                {filteredIndividualStandings.map((s) => (
                  <tr key={s.player.id} className="border-b border-slate-700 last:border-0 hover:bg-slate-700/50 transition-colors">
                    <td data-label="Rank" className="p-2 md:p-4 font-bold text-base md:text-xl text-cool-blue-400 whitespace-nowrap">{s.rank}</td>
                    <td data-label="Won-Lost" className="p-2 md:p-4 text-center font-mono whitespace-nowrap">{`${s.wins}-${s.losses}`}</td>
                    <td data-label="Spread" className="p-2 md:p-4 text-right font-mono whitespace-nowrap">{s.cumulativeSpread > 0 ? `+${s.cumulativeSpread}` : s.cumulativeSpread}</td>
                    <td data-label="Player" className="p-2 md:p-4 font-medium whitespace-nowrap">
                        <div className="flex items-center">
                            <Link 
                                to={isPublic && slug 
                                    ? `/public/t/${slug}/player/${s.player.id}`
                                    : `/tournament/${tournamentId}/player/${s.player.id}`} 
                                className="hover:text-cool-blue-400 hover:underline"
                            >
                                {s.player.name} {tournament?.teamSettings.displayTeamNames && s.teamName ? `(${s.teamName})` : ''}
                            </Link>
                            <span className="text-gray-400 ml-2">(#{s.player.seed})</span>
                            {s.clinchStatus === 'clinched' && <ClinchIndicator />}
                        </div>
                    </td>
                    <td data-label="Last Game" className="p-2 md:p-4 font-mono whitespace-nowrap">{formatLastGame(s.lastGame)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
             {filteredIndividualStandings.length === 0 && <p className="p-4 text-center text-gray-400">Standings will be available once the first round is completed.</p>}
          </div>
        </div>
      ) : ( // Team Standings
        <div className="space-y-4">
            {allTeamStandings.map(ts => (
                <div key={ts.team.id} className="bg-slate-800 rounded-lg shadow-lg overflow-hidden transition-all duration-300">
                    <div 
                        className="flex items-center p-4 cursor-pointer hover:bg-slate-700/50"
                        onClick={() => setExpandedTeamId(prev => prev === ts.team.id ? null : ts.team.id)}
                    >
                        <div className="w-16 font-bold text-xl text-cool-blue-400 text-center">{ts.rank}</div>
                        <div className="flex-grow font-semibold text-lg text-white">{ts.team.name}</div>
                        <div className="w-24 text-right font-mono font-bold text-xl text-white">{ts.totalScore}</div>
                        <div className="w-10 text-right">
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-400 transform transition-transform ${expandedTeamId === ts.team.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                    {expandedTeamId === ts.team.id && (
                        <div className="bg-slate-900/30 px-4 pb-4">
                            <table className="w-full text-sm mt-2">
                                <thead className="text-gray-400">
                                    <tr>
                                        <th className="p-2 text-left">Player</th>
                                        <th className="p-2 text-center">Record</th>
                                        <th className="p-2 text-right">Spread</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ts.contributingPlayers.map(p => (
                                        <tr key={p.player.id} className="border-t border-slate-700">
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
            {allTeamStandings.length === 0 && <p className="p-4 text-center text-gray-400">Team standings will be available once results are entered.</p>}
        </div>
      )}
    </div>
  );
};

export default StandingsPage;