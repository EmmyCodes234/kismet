import React from 'react';
import { NavLink, useNavigate, useParams, Link } from 'react-router-dom';
import { Tournament } from '../types';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onLogout: () => void;
  tournament: Tournament | null;
  userIsHeadTd: boolean;
}

const NavIcon: React.FC<{ path: string }> = ({ path }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, onLogout, tournament, userIsHeadTd }) => {
  const navigate = useNavigate();
  const { tournamentId } = useParams<{tournamentId: string}>();

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
    setIsOpen(false);
  };

  const baseLinkClasses = "flex items-center px-4 py-3 text-gray-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors duration-200";
  const activeLinkClasses = "bg-cool-blue-700 text-white";

  return (
    <>
      <aside className={`fixed z-30 inset-y-0 left-0 w-64 bg-slate-800 p-4 flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex no-print ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="flex items-center mb-8">
            <h1 className="text-2xl font-bold text-white tracking-wider">Kismet</h1>
          </div>
          <nav className="space-y-2">
            <NavLink to="/dashboard" onClick={() => setIsOpen(false)} className={({ isActive }) => `${baseLinkClasses} ${!tournamentId && isActive ? activeLinkClasses : ''}`}>
              <NavIcon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6" />
              <span className="ml-3">My Tournaments</span>
            </NavLink>
            
            {tournament && (
              <>
                <hr className="border-slate-700 my-4" />
                <p className="px-4 text-xs text-gray-400 uppercase tracking-wider">Manage Tournament</p>
                <NavLink to={`/tournament/${tournament.id}/dashboard`} onClick={() => setIsOpen(false)} className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                  <NavIcon path="M4 6h16M4 12h16M4 18h16" />
                  <span className="ml-3">Dashboard</span>
                </NavLink>
                <NavLink to={`/tournament/${tournament.id}/players`} onClick={() => setIsOpen(false)} className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                    <NavIcon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a3.001 3.001 0 015.644 0M11 14a3 3 0 11-6 0 3 3 0 016 0zm10 0a3 3 0 11-6 0 3 3 0 016 0z" />
                    <span className="ml-3">Players</span>
                </NavLink>
                <NavLink to={`/tournament/${tournament.id}/pairings`} onClick={() => setIsOpen(false)} className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                    <NavIcon path="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <span className="ml-3">Pairings</span>
                </NavLink>
                <NavLink to={`/tournament/${tournament.id}/enter-scores`} onClick={() => setIsOpen(false)} className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                  <NavIcon path="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  <span className="ml-3">Score Entry</span>
                </NavLink>
                <NavLink to={`/tournament/${tournament.id}/standings`} onClick={() => setIsOpen(false)} className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                  <NavIcon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  <span className="ml-3">Standings</span>
                </NavLink>
                <NavLink to={`/tournament/${tournament.id}/wall-chart`} onClick={() => setIsOpen(false)} className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                  <NavIcon path="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  <span className="ml-3">Wall Chart</span>
                </NavLink>
                {userIsHeadTd && (
                  <>
                    {tournament?.status === 'Not Started' && (
                        <NavLink to={`/tournament/${tournament.id}/pairing-scheduler`} onClick={() => setIsOpen(false)} className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                          <NavIcon path="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                          <span className="ml-3">Pairing Scheduler</span>
                        </NavLink>
                    )}
                    <NavLink to={`/tournament/${tournament.id}/settings`} onClick={() => setIsOpen(false)} className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                      <NavIcon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <span className="ml-3">Settings</span>
                    </NavLink>
                    <NavLink to={`/tournament/${tournament.id}/audit-log`} onClick={() => setIsOpen(false)} className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                      <NavIcon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      <span className="ml-3">Audit Log</span>
                    </NavLink>
                    {tournament?.status === 'Completed' && (
                        <NavLink to={`/tournament/${tournament.id}/ratings-report`} onClick={() => setIsOpen(false)} className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                            <NavIcon path="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            <span className="ml-3">Ratings Report</span>
                        </NavLink>
                    )}
                  </>
                )}

                <hr className="border-slate-700 my-4" />
                 <p className="px-4 text-xs text-gray-400 uppercase tracking-wider">Public View</p>
                <Link to={`/public/t/${tournament.slug}`} target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)} className={baseLinkClasses}>
                  <NavIcon path="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  <span className="ml-3">Public Link</span>
                </Link>
              </>
            )}
          </nav>
        </div>
        <div>
          <button onClick={handleLogoutClick} className={`${baseLinkClasses} w-full`}>
            <NavIcon path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            <span className="ml-3">Logout</span>
          </button>
        </div>
      </aside>
      {isOpen && <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/50 z-20 md:hidden"></div>}
    </>
  );
};

export default Sidebar;
