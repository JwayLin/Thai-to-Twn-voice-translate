import React from 'react';
import { ConnectionState } from '../types';

interface ControlsProps {
  connectionState: ConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
}

const Controls: React.FC<ControlsProps> = ({ connectionState, onConnect, onDisconnect }) => {
  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;

  return (
    <div className="flex flex-col gap-4 w-full max-w-xs mx-auto z-20">
      {!isConnected ? (
        <button
          onClick={onConnect}
          disabled={isConnecting}
          className={`
            w-full py-4 rounded-full font-bold text-lg shadow-lg transition-all transform active:scale-95
            flex items-center justify-center gap-2
            ${isConnecting 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'}
          `}
        >
          {isConnecting ? (
            <>
              <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Starting...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
              Start Translation
            </>
          )}
        </button>
      ) : (
        <button
          onClick={onDisconnect}
          className="w-full py-4 bg-red-500 text-white rounded-full font-bold text-lg shadow-lg hover:bg-red-600 transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-red-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          End Session
        </button>
      )}
    </div>
  );
};

export default Controls;