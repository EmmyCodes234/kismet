import React, { useState, useEffect } from 'react';
import { Player } from '../types';

interface PlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (player: Omit<Player, 'id'> | Player) => void;
  player: Player | null;
}

const PlayerModal: React.FC<PlayerModalProps> = ({ isOpen, onClose, onSave, player }) => {
  const [name, setName] = useState('');
  const [rating, setRating] = useState(1000);

  useEffect(() => {
    if (player) {
      setName(player.name);
      setRating(player.rating);
    } else {
      setName('');
      setRating(1000);
    }
  }, [player, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(player || {}),
      name,
      rating,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">{player ? 'Edit Player' : 'Add New Player'}</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="playerName" className="block text-sm font-bold text-gray-300 mb-2">
                  Player Name
                </label>
                <input
                  id="playerName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 text-gray-100 bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="playerRating" className="block text-sm font-bold text-gray-300 mb-2">
                  Rating
                </label>
                <input
                  id="playerRating"
                  type="number"
                  value={rating}
                  onChange={(e) => setRating(parseInt(e.target.value, 10))}
                  className="w-full p-3 text-gray-100 bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500"
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
              Save Player
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlayerModal;
