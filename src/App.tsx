import React, { useState, useEffect } from 'react';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  IconButton,
} from '@mui/material';
import {
  Mic as MicIcon,
  Stop as StopIcon,
  Save as SaveIcon,
  FolderOpen as FolderOpenIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function App() {
  const [tabValue, setTabValue] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [apiKeys, setApiKeys] = useState<{ assemblyai: string; openai: string }>({
    assemblyai: '',
    openai: '',
  });

  useEffect(() => {
    // Load API keys on app start
    loadApiKeys();

    // Listen for menu actions
    if (window.electronAPI) {
      window.electronAPI.onMenuAction((action) => {
        if (action === 'new-recording') {
          handleStartRecording();
        } else if (action === 'open-transcript') {
          handleOpenTranscript();
        }
      });
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('menu-new-recording');
        window.electronAPI.removeAllListeners('menu-open-transcript');
      }
    };
  }, []);

  const loadApiKeys = async () => {
    if (window.electronAPI) {
      const keys = await window.electronAPI.getApiKeys();
      setApiKeys(keys);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setError('');
    // Recording logic will be implemented later
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsProcessing(true);
    // Stop recording and process audio
    // This will be implemented with the audio recording module
    setTimeout(() => {
      setIsProcessing(false);
      setTranscript('Sample transcript text will appear here after recording implementation.');
      setSummary('Meeting summary will be generated here.');
    }, 2000);
  };

  const handleSaveTranscript = async () => {
    if (!transcript) {
      setError('No transcript to save');
      return;
    }

    if (window.electronAPI) {
      const data = {
        filename: `transcript-${new Date().toISOString().split('T')[0]}.json`,
        content: JSON.stringify({ transcript, summary, date: new Date().toISOString() }, null, 2),
      };

      const result = await window.electronAPI.saveTranscript(data);
      if (result.success) {
        setError('');
        alert(`Transcript saved to: ${result.path}`);
      } else if (!result.cancelled) {
        setError(result.error || 'Failed to save transcript');
      }
    }
  };

  const handleOpenTranscript = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.openTranscript();
      if (result.success && result.content) {
        try {
          const data = JSON.parse(result.content);
          setTranscript(data.transcript || '');
          setSummary(data.summary || '');
          setTabValue(1); // Switch to transcript tab
        } catch (err) {
          setError('Failed to parse transcript file');
        }
      } else if (!result.cancelled) {
        setError(result.error || 'Failed to open transcript');
      }
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Meeting Transcriber
          </Typography>
          <IconButton color="inherit">
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Paper elevation={3} sx={{ mb: 3, p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={isRecording ? <StopIcon /> : <MicIcon />}
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isProcessing}
              color={isRecording ? 'error' : 'primary'}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSaveTranscript}
              disabled={!transcript || isProcessing}
            >
              Save Transcript
            </Button>
            <Button
              variant="outlined"
              startIcon={<FolderOpenIcon />}
              onClick={handleOpenTranscript}
              disabled={isRecording || isProcessing}
            >
              Open Transcript
            </Button>
          </Box>

          {isProcessing && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Processing audio...</Typography>
            </Box>
          )}
        </Paper>

        <Paper elevation={3}>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Recording Status" />
            <Tab label="Transcript" disabled={!transcript} />
            <Tab label="Summary" disabled={!summary} />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              Recording Status
            </Typography>
            <Typography>
              {isRecording ? 'Recording in progress...' :
               isProcessing ? 'Processing audio...' :
               transcript ? 'Recording complete and processed.' :
               'Ready to record. Click "Start Recording" to begin.'}
            </Typography>
            {!apiKeys.assemblyai && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                AssemblyAI API key not configured. Please add it to your .env file.
              </Alert>
            )}
            {!apiKeys.openai && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                OpenAI API key not configured. Please add it to your .env file.
              </Alert>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Transcript
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, minHeight: 300 }}>
              <Typography style={{ whiteSpace: 'pre-wrap' }}>
                {transcript || 'No transcript available'}
              </Typography>
            </Paper>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, minHeight: 300 }}>
              <Typography style={{ whiteSpace: 'pre-wrap' }}>
                {summary || 'No summary available'}
              </Typography>
            </Paper>
          </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
}

export default App;