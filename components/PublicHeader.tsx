import React from 'react';
import { Link } from 'react-router-dom';
import { Tournament } from '../types';

interface PublicHeaderProps {
    tournament: Tournament | null;
}

const PublicHeader: React.FC<PublicHeaderProps> = ({ tournament }) => {
  return (
    <header className="bg-slate-800/80 backdrop-blur-sm p-4 flex items-center justify-between border-b border-slate-700">
      <div>
         <h1 className="text-lg font-bold text-white tracking-wider">Kismet</h1>
         <p className="text-xs text-gray-400">Public View: {tournament?.name || 'Tournament'}</p>
      </div>
       <nav className="flex items-center space-x-2 md:space-x-4">
          {tournament && (
            <>
                <Link to={`/public/t/${tournament.slug}`} className="text-sm font-medium text-gray-300 hover:text-white">Home</Link>
                <Link to={`/public/t/${tournament.slug}/standings`} className="text-sm font-medium text-gray-300 hover:text-white">Standings</Link>
                <Link to={`/public/t/${tournament.slug}/pairings`} className="text-sm font-medium text-gray-300 hover:text-white">Pairings</Link>
            </>
          )}
      </nav>
    </header>
  );
};

export default PublicHeader;