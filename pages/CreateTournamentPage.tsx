import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/apiService';
import { TournamentMode } from '../types';

const CreateTournamentPage: React.FC = () => {
  const [name, setName] = useState('');
  const [tournamentMode, setTournamentMode] = useState<TournamentMode>('individual');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
        const newTournament = await api.createTournament(name, tournamentMode);
        if (newTournament) {
            navigate(`/tournament/${newTournament.id}/add-players`);
        } else {
            alert("Failed to create tournament. Please try again.");
            setSubmitting(false);
        }
    } catch (error: any) {
        console.error("Error creating tournament", error);
        alert(error.message || "An error occurred. Please try again.");
        setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-slate-900 p-4">
        <div className="w-full max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white text-center">Create New Tournament</h1>
            <p className="text-gray-400 mb-8 text-center">Step 1: Basic setup</p>
            <div className="bg-slate-800 rounded-lg shadow-lg p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-bold text-gray-300 mb-2">
                    Tournament Name
                    </label>
                    <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 text-gray-100 bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500"
                    placeholder="e.g., Winter Scrabble Open 2024"
                    required
                    autoFocus
                    />
                </div>
                
                <div className="pt-4 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg transition duration-200"
                    >
                        Cancel
                    </button>
                    <button
                    type="submit"
                    disabled={submitting || !name}
                    className="px-8 py-3 bg-cool-blue-600 hover:bg-cool-blue-700 disabled:bg-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-lg transition duration-200"
                    >
                    {submitting ? 'Creating...' : 'Next: Add Players'}
                    </button>
                </div>
                </form>
            </div>
        </div>
    </div>
  );
};

export default CreateTournamentPage;