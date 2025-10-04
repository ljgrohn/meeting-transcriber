import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  IconButton,
  Button,
  Typography,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Tooltip,
  Fade,
  CircularProgress,
  SelectChangeEvent,
} from '@mui/material';
import {
  FiberManualRecord as RecordIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  DesktopWindows as SystemIcon,
  DesktopAccessDisabled as SystemOffIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import AudioVisualizer from './AudioVisualizer';
import VolumeLevelIndicator from './VolumeLevelIndicator';
import { AudioRecordingService } from '../services/AudioRecordingService';
import { AudioSource, AudioDevice, AudioLevels } from '../types/audio';

const RecordingControls: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioSource, setAudioSource] = useState<AudioSource>('both');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [microphones, setMicrophones] = useState<AudioDevice[]>([]);
  const [audioLevels, setAudioLevels] = useState<AudioLevels>({ microphone: 0, system: 0 });
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const recordingService = useRef<AudioRecordingService>(new AudioRecordingService());
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMicrophones();
    setupCallbacks();

    return () => {
      if (recordingService.current) {
        recordingService.current.destroy();
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  const loadMicrophones = async () => {
    const devices = await recordingService.current.getAvailableMicrophones();
    setMicrophones(devices);
    if (devices.length > 0) {
      setSelectedMicrophone(devices[0].deviceId);
    }
  };

  const setupCallbacks = () => {
    recordingService.current.setLevelsUpdateCallback((levels) => {
      setAudioLevels(levels);
    });

    recordingService.current.setVisualizationDataCallback((data) => {
      setWaveformData(new Float32Array(data));
    });
  };

  const formatDuration = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    setIsLoading(true);
    try {
      await recordingService.current.startRecording(
        audioSource,
        audioSource !== 'system' ? selectedMicrophone : undefined,
        undefined // System source ID - can be enhanced to allow selection
      );

      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      // Start duration timer
      durationInterval.current = setInterval(() => {
        setDuration(recordingService.current.getCurrentDuration());
      }, 100);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please check your microphone permissions.');
    }
    setIsLoading(false);
  };

  const handleStopRecording = async () => {
    setIsLoading(true);
    try {
      const blob = await recordingService.current.stopRecording();

      // Clear interval
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      setIsRecording(false);
      setIsPaused(false);

      // Save the recording
      await saveRecording(blob);
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
    setIsLoading(false);
  };

  const handlePauseResume = () => {
    if (isPaused) {
      recordingService.current.resumeRecording();
      setIsPaused(false);
    } else {
      recordingService.current.pauseRecording();
      setIsPaused(true);
    }
  };

  const saveRecording = async (blob: Blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const filename = `recording-${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;

    if (window.electronAPI) {
      const result = await window.electronAPI.saveRecording({
        filename,
        buffer: arrayBuffer
      });

      if (result.success) {
        console.log('Recording saved:', result.path);
      }
    }
  };

  const handleAudioSourceChange = (_: React.MouseEvent<HTMLElement>, newSource: AudioSource | null) => {
    if (newSource && !isRecording) {
      setAudioSource(newSource);
    }
  };

  const handleMicrophoneChange = (event: SelectChangeEvent<string>) => {
    setSelectedMicrophone(event.target.value);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        background: 'linear-gradient(135deg, rgba(37,99,235,0.05) 0%, rgba(124,58,237,0.05) 100%)',
        border: '1px solid rgba(37,99,235,0.1)',
        borderRadius: 3,
      }}
    >
      {/* Audio Source Selection */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Audio Source
        </Typography>
        <ToggleButtonGroup
          value={audioSource}
          exclusive
          onChange={handleAudioSourceChange}
          aria-label="audio source"
          sx={{ width: '100%' }}
          disabled={isRecording}
        >
          <ToggleButton value="microphone" sx={{ flex: 1 }}>
            <MicIcon sx={{ mr: 1 }} />
            Microphone Only
          </ToggleButton>
          <ToggleButton value="system" sx={{ flex: 1 }}>
            <SystemIcon sx={{ mr: 1 }} />
            System Audio Only
          </ToggleButton>
          <ToggleButton value="both" sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <MicIcon sx={{ mr: 0.5 }} />
              +
              <SystemIcon sx={{ ml: 0.5, mr: 1 }} />
            </Box>
            Both
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Microphone Selection */}
      {audioSource !== 'system' && (
        <Box sx={{ mb: 4 }}>
          <FormControl fullWidth size="small" disabled={isRecording}>
            <InputLabel>Select Microphone</InputLabel>
            <Select
              value={selectedMicrophone}
              label="Select Microphone"
              onChange={handleMicrophoneChange}
            >
              {microphones.map((mic) => (
                <MenuItem key={mic.deviceId} value={mic.deviceId}>
                  {mic.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Audio Visualizer */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Audio Waveform
        </Typography>
        <AudioVisualizer
          audioData={waveformData}
          isRecording={isRecording}
          color="#2563eb"
        />
      </Box>

      {/* Volume Levels */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Volume Levels
        </Typography>
        <VolumeLevelIndicator
          micLevel={audioLevels.microphone}
          systemLevel={audioLevels.system}
          showMic={audioSource === 'microphone' || audioSource === 'both'}
          showSystem={audioSource === 'system' || audioSource === 'both'}
        />
      </Box>

      {/* Recording Controls */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        {/* Duration Display */}
        <Typography variant="h4" sx={{ fontFamily: 'monospace', color: isRecording ? '#ef4444' : 'text.secondary' }}>
          {formatDuration(duration)}
        </Typography>

        {/* Control Buttons */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* Main Record/Stop Button */}
          <AnimatePresence mode="wait">
            {!isRecording ? (
              <motion.div
                key="record"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                whileTap={{ scale: 0.95 }}
              >
                <Tooltip title="Start Recording">
                  <IconButton
                    onClick={handleStartRecording}
                    disabled={isLoading}
                    sx={{
                      width: 80,
                      height: 80,
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      boxShadow: '0 10px 40px rgba(37, 99, 235, 0.3)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        boxShadow: '0 15px 50px rgba(37, 99, 235, 0.4)',
                        transform: 'translateY(-2px)',
                      },
                      '&:disabled': {
                        opacity: 0.5,
                      },
                    }}
                  >
                    {isLoading ? <CircularProgress size={32} color="inherit" /> : <RecordIcon sx={{ fontSize: 40 }} />}
                  </IconButton>
                </Tooltip>
              </motion.div>
            ) : (
              <motion.div
                key="stop"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                whileTap={{ scale: 0.95 }}
              >
                <Box sx={{ position: 'relative' }}>
                  {/* Pulsing ring animation */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      border: '3px solid #ef4444',
                      animation: 'pulse 1.5s ease-out infinite',
                      '@keyframes pulse': {
                        '0%': {
                          transform: 'translate(-50%, -50%) scale(0.8)',
                          opacity: 1,
                        },
                        '100%': {
                          transform: 'translate(-50%, -50%) scale(1.2)',
                          opacity: 0,
                        },
                      },
                    }}
                  />
                  <Tooltip title="Stop Recording">
                    <IconButton
                      onClick={handleStopRecording}
                      disabled={isLoading}
                      sx={{
                        width: 80,
                        height: 80,
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: 'white',
                        boxShadow: '0 10px 40px rgba(239, 68, 68, 0.3)',
                        position: 'relative',
                        zIndex: 1,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                          boxShadow: '0 15px 50px rgba(239, 68, 68, 0.4)',
                        },
                      }}
                    >
                      {isLoading ? <CircularProgress size={32} color="inherit" /> : <StopIcon sx={{ fontSize: 40 }} />}
                    </IconButton>
                  </Tooltip>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pause/Resume Button */}
          {isRecording && !isLoading && (
            <Fade in={true}>
              <Tooltip title={isPaused ? 'Resume Recording' : 'Pause Recording'}>
                <IconButton
                  onClick={handlePauseResume}
                  sx={{
                    width: 60,
                    height: 60,
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '2px solid rgba(0, 0, 0, 0.1)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 1)',
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  {isPaused ? <PlayIcon sx={{ fontSize: 30 }} /> : <PauseIcon sx={{ fontSize: 30 }} />}
                </IconButton>
              </Tooltip>
            </Fade>
          )}
        </Box>

        {/* Recording Status */}
        {isRecording && (
          <Fade in={true}>
            <Typography variant="body2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: isPaused ? '#f59e0b' : '#ef4444',
                  animation: isPaused ? 'none' : 'blink 1s ease-in-out infinite',
                  '@keyframes blink': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.3 },
                  },
                }}
              />
              {isPaused ? 'Paused' : 'Recording...'}
            </Typography>
          </Fade>
        )}
      </Box>
    </Paper>
  );
};

export default RecordingControls;