import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Tournament } from '../types';

interface PublicTournamentHeaderProps {
    tournament: Tournament;
}

const PublicTournamentHeader: React.FC<PublicTournamentHeaderProps> = ({ tournament }) => {
    const location = useLocation();
    const currentPath = location.pathname;
    
    const navItems = [
        { name: 'Home', path: `/public/t/${tournament.slug}` },
        { name: 'Standings', path: `/public/t/${tournament.slug}/standings` },
        { name: 'Pairings', path: `/public/t/${tournament.slug}/pairings` },
        { name: 'Players', path: `/public/t/${tournament.slug}/players` },
        { name: 'Stats', path: `/public/t/${tournament.slug}/stats` },
    ];

    return (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
            {/* Tournament Banner */}
            {tournament.publicPortalSettings?.bannerUrl && (
                <div className="w-full h-32 md:h-48 overflow-hidden">
                    <img 
                        src={tournament.publicPortalSettings.bannerUrl} 
                        alt={`${tournament.name} Banner`} 
                        className="w-full h-full object-cover"
                    />
                </div>
            )}
            
            {/* Tournament Info */}
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">{tournament.name}</h1>
                        <p className="text-slate-300">Public Tournament Portal</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-slate-700 text-slate-200 text-sm rounded-full">
                            {tournament.status}
                        </span>
                        {tournament.tournamentMode === 'team' && (
                            <span className="px-3 py-1 bg-cool-blue-700 text-cool-blue-100 text-sm rounded-full">
                                Team Event
                            </span>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Navigation */}
            <div className="max-w-7xl mx-auto px-4">
                <nav className="flex overflow-x-auto py-2 -mx-4 px-4">
                    <div className="flex space-x-1 min-w-full">
                        {navItems.map((item) => {
                            const isActive = currentPath === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                                        isActive 
                                            ? 'bg-cool-blue-600 text-white' 
                                            : 'text-slate-300 hover:text-white hover:bg-slate-700'
                                    }`}
                                >
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </div>
        </div>
    );
};

export default PublicTournamentHeader;