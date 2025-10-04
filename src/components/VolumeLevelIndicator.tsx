import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { Mic as MicIcon, DesktopWindows as SystemIcon } from '@mui/icons-material';

interface VolumeLevelIndicatorProps {
  micLevel: number;
  systemLevel: number;
  showMic: boolean;
  showSystem: boolean;
}

const VolumeLevelIndicator: React.FC<VolumeLevelIndicatorProps> = ({
  micLevel,
  systemLevel,
  showMic,
  showSystem,
}) => {
  const getVolumeColor = (level: number) => {
    if (level > 80) return '#ef4444';
    if (level > 60) return '#f59e0b';
    return '#22c55e';
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
      {showMic && (
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <MicIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Microphone
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={micLevel}
            sx={{
              height: 8,
              borderRadius: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 1,
                backgroundColor: getVolumeColor(micLevel),
                transition: 'all 0.1s ease'
              }
            }}
          />
        </Box>
      )}

      {showSystem && (
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <SystemIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              System Audio
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={systemLevel}
            sx={{
              height: 8,
              borderRadius: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 1,
                backgroundColor: getVolumeColor(systemLevel),
                transition: 'all 0.1s ease'
              }
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default VolumeLevelIndicator;