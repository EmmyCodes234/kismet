import React, { createContext, useState, useEffect, ReactNode } from 'react';

interface WebSocketContextType {
  updateCount: number;
}

export const WebSocketContext = createContext<WebSocketContextType>({ updateCount: 0 });

interface WebSocketProviderProps {
  children: ReactNode;
  tournamentId: string;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children, tournamentId }) => {
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => {
    if (!tournamentId) return;

    const channel = new BroadcastChannel(`tournament-updates-${tournamentId}`);
    
    const handleMessage = () => {
      console.log(`Realtime update received for tournament ${tournamentId}`);
      setUpdateCount(count => count + 1);
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [tournamentId]);

  return (
    <WebSocketContext.Provider value={{ updateCount }}>
      {children}
    </WebSocketContext.Provider>
  );
};
