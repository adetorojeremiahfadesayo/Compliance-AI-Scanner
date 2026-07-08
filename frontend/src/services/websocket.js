// websocket.js
// Same-origin by default (ws/wss matched to the page protocol), proxied to the
// backend by Vite in dev and nginx in production. Override with VITE_WS_BASE.
const WS_PROTO = window.location.protocol === 'https:' ? 'wss' : 'ws';
const WS_BASE = import.meta.env.VITE_WS_BASE || `${WS_PROTO}://${window.location.host}/ws/analysis`;

export function connectToAnalysis(analysisId, onMessage, onClose) {
  let ws = null;
  let attempts = 0;
  const maxAttempts = 3;
  let closedIntentionally = false;

  function connect() {
    console.log(`Connecting to WebSocket for analysis: ${analysisId} (Attempt: ${attempts + 1})`);
    ws = new WebSocket(`${WS_BASE}/${analysisId}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error("Failed to parse websocket JSON message:", err);
      }
    };

    ws.onclose = (event) => {
      if (closedIntentionally) {
        console.log("WebSocket closed intentionally.");
        if (onClose) onClose();
        return;
      }

      console.warn(`WebSocket closed: ${event.reason}. Status code: ${event.code}`);
      
      if (attempts < maxAttempts) {
        attempts++;
        const delay = Math.pow(2, attempts) * 1000;
        console.log(`Reconnecting in ${delay}ms...`);
        setTimeout(connect, delay);
      } else {
        console.error("WebSocket connection failed after max retries.");
        if (onClose) onClose();
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket encountered an error:", err);
    };
  }

  connect();

  return {
    send(data) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(typeof data === 'string' ? data : JSON.stringify(data));
      } else {
        console.warn("Cannot send message: WebSocket is not open.");
      }
    },
    close() {
      closedIntentionally = true;
      if (ws) ws.close();
    }
  };
}
