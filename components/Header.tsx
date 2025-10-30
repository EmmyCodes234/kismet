import React from 'react';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  return (
    <header className="bg-slate-800/50 backdrop-blur-sm p-4 md:hidden flex items-center border-b border-slate-700">
      <button onClick={toggleSidebar} className="text-gray-200 hover:text-white focus:outline-none">
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="ml-4">
         <h1 className="text-lg font-bold text-white tracking-wider">Kismet</h1>
      </div>
    </header>
  );
};

export default Header;