import React, { useState, useEffect, useRef, createRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as api from '../services/apiService';
import { Match, Tournament } from '../types';
import Tooltip from '../components/Tooltip';
import LowScoreConfirmationModal from '../components/LowScoreConfirmationModal';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import SkeletonLoader from '../components/SkeletonLoader';

interface LowScoreDetail {
  playerName: string;
  score: number;
}

const ScoreEntrySkeleton: React.FC = () => (
    <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
                <SkeletonLoader className="h-10 w-80 mb-2" />
                <SkeletonLoader className="h-5 w-48" />
            </div>
            <div>
                <SkeletonLoader className="h-5 w-32 mb-1" />
                <SkeletonLoader className="h-12 w-48" />
            </div>
        </div>
        <div className="bg-slate-800 rounded-lg shadow-lg">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                    <thead className="bg-slate-900/50 text-sm text-gray-400 border-b-2 border-slate-700">
                        <tr>
                            <th className="p-3 w-2/5"><SkeletonLoader className="h-5" /></th>
                            <th className="p-3 w-1/5"><SkeletonLoader className="h-5" /></th>
                            <th className="p-3 w-1/5"><SkeletonLoader className="h-5" /></th>
                            <th className="p-3 w-2/5"><SkeletonLoader className="h-5" /></th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="border-b border-slate-700 last:border-b-0">
                                <td className="p-3"><SkeletonLoader className="h-7 w-3/4" /></td>
                                <td className="p-3"><SkeletonLoader className="h-10" /></td>
                                <td className="p-3"><SkeletonLoader className="h-10" /></td>
                                <td className="p-3"><SkeletonLoader className="h-7 w-3/4 ml-auto" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);


const BatchScoreEntryPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matchesForRound, setMatchesForRound] = useState<Match[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [roundsAvailable, setRoundsAvailable] = useState<number[]>([]);
  const [scores, setScores] = useState<Record<number, { scoreA: string; scoreB: string }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isRoundCompleted, setIsRoundCompleted] = useState(false);
  const navigate = useNavigate();

  const [isLowScoreModalOpen, setIsLowScoreModalOpen] = useState(false);
  const [lowScoresToConfirm, setLowScoresToConfirm] = useState<LowScoreDetail[]>([]);
  const [scoresToSubmit, setScoresToSubmit] = useState<Record<number, { scoreA: number; scoreB: number }>>({});

  const inputRefs = useRef<Map<string, React.RefObject<HTMLInputElement>>>(new Map());

  const fetchInitialData = useCallback(async () => {
      if (!tournamentId) return;
      const tournamentData = await api.getTournament(tournamentId);
      setTournament(tournamentData);

      if (tournamentData) {
        const allMatches = await api.getMatches(tournamentId);
        const allPairedRounds = [...new Set(allMatches.map(m => m.round))].sort((a, b) => a - b);
        setRoundsAvailable(allPairedRounds.length > 0 ? allPairedRounds : []);
        
        const lastPendingRound = [...allPairedRounds].reverse().find(r =>
          allMatches.some(m => m.round === r && m.status === 'pending')
        );
        setSelectedRound(lastPendingRound || allPairedRounds[allPairedRounds.length - 1] || 1);
      }
  }, [tournamentId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const fetchRoundData = useCallback(async () => {
    if (!tournamentId || !selectedRound) {
        setLoading(false);
        setMatchesForRound([]);
        return;
    }
    setLoading(true);
    const allMatches = await api.getMatches(tournamentId);
    const currentMatches = allMatches.filter(m => m.round === selectedRound && m.playerB !== null);
    setMatchesForRound(currentMatches);

    const allCompleted = currentMatches.length > 0 && currentMatches.every(m => m.status === 'completed');
    setIsRoundCompleted(allCompleted);

    const initialScores: Record<number, { scoreA: string; scoreB: string }> = {};
    inputRefs.current.clear();
    currentMatches.forEach(m => {
        initialScores[m.id] = { 
            scoreA: m.scoreA !== null ? String(m.scoreA) : '', 
            scoreB: m.scoreB !== null ? String(m.scoreB) : '' 
        };
        inputRefs.current.set(`${m.id}-A`, createRef<HTMLInputElement>());
        inputRefs.current.set(`${m.id}-B`, createRef<HTMLInputElement>());
    });
    setScores(initialScores);
    setLoading(false);
  }, [tournamentId, selectedRound]);

  useEffect(() => {
      fetchRoundData();
  }, [selectedRound, fetchRoundData]);

  useRealtimeUpdates(fetchRoundData);

  const handleScoreChange = (matchId: number, player: 'A' | 'B', value: string) => {
    setScores(prev => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || { scoreA: '', scoreB: '' }),
        [player === 'A' ? 'scoreA' : 'scoreB']: value
      }
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, matchId: number, player: 'A' | 'B') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentMatchIndex = matchesForRound.findIndex(m => m.id === matchId);

      if (player === 'B') {
          const nextMatch = matchesForRound[currentMatchIndex + 1];
          if (nextMatch) {
              inputRefs.current.get(`${nextMatch.id}-A`)?.current?.focus();
          } else {
              document.getElementById('submit-scores-button')?.focus();
          }
      } else { // Player A
         inputRefs.current.get(`${matchId}-B`)?.current?.focus();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentId) return;

    const formattedScores: Record<number, { scoreA: number; scoreB: number }> = {};
    Object.entries(scores).forEach(([matchIdStr, result]) => {
      const typedResult = result as { scoreA: string, scoreB: string };
      if (typedResult && typedResult.scoreA !== '' && typedResult.scoreB !== '') {
        const scoreA = parseInt(typedResult.scoreA, 10);
        const scoreB = parseInt(typedResult.scoreB, 10);
        if (!isNaN(scoreA) && !isNaN(scoreB) && scoreA >= 0 && scoreB >= 0) {
             formattedScores[parseInt(matchIdStr, 10)] = { scoreA, scoreB };
        }
      }
    });

    const LOW_SCORE_THRESHOLD = 100;
    const lowScoreDetails: LowScoreDetail[] = [];
    
    Object.entries(formattedScores).forEach(([matchIdStr, result]) => {
        const matchId = parseInt(matchIdStr, 10);
        const match = matchesForRound.find(m => m.id === matchId);
        if (!match) return;

        if (result.scoreA < LOW_SCORE_THRESHOLD) {
            lowScoreDetails.push({ playerName: match.playerA.name, score: result.scoreA });
        }
        if (match.playerB && result.scoreB < LOW_SCORE_THRESHOLD) {
            lowScoreDetails.push({ playerName: match.playerB.name, score: result.scoreB });
        }
    });

    if (lowScoreDetails.length > 0) {
        setLowScoresToConfirm(lowScoreDetails);
        setScoresToSubmit(formattedScores);
        setIsLowScoreModalOpen(true);
    } else {
        submitScoresToApi(formattedScores);
    }
  };
  
  const submitScoresToApi = async (scoresToSubmit: Record<number, { scoreA: number; scoreB: number }>) => {
      if (!tournamentId) return;
      setSubmitting(true);
      try {
          await api.submitScores(tournamentId, scoresToSubmit);
          setSubmitting(false);
          navigate(`/tournament/${tournamentId}/dashboard`);
      } catch (error) {
          console.error("Error submitting scores or pairing next round:", error);
          alert((error as Error).message);
          setSubmitting(false);
      }
  };

  const handleConfirmAndSubmit = () => {
    submitScoresToApi(scoresToSubmit);
    setIsLowScoreModalOpen(false);
  };
  
  const allScoresEntered = matchesForRound.length > 0 && matchesForRound.every(m => {
    const score = scores[m.id];
    return score && score.scoreA !== '' && score.scoreB !== '';
  });
  
  const enteredCount = Object.values(scores).filter(s => {
    const typedS = s as {scoreA: string, scoreB: string};
    return typedS && typedS.scoreA !== '' && typedS.scoreB !== '';
  }).length;

  return (
    <div>
      {loading ? (
        <ScoreEntrySkeleton />
      ) : (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Batch Score Entry</h1>
                    <p className="text-gray-400">{tournament?.name}</p>
                </div>
                {roundsAvailable.length > 0 && (
                    <div>
                        <label htmlFor="roundSelector" className="block text-sm font-bold text-gray-300 mb-1">
                            Scoring for Round
                        </label>
                        <select
                            id="roundSelector"
                            value={selectedRound || ''}
                            onChange={e => setSelectedRound(Number(e.target.value))}
                            className="w-full sm:w-auto p-3 bg-slate-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500"
                        >
                            {roundsAvailable.map(r => <option key={r} value={r}>Round {r}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {isRoundCompleted && (
                 <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg mb-6" role="alert">
                    <strong className="font-bold">Warning: </strong>
                    <span className="block sm:inline">You are editing scores for a round that has already been completed. Changes will overwrite existing results.</span>
                </div>
            )}

          {matchesForRound.length === 0 ? (
            <div className="text-center text-gray-400 bg-slate-800 p-8 rounded-lg">
                {selectedRound ? `No matches found for Round ${selectedRound}.` : 'No rounds have been paired yet.'}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="bg-slate-800 rounded-lg shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left responsive-table">
                    <thead className="bg-slate-900/50 text-sm text-gray-400 border-b-2 border-slate-700">
                        <tr>
                        <th className="p-3 w-2/5">Player A</th>
                        <th className="p-3 w-1/5 text-center">Score A</th>
                        <th className="p-3 w-1/5 text-center">Score B</th>
                        <th className="p-3 w-2/5 text-right">Player B</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700 text-gray-200">
                        {matchesForRound.map((match) => (
                        <tr key={match.id} className="hover:bg-slate-700/50">
                            <td data-label="Player A" className="p-3 text-lg font-medium whitespace-nowrap">
                                <Tooltip text={match.playerA.name}>
                                    <span className="truncate inline-block align-middle max-w-[150px] sm:max-w-[200px] md:max-w-xs">{match.playerA.name}</span>
                                </Tooltip>
                                <span className="text-sm text-gray-400 ml-2">({match.playerA.rating})</span>
                            </td>
                            <td data-label="Score A" className="p-3">
                            <input
                                ref={inputRefs.current.get(`${match.id}-A`)}
                                type="number"
                                min="0"
                                step="1"
                                value={scores[match.id]?.scoreA ?? ''}
                                onChange={e => handleScoreChange(match.id, 'A', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, match.id, 'A')}
                                className="w-full p-2 font-mono text-center bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500"
                            />
                            </td>
                            <td data-label="Score B" className="p-3">
                            <input
                                ref={inputRefs.current.get(`${match.id}-B`)}
                                type="number"
                                min="0"
                                step="1"
                                value={scores[match.id]?.scoreB ?? ''}
                                onChange={e => handleScoreChange(match.id, 'B', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, match.id, 'B')}
                                className="w-full p-2 font-mono text-center bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500"
                            />
                            </td>
                            <td data-label="Player B" className="p-3 text-lg font-medium text-right whitespace-nowrap">
                                {match.playerB && (
                                    <>
                                    <span className="text-sm text-gray-400 mr-2">({match.playerB.rating})</span>
                                    <Tooltip text={match.playerB.name}>
                                        <span className="truncate inline-block align-middle max-w-[150px] sm:max-w-[200px] md:max-w-xs">{match.playerB.name}</span>
                                    </Tooltip>
                                    </>
                                )}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                 <div>
                    <span className="text-lg font-bold text-white">Entered: </span>
                    <span className={`text-lg font-bold font-mono px-3 py-1 rounded ${allScoresEntered ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                        {enteredCount} / {matchesForRound.length}
                    </span>
                </div>
                <button
                  id="submit-scores-button"
                  type="submit"
                  disabled={submitting || !allScoresEntered}
                  className="w-full sm:w-auto px-8 py-3 bg-cool-blue-600 text-white font-bold rounded-lg hover:bg-cool-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition duration-200"
                >
                  {submitting ? 'Submitting...' : isRoundCompleted ? 'Save Changes' : 'Submit All Scores'}
                </button>
              </div>
            </form>
          )}
        </>
      )}
      <LowScoreConfirmationModal
        isOpen={isLowScoreModalOpen}
        onClose={() => setIsLowScoreModalOpen(false)}
        onConfirm={handleConfirmAndSubmit}
        lowScoreDetails={lowScoresToConfirm}
      />
    </div>
  );
};

export default BatchScoreEntryPage;
