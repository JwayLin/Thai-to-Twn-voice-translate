import React, { useState, useCallback, useRef } from 'react';
import { ConnectionState, TranscriptionItem } from './types';
import { GeminiLiveService } from './services/geminiLiveService';
import Controls from './components/Controls';
import AudioVisualizer from './components/AudioVisualizer';
import TranscriptionLog from './components/TranscriptionLog';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);
  
  const serviceRef = useRef<GeminiLiveService | null>(null);

  // Helper to update transcription history safely
  const handleTranscription = useCallback((text: string, isUser: boolean, isFinal: boolean) => {
    setTranscriptionHistory(prev => {
      const now = new Date();
      // Logic to group streaming text or create new bubbles
      // For simplicity in this demo, if we receive text, we append or update the last one if it matches sender
      // However, since the API sends chunks, we often want to debounce or append.
      // A simple strategy: If the last message is from same sender and less than 1 second old, append.
      // BUT: Gemini Live API sends "inputTranscription" and "outputTranscription" updates.
      
      // Strategy: Always add new bubble for significant chunks or just log everything linearly for now.
      // To make it cleaner, let's just add everything as a new item if it's not empty.
      if (!text.trim()) return prev;

      const newItem: TranscriptionItem = {
        id: Date.now().toString() + Math.random().toString(),
        text: text,
        sender: isUser ? 'user' : 'model',
        timestamp: now,
        isFinal: isFinal
      };
      
      return [...prev, newItem];
    });
  }, []);

  const handleConnect = async () => {
    setErrorMsg(null);
    setConnectionState(ConnectionState.CONNECTING);
    
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key is missing in environment.");
      }

      const service = new GeminiLiveService(apiKey);
      serviceRef.current = service;

      const analyser = await service.connect(
        handleTranscription,
        (err) => {
           console.error(err);
           setConnectionState(ConnectionState.ERROR);
           setErrorMsg("Connection interrupted. Please try again.");
           handleDisconnect();
        }
      );

      setAudioAnalyser(analyser);
      setConnectionState(ConnectionState.CONNECTED);

    } catch (e) {
      console.error(e);
      setConnectionState(ConnectionState.ERROR);
      setErrorMsg((e as Error).message || "Failed to connect to microphone or API.");
      setAudioAnalyser(null);
    }
  };

  const handleDisconnect = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.disconnect();
      serviceRef.current = null;
    }
    setConnectionState(ConnectionState.DISCONNECTED);
    setAudioAnalyser(null);
  }, []);

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-slate-50 font-sans text-gray-900 relative overflow-hidden">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-4 shadow-md z-10 flex-none">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
               {/* Icon representing translation/voice */}
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
               </svg>
            </div>
            <div>
               <h1 className="font-bold text-lg leading-tight">Thai ⇄ Taiwanese</h1>
               <p className="text-emerald-100 text-xs">Gemini Live Interpreter</p>
            </div>
          </div>
          
          <div className={`h-3 w-3 rounded-full ${connectionState === ConnectionState.CONNECTED ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-red-400'}`} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto relative overflow-hidden">
        
        {/* Error Banner */}
        {errorMsg && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2 animate-fadeIn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            {errorMsg}
          </div>
        )}

        {/* Chat Log */}
        <TranscriptionLog items={transcriptionHistory} />

        {/* Visualizer overlay at bottom */}
        <div className="flex-none p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-8 pb-6">
          <div className="mb-6">
            <AudioVisualizer 
              analyser={audioAnalyser} 
              isActive={connectionState === ConnectionState.CONNECTED} 
            />
          </div>

          <Controls 
            connectionState={connectionState}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
          
          <p className="text-center text-gray-400 text-xs mt-4">
            Supported on iPhone (iOS 15+) and modern browsers.
          </p>
        </div>
      </main>
    </div>
  );
};

export default App;