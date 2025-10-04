import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  DesktopWindows as WindowIcon,
  DesktopMac as ScreenIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface SystemAudioSource {
  id: string;
  name: string;
  thumbnail: string;
}

interface SystemAudioSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectSource: (sourceId: string) => void;
}

const SystemAudioSelector: React.FC<SystemAudioSelectorProps> = ({
  open,
  onClose,
  onSelectSource,
}) => {
  const [sources, setSources] = useState<SystemAudioSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>('');

  useEffect(() => {
    if (open) {
      loadSources();
    }
  }, [open]);

  const loadSources = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const availableSources = await window.electronAPI.getDesktopSources();
        setSources(availableSources);
      }
    } catch (error) {
      console.error('Failed to load sources:', error);
    }
    setLoading(false);
  };

  const handleSelectSource = (sourceId: string) => {
    setSelectedSource(sourceId);
  };

  const handleConfirm = () => {
    if (selectedSource) {
      onSelectSource(selectedSource);
      onClose();
    }
  };

  const getSourceIcon = (name: string) => {
    // Check if it's a screen share or window
    if (name.toLowerCase().includes('entire screen') || name.toLowerCase().includes('screen')) {
      return <ScreenIcon />;
    }
    return <WindowIcon />;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Select Audio Source</Typography>
        <Button
          onClick={onClose}
          size="small"
          sx={{ minWidth: 'auto', p: 0.5 }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose a window or screen to capture audio from:
            </Typography>
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {sources.map((source) => (
                <ListItem key={source.id} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => handleSelectSource(source.id)}
                    selected={selectedSource === source.id}
                    sx={{
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: selectedSource === source.id ? 'primary.main' : 'divider',
                      '&:hover': {
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: 60,
                          height: 60,
                          mr: 2,
                          bgcolor: 'background.default',
                        }}
                      >
                        {source.thumbnail ? (
                          <img
                            src={source.thumbnail}
                            alt={source.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                            }}
                          />
                        ) : (
                          getSourceIcon(source.name)
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={source.name}
                      secondary={source.name.includes('Screen') ? 'Entire Screen' : 'Application Window'}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button onClick={onClose} variant="outlined">
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                variant="contained"
                disabled={!selectedSource}
              >
                Start Recording
              </Button>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SystemAudioSelector;