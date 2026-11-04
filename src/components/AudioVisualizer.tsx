import React, { useRef, useEffect } from 'react';
import { VisualizerMode } from '../types/music';

interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
  mode: VisualizerMode;
  accentColor?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analyserNode,
  isPlaying,
  mode,
  accentColor = '#f59e0b', // amber-500
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (mode === 'off') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);
    let idleAngle = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (analyserNode && isPlaying) {
        if (mode === 'wave') {
          analyserNode.getByteTimeDomainData(dataArray);
        } else {
          analyserNode.getByteFrequencyData(dataArray);
        }
      } else {
        // Idle ambient subtle movement if paused
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = isPlaying
            ? Math.floor(Math.sin(idleAngle + i * 0.2) * 40 + 60)
            : Math.floor(Math.sin(idleAngle + i * 0.1) * 10 + 15);
        }
        idleAngle += 0.05;
      }

      if (mode === 'bars') {
        const barCount = 36;
        const barWidth = (width / barCount) - 2;

        for (let i = 0; i < barCount; i++) {
          const index = Math.floor((i / barCount) * (bufferLength / 2));
          const val = dataArray[index] || 0;
          const barHeight = Math.max(3, (val / 255) * (height - 6));
          const x = i * (barWidth + 2);
          const y = height - barHeight;

          // Gradient for bars
          const grad = ctx.createLinearGradient(0, height, 0, 0);
          grad.addColorStop(0, accentColor);
          grad.addColorStop(1, '#ec4899'); // pink-500

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
          ctx.fill();
        }
      } else if (mode === 'wave') {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = accentColor;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else if (mode === 'circle') {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) * 0.5;
        const count = 32;

        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const val = dataArray[i * 2] || 0;
          const barLen = Math.max(4, (val / 255) * 24);

          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          const x2 = centerX + Math.cos(angle) * (radius + barLen);
          const y2 = centerY + Math.sin(angle) * (radius + barLen);

          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [analyserNode, isPlaying, mode, accentColor]);

  if (mode === 'off') return null;

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={48}
      className="w-full h-12 rounded-lg opacity-80"
    />
  );
};
