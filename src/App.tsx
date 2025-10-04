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
  Grid,
} from '@mui/material';
import {
  Save as SaveIcon,
  FolderOpen as FolderOpenIcon,
  Settings as SettingsIcon,
  GraphicEq as AudioIcon,
} from '@mui/icons-material';
import RecordingControls from './components/RecordingControls';

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
        if (action === 'open-transcript') {
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
    <Box sx={{ flexGrow: 1, bgcolor: '#f8f9fa', minHeight: '100vh' }}>
      <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        <Toolbar>
          <AudioIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Meeting Transcriber
          </Typography>
          <IconButton color="inherit">
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Recording Controls Section */}
          <Grid item xs={12} md={5}>
            <RecordingControls />

            {/* Action Buttons */}
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<SaveIcon />}
                onClick={handleSaveTranscript}
                disabled={!transcript}
              >
                Save Transcript
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<FolderOpenIcon />}
                onClick={handleOpenTranscript}
              >
                Open Transcript
              </Button>
            </Box>

            {/* API Key Status */}
            <Box sx={{ mt: 3 }}>
              {!apiKeys.assemblyai && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  AssemblyAI API key not configured
                </Alert>
              )}
              {!apiKeys.openai && (
                <Alert severity="warning">
                  OpenAI API key not configured
                </Alert>
              )}
              {apiKeys.assemblyai && apiKeys.openai && (
                <Alert severity="success">
                  All API keys configured
                </Alert>
              )}
            </Box>
          </Grid>

          {/* Transcript and Summary Section */}
          <Grid item xs={12} md={7}>
            <Paper elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2 }}>
              <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Recording Info" />
                <Tab label="Transcript" disabled={!transcript} />
                <Tab label="Summary" disabled={!summary} />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Recording Information
                  </Typography>
                  <Typography color="text.secondary" paragraph>
                    This application allows you to record both microphone and system audio simultaneously.
                  </Typography>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Features:
                  </Typography>
                  <ul style={{ marginLeft: '20px', color: '#666' }}>
                    <li>Record microphone, system audio, or both</li>
                    <li>Real-time waveform visualization</li>
                    <li>Volume level monitoring</li>
                    <li>Pause and resume recording</li>
                    <li>Automatic transcription with AssemblyAI</li>
                    <li>AI-powered summarization with OpenAI</li>
                  </ul>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Instructions:
                  </Typography>
                  <ol style={{ marginLeft: '20px', color: '#666' }}>
                    <li>Select your audio source (mic, system, or both)</li>
                    <li>Choose your microphone if recording mic audio</li>
                    <li>Click the record button to start</li>
                    <li>Recording will be saved automatically</li>
                    <li>Transcription will begin after recording stops</li>
                  </ol>
                </Box>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Box sx={{ p: 2, minHeight: 400 }}>
                  <Typography variant="h6" gutterBottom>
                    Transcript
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, minHeight: 300, bgcolor: '#fafafa' }}>
                    <Typography style={{ whiteSpace: 'pre-wrap' }}>
                      {transcript || 'No transcript available. Record audio to generate a transcript.'}
                    </Typography>
                  </Paper>
                </Box>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <Box sx={{ p: 2, minHeight: 400 }}>
                  <Typography variant="h6" gutterBottom>
                    Summary
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, minHeight: 300, bgcolor: '#fafafa' }}>
                    <Typography style={{ whiteSpace: 'pre-wrap' }}>
                      {summary || 'No summary available. A summary will be generated after transcription.'}
                    </Typography>
                  </Paper>
                </Box>
              </TabPanel>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default App;