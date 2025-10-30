import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTournaments } from '../services/mockApiService';
import { Tournament } from '../types';

const TournamentListPage: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true);
      const data = await getTournaments();
      setTournaments(data);
      setLoading(false);
    };
    fetchTournaments();
  }, []);

  const getStatusColor = (status: Tournament['status']) => {
    switch (status) {
      case 'In Progress': return 'bg-green-500/20 text-green-300';
      case 'Completed': return 'bg-cool-blue-500/20 text-cool-blue-300';
      case 'Not Started': return 'bg-yellow-500/20 text-yellow-300';
      default: return 'bg-slate-600';
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading tournaments...</div>;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-0">Your Tournaments</h1>
        <Link
          to="/td-panel/create-tournament"
          className="w-full sm:w-auto px-6 py-3 bg-cool-blue-600 text-white font-bold rounded-lg hover:bg-cool-blue-700 transition duration-200 text-center"
        >
          Create New Tournament
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map(t => (
          <div 
            key={t.id} 
            className="bg-slate-800 rounded-lg shadow-lg p-6 flex flex-col justify-between hover:ring-2 hover:ring-cool-blue-500 transition-all cursor-pointer"
            onClick={() => navigate(`/td-panel/${t.id}/dashboard`)}
          >
            <div>
              <div className="flex justify-between items-start">
                  <h2 className="text-xl font-bold text-white mb-2">{t.name}</h2>
              </div>
              <p className="text-gray-400 mb-4">Scrabble</p>
              <div className="flex items-center space-x-4 text-sm text-gray-300 mb-4">
                  <span>{t.playerCount} Players</span>
                  <span>&bull;</span>
                  <span>{t.totalRounds} Rounds</span>
              </div>
            </div>
            <div>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(t.status)}`}>
                    {t.status}
                </span>
            </div>
          </div>
        ))}
         {tournaments.length === 0 && (
            <p className="text-gray-400 md:col-span-2 lg:col-span-3 text-center">No tournaments found. Create one to get started!</p>
         )}
      </div>
    </div>
  );
};

export default TournamentListPage;