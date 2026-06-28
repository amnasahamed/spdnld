import { useState, useRef, useEffect } from 'react';
import './index.css';

function App() {
  const [url, setUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [logs, setLogs] = useState([]);
  const ws = useRef(null);
  const terminalRef = useRef(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleDownload = () => {
    if (!url.trim()) return;

    setIsDownloading(true);
    setLogs([{ type: 'info', text: 'Initializing connection...' }]);

    // Determine WebSocket URL dynamically based on environment
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.DEV ? 'localhost:8000' : window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws/download`;

    // Connect to WebSocket
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setLogs(prev => [...prev, { type: 'info', text: 'Connected to backend. Starting download...' }]);
      ws.current.send(url);
    };

    ws.current.onmessage = (event) => {
      const message = event.data;
      
      let type = 'info';
      if (message.includes('Error') || message.includes('failed') || message.includes('❌')) {
        type = 'error';
      } else if (message.includes('success') || message.includes('✅') || message.includes('Downloaded')) {
        type = 'success';
      }

      setLogs(prev => [...prev, { type, text: message }]);

      if (message.includes('✅') || message.includes('❌')) {
        setIsDownloading(false);
      }
    };

    ws.current.onerror = (error) => {
      setLogs(prev => [...prev, { type: 'error', text: 'WebSocket connection error.' }]);
      setIsDownloading(false);
    };

    ws.current.onclose = () => {
      setIsDownloading(false);
    };
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleDownload();
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>spotDL UI</h1>
        <p>Premium Spotify Downloader</p>
      </div>

      <div className="glass-card">
        <div className="input-group">
          <input
            type="text"
            className="url-input"
            placeholder="Paste Spotify URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDownloading}
          />
          <button 
            className="download-btn" 
            onClick={handleDownload}
            disabled={isDownloading || !url.trim()}
          >
            {isDownloading ? 'Downloading...' : 'Download'}
          </button>
        </div>

        <div className="terminal" ref={terminalRef}>
          {logs.length === 0 ? (
            <div className="terminal-placeholder">
              Ready to download. Enter a Spotify URL and click Download.
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`terminal-line ${log.type}`}>
                {log.text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
