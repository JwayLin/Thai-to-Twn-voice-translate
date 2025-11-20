import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyser, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!analyser || !isActive || !canvasRef.current) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      // Clear canvas
      const canvas = canvasRef.current;
      if(canvas) {
          const ctx = canvas.getContext('2d');
          if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dynamic styling
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#34d399'); // emerald-400
      gradient.addColorStop(1, '#059669'); // emerald-600
      ctx.fillStyle = gradient;

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      // Draw mirroring bars from center
      const centerX = canvas.width / 2;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        // Draw bars symmetrically
        ctx.fillRect(centerX + x, (canvas.height - barHeight) / 2, barWidth, barHeight);
        ctx.fillRect(centerX - x - barWidth, (canvas.height - barHeight) / 2, barWidth, barHeight);

        x += barWidth + 1;
        if (x > centerX) break; 
      }
    };

    draw();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, isActive]);

  return (
    <div className="w-full h-32 flex items-center justify-center bg-emerald-50 rounded-xl overflow-hidden shadow-inner border border-emerald-100">
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={100} 
        className="w-full h-full opacity-80"
      />
    </div>
  );
};

export default AudioVisualizer;