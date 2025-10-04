import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface AudioVisualizerProps {
  audioData: Float32Array | null;
  isRecording: boolean;
  color?: string;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioData,
  isRecording,
  color = '#2563eb'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !audioData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Set canvas size
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      if (!isRecording) {
        // Draw flat line when not recording
        ctx.strokeStyle = `${color}44`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.offsetHeight / 2);
        ctx.lineTo(canvas.offsetWidth, canvas.offsetHeight / 2);
        ctx.stroke();
        return;
      }

      // Draw waveform
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const bufferLength = audioData.length;
      const sliceWidth = canvas.offsetWidth / bufferLength;
      let x = 0;

      ctx.beginPath();
      for (let i = 0; i < bufferLength; i++) {
        const v = audioData[i];
        const y = (v + 1) * (canvas.offsetHeight / 2);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();

      // Add glow effect for active recording
      if (isRecording) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.stroke();
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioData, isRecording, color]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100px',
        background: 'linear-gradient(180deg, rgba(37,99,235,0.05) 0%, rgba(37,99,235,0) 100%)',
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid rgba(37,99,235,0.1)',
        p: 1
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </Box>
  );
};

export default AudioVisualizer;