import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { getApiToken, setApiToken } from '../services/api';

// Full-screen access prompt. Invisible unless the backend has API_ACCESS_TOKEN
// configured — the first gated request that comes back 401 fires
// 'api:unauthorized', which is the only thing that opens this gate.
function TokenGate() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(getApiToken());

  useEffect(() => {
    const onUnauthorized = () => setOpen(true);
    window.addEventListener('api:unauthorized', onUnauthorized);
    return () => window.removeEventListener('api:unauthorized', onUnauthorized);
  }, []);

  if (!open) return null;

  const submit = (event) => {
    event.preventDefault();
    if (!value.trim()) return;
    setApiToken(value.trim());
    window.location.reload();
  };

  return (
    <div className="token-gate">
      <form className="token-gate__card" onSubmit={submit}>
        <ShieldAlert size={20} />
        <h2>Access token required</h2>
        <p>This deployment is gated. Enter the access token to continue.</p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Access token"
        />
        <button type="submit">Continue</button>
      </form>
    </div>
  );
}

export default TokenGate;
