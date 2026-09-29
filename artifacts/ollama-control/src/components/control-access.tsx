import { KeyRound, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';

const STORAGE_KEY = 'ollama-control-admin-key';

export function useAdminAccess() {
  const [adminKey, setAdminKeyState] = useState(() => {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const setAdminKey = (value: string) => {
    setAdminKeyState(value);
    try {
      if (value) window.sessionStorage.setItem(STORAGE_KEY, value);
      else window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Session storage can be unavailable in hardened browser contexts.
    }
  };

  return { adminKey, setAdminKey };
}

export function controlRequest(adminKey: string): RequestInit | undefined {
  return adminKey ? { headers: { Authorization: `Bearer ${adminKey}` } } : undefined;
}

export function AdminAccessPanel({ adminKey, onChange }: { adminKey: string; onChange: (value: string) => void }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <section className="rounded-2xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.045)] p-4 sm:p-5" aria-labelledby="admin-access-title">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.13)] text-[hsl(var(--primary))]"><ShieldCheck className="size-4" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="admin-access-title" className="text-sm font-bold">Operator access</h2>
            <span className="rounded-full border border-[hsl(var(--primary)/.22)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.12em] text-[hsl(var(--primary))]">session only</span>
           </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">Control actions require the gateway admin bearer key. It stays in this browser session and is never sent to Ollama.</p>
          <form className="field-focus mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5" onSubmit={(event) => event.preventDefault()}>
            <LockKeyhole className="size-3.5 shrink-0 text-muted-foreground" />
            <label htmlFor="admin-access-key" className="sr-only">Gateway admin bearer key</label>
            <input id="admin-access-key" type={revealed ? 'text' : 'password'} value={adminKey} onChange={(event) => onChange(event.target.value)} placeholder="Paste admin bearer key" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" data-testid="input-admin-access-key" autoComplete="off" />
            <button type="button" onClick={() => setRevealed((value) => !value)} className="shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground" data-testid="button-toggle-admin-key">{revealed ? 'Hide' : 'Show'}</button>
            {adminKey && <button type="button" onClick={() => onChange('')} className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Clear admin key" data-testid="button-clear-admin-key"><X className="size-3.5" /></button>}
           </form>
           <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground"><KeyRound className="size-3" />{adminKey ? 'Admin key ready for control requests.' : 'Add a key to unlock this control surface.'}</div>
        </div>
      </div>
    </section>
  );
}