import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as api from '../services/apiService';
import { Tournament } from '../types';

interface ParsedPlayer {
    name: string;
    rating: number;
    teamName?: string;
}

const AddPlayersPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [parsedPlayers, setParsedPlayers] = useState<ParsedPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (tournamentId) {
        api.getTournament(tournamentId).then(t => {
            if (t) {
                setTournament(t);
            } else {
                navigate('/dashboard'); // Tournament not found
            }
        });
    }
  }, [tournamentId, navigate]);

  const handleParseText = () => {
    setError(null);
    const lines = bulkText.trim().split('\n');
    const players: ParsedPlayer[] = [];
    let lineError = false;

    lines.forEach((line, index) => {
        if (line.trim() === '') return;
        
        const teamMatch = line.match(/;\s*;\s*team\s+(.+)$/i);
        const teamName = teamMatch ? teamMatch[1].trim() : undefined;
        const lineWithoutTeam = line.replace(/;\s*;\s*team\s+.+$/i, '').trim();
        
        const mainMatch = lineWithoutTeam.match(/^(.*[^\d])\s+(\d+)$/);

        if (mainMatch) {
            const name = mainMatch[1].trim().replace(/,$/, '').trim();
            const rating = parseInt(mainMatch[2], 10);
            players.push({ name, rating, teamName });
        } else {
            setError(`Error on line ${index + 1}: Could not parse name and rating. Please use "Name Rating" or "Name Rating ; ; team Team Name".`);
            lineError = true;
        }
    });

    if (!lineError) {
        setParsedPlayers(players);
    } else {
        setParsedPlayers([]);
    }
  };
  
  const handleSaveAndContinue = async () => {
      if (!tournamentId || parsedPlayers.length === 0 || !tournament) return;
      setSaving(true);
      try {
        await api.addPlayersBulk(tournamentId, parsedPlayers);
        
        if (tournament.tournamentMode === 'team') {
            navigate(`/tournament/${tournamentId}/manage-teams`);
        } else {
            navigate(`/tournament/${tournamentId}/pairing-scheduler`);
        }
      } catch (error) {
          console.error("Error saving players", error);
          alert("Could not save players. Please try again.");
          setSaving(false);
      }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
        <div className="w-full max-w-4xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white text-center">Add Players to {tournament?.name}</h1>
            <p className="text-gray-400 mb-8 text-center">Step 2: Add players in bulk.</p>
            <div className="bg-slate-800 rounded-lg shadow-lg p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="font-bold text-lg text-cool-blue-300 mb-2">Paste Player List</h3>
                    <p className="text-sm text-gray-400 mb-4">
                        Enter one player per line. Use format:<br />
                        <code className="bg-slate-900 text-cool-blue-300 text-xs px-1 py-0.5 rounded">Player Name 1234</code><br/>
                        <code className="bg-slate-900 text-cool-blue-300 text-xs px-1 py-0.5 rounded">... ; ; team Team Name</code> (for team events)
                    </p>
                    <textarea 
                        className="w-full h-80 md:h-96 p-3 font-mono text-sm bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500"
                        placeholder="Enyi, Emmanuel 1500&#10;Nigel Richards 2200 ; ; team Legends&#10;Jane Doe 1850"
                        value={bulkText}
                        onChange={e => setBulkText(e.target.value)}
                    />
                    <button 
                        onClick={handleParseText}
                        className="mt-4 w-full py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg transition duration-200"
                    >
                        Parse & Preview Players
                    </button>
                </div>
                <div>
                     <h3 className="font-bold text-lg text-cool-blue-300 mb-2">Parsed Players ({parsedPlayers.length})</h3>
                     <p className="text-sm text-gray-400 mb-4">Review the list before continuing.</p>
                     {error && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-md mb-4">{error}</div>}
                     <div className="bg-slate-900/50 rounded-md h-80 md:h-96 overflow-y-auto">
                        {parsedPlayers.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-400">
                                        <th className="p-2">Name</th>
                                        {tournament?.tournamentMode === 'team' && <th className="p-2">Team</th>}
                                        <th className="p-2 text-right">Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-200">
                                    {parsedPlayers.map((p, i) => (
                                        <tr key={i} className="border-t border-slate-700">
                                            <td className="p-2">{p.name}</td>
                                            {tournament?.tournamentMode === 'team' && <td className="p-2 text-gray-400">{p.teamName || 'N/A'}</td>}
                                            <td className="p-2 text-right font-mono">{p.rating}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                Preview will appear here
                            </div>
                        )}
                     </div>
                </div>
            </div>
             <div className="mt-8 pt-4 flex justify-between items-center">
                <button
                    type="button"
                    onClick={() => navigate('/create-tournament')}
                    className="px-6 py-3 bg-transparent hover:bg-slate-700 text-gray-300 font-bold rounded-lg transition duration-200"
                >
                    &larr; Back
                </button>
                <button
                    onClick={handleSaveAndContinue}
                    disabled={saving || parsedPlayers.length === 0}
                    className="px-8 py-3 bg-cool-blue-600 hover:bg-cool-blue-700 disabled:bg-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-lg transition duration-200"
                >
                    {saving ? 'Saving...' : 'Save & Continue'}
                </button>
            </div>
        </div>
    </div>
  );
};

export default AddPlayersPage;