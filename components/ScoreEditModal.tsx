import React, { useState, useEffect } from 'react';
import { Match } from '../types';

interface ScoreEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (scoreA: number, scoreB: number) => void;
  match: Match | null;
}

const ScoreEditModal: React.FC<ScoreEditModalProps> = ({ isOpen, onClose, onSave, match }) => {
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');

  useEffect(() => {
    if (match) {
      setScoreA(match.scoreA?.toString() || '');
      setScoreB(match.scoreB?.toString() || '');
    }
  }, [match, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numA = parseInt(scoreA, 10);
    const numB = parseInt(scoreB, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      onSave(numA, numB);
    }
  };

  if (!isOpen || !match) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-2">Edit Score</h2>
            <p className="text-gray-400 mb-4">Editing Round {match.round}: {match.playerA.name} vs {match.playerB?.name}</p>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label htmlFor="scoreA" className="block text-sm font-bold text-gray-300 mb-2 text-center">
                  {match.playerA.name}
                </label>
                <input
                  id="scoreA"
                  type="number"
                  value={scoreA}
                  onChange={(e) => setScoreA(e.target.value)}
                  className="w-full p-3 text-lg font-mono text-center text-gray-100 bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500"
                  required
                />
              </div>
               <div className="flex-1">
                <label htmlFor="scoreB" className="block text-sm font-bold text-gray-300 mb-2 text-center">
                  {match.playerB?.name}
                </label>
                <input
                  id="scoreB"
                  type="number"
                  value={scoreB}
                  onChange={(e) => setScoreB(e.target.value)}
                  className="w-full p-3 text-lg font-mono text-center text-gray-100 bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500"
                  required
                />
              </div>
            </div>
          </div>
          <div className="bg-slate-700/50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-cool-blue-600 hover:bg-cool-blue-700 text-white font-bold rounded-lg transition duration-200"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScoreEditModal;
