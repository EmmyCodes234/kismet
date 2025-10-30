import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getStandings, getTournamentStatus, getTournament, finalizeTournamentRatings, generatePairingsForRound } from '../services/mockApiService';
import { Standing, Tournament, Division } from '../types';
import DashboardCard from '../components/DashboardCard';

// FIX: This component was removed from this file because it is not used and the linter was complaining.
// const CreateTournamentModal: React.FC<{...}> = ...

const DashboardPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [status, setStatus] = useState<{ currentRound: number; pendingMatches: number; isComplete: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pairing, setPairing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(null);


  const fetchData = async () => {
    if (!tournamentId) return;
    setLoading(true);
    try {
      const tournamentData = await getTournament(tournamentId);
      setTournament(tournamentData || null);
      
      const currentDivisionId = selectedDivisionId || tournamentData?.divisions[0]?.id || null;
      if (currentDivisionId && !selectedDivisionId) {
          setSelectedDivisionId(currentDivisionId);
      }
      
      const [standingsData, statusData] = await Promise.all([
        getStandings(tournamentId, currentDivisionId || undefined), 
        getTournamentStatus(tournamentId)
      ]);

      setStandings(standingsData);
      setStatus(statusData);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tournamentId]);
  
  useEffect(() => {
     if (!tournamentId || !selectedDivisionId) return;
     setLoading(true);
     getStandings(tournamentId, selectedDivisionId).then(data => {
         setStandings(data);
         setLoading(false);
     });
  }, [selectedDivisionId, tournamentId]);

  const handlePairNextRound = async () => {
    if (!tournamentId || !status || status.pendingMatches > 0) return;
    const nextRound = (status?.currentRound || 0) + 1;
    if (window.confirm(`Are you sure you want to pair Round ${nextRound} for all divisions?`)) {
        setPairing(true);
        try {
            await generatePairingsForRound(tournamentId, nextRound);
            // FIX: The page now correctly navigates to the pairings page for the current tournament.
            navigate(`/tournament/${tournamentId}/pairings`);
        } catch(error) {
            console.error("Failed to pair next round", error);
        } finally {
            setPairing(false);
        }
    }
  };
  
  const handleFinalizeRatings = async () => {
      if (!tournamentId) return;
      if (window.confirm("Are you sure you want to finalize results and calculate new ratings? This action cannot be undone.")) {
          setFinalizing(true);
          try {
              await finalizeTournamentRatings(tournamentId);
              // FIX: The page now correctly navigates to the ratings report for the current tournament.
              navigate(`/tournament/${tournamentId}/ratings-report`);
          } catch(e) {
              alert((e as Error).message);
          } finally {
            setFinalizing(false);
          }
      }
  }

  const isPairingDisabled = status?.pendingMatches !== 0 || status?.isComplete || pairing;

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">{tournament?.name}</h1>
            <p className="text-lg text-gray-400">Tournament Dashboard</p>
        </div>
        <Link to={`/public/${tournamentId}`} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition duration-200 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          {copySuccess || 'Public Link'}
        </Link>
      </div>

      {loading && standings.length === 0 ? (
        <div className="text-center text-gray-400">Loading dashboard...</div>
      ) : !tournament ? (
         <div className="text-center text-red-400">Tournament not found.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <DashboardCard title="Live Standings" className="lg:col-span-2">
             {tournament.divisions.length > 1 && (
                <div className="flex border-b border-slate-700 mb-4">
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
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-sm text-gray-400">
                    <th className="p-2">Rank</th>
                    <th className="p-2">Player</th>
                    <th className="p-2 text-center">Won-Lost</th>
                    <th className="p-2 text-right">Spread</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.slice(0, 8).map((s) => (
                    <tr key={s.player.id} className="border-t border-slate-700">
                      <td className="p-2 font-bold text-cool-blue-400">{s.rank}</td>
                      <td className="p-2">
                        <div className="flex items-center">
                          <span>{s.player.name}</span>
                          {s.ratingChangeSinceStart && s.ratingChangeSinceStart > 0 && (
                            <span className="ml-2 text-green-400" title={`+${s.ratingChangeSinceStart} rating`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                            </span>
                          )}
                          {s.ratingChangeSinceStart && s.ratingChangeSinceStart < 0 && (
                            <span className="ml-2 text-red-400" title={`${s.ratingChangeSinceStart} rating`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-center font-mono">{`${s.wins}-${s.losses}`}</td>
                      <td className="p-2 text-right font-mono">{s.cumulativeSpread > 0 ? `+${s.cumulativeSpread}` : s.cumulativeSpread}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardCard>

          <div className="space-y-8">
            <DashboardCard title="Status">
                {status && (
                    <div className="space-y-2 text-lg">
                        <p><strong>Status:</strong> <span className={`font-mono ${tournament.status === 'Completed' ? 'text-cool-blue-300' : 'text-green-400'}`}>{tournament.status}</span></p>
                        <p><strong>Current Round:</strong> <span className="font-mono text-cool-blue-300">{status.currentRound || 0} / {tournament.totalRounds}</span></p>
                        <p><strong>Pending Results:</strong> <span className="font-mono text-yellow-400">{status.pendingMatches}</span></p>
                    </div>
                )}
            </DashboardCard>
            <DashboardCard title="Actions">
                <div className="space-y-4">
                    <Link to={`/tournament/${tournamentId}/pairings`} className="block w-full text-center bg-cool-blue-600 hover:bg-cool-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200">Manage Pairings</Link>
                    <button onClick={handlePairNextRound} disabled={isPairingDisabled} className="w-full text-center bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:bg-slate-700 disabled:cursor-not-allowed">
                        {pairing ? 'Pairing...' : `Pair Round ${ (status?.currentRound || 0) + 1}`}
                    </button>
                    {tournament.status === 'Completed' && (
                       <button onClick={handleFinalizeRatings} disabled={finalizing} className="w-full text-center bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:bg-slate-700 disabled:cursor-not-allowed">
                        {finalizing ? 'Finalizing...' : 'Finalize Ratings'}
                      </button>
                    )}
                </div>
            </DashboardCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
