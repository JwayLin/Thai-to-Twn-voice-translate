import React, { useEffect, useRef } from 'react';
import { TranscriptionItem } from '../types';

interface TranscriptionLogProps {
  items: TranscriptionItem[];
}

const TranscriptionLog: React.FC<TranscriptionLogProps> = ({ items }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items]);

  return (
    <div className="flex-1 w-full overflow-y-auto p-4 space-y-4 mb-4">
      {items.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center opacity-60">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3.75h9m-9 3.75h9m-9 3.75h9m1.5-13.5H5.25A2.25 2.25 0 003 6v13.5c0 1.243.908 2.25 2.25 2.25h13.5A2.25 2.25 0 0021 19.5V6a2.25 2.25 0 00-2.25-2.25z" />
          </svg>
          <p>Tap "Start" to begin translating between Thai and Taiwanese Hokkien.</p>
        </div>
      )}
      
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}
        >
          <div
            className={`
              max-w-[85%] px-4 py-3 rounded-2xl text-sm md:text-base shadow-sm
              ${item.sender === 'user' 
                ? 'bg-emerald-600 text-white rounded-br-none' 
                : 'bg-white border border-emerald-100 text-gray-800 rounded-bl-none'}
            `}
          >
            {item.text}
          </div>
          <span className="text-[10px] text-gray-400 mt-1 px-1">
             {item.sender === 'user' ? 'You' : 'Translator'} • {item.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};

export default TranscriptionLog;