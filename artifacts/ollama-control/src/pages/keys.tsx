import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Copy, KeyRound, Plus, ShieldAlert, Trash2, X } from 'lucide-react';
import {
  getListControlKeysQueryKey,
  useCreateControlKey,
  useListControlKeys,
  useRevokeControlKey,
} from '@workspace/api-client-react';
import { AdminAccessPanel, controlRequest, useAdminAccess } from '@/components/control-access';
import { Header, Sidebar } from '@/components/page-shell';

function formatDate(value: string | null | undefined) {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function ControlMessage({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'error' }) {
  return <div className={`rounded-xl border px-4 py-3 text-xs ${tone === 'error' ? 'border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.06)] text-[hsl(var(--destructive))]' : 'border-border/70 bg-muted/45 text-muted-foreground'}`} data-testid={`message-control-${tone}`}>{children}</div>;
}

function SecretReveal({ secret, onClose }: { secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="rise-in rounded-2xl border border-[hsl(var(--accent)/.35)] bg-[hsl(var(--accent)/.08)] p-4 sm:p-5" role="status" data-testid="panel-created-secret">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent)/.16)] text-[hsl(var(--accent))]"><KeyRound className="size-4" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="text-sm font-bold">Copy this key now</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">The secret is shown once. After you close this notice, only its prefix will remain visible.</p></div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-[hsl(var(--accent)/.12)] hover:text-foreground" aria-label="Close secret notice" data-testid="button-close-secret"><X className="size-4" /></button>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[hsl(var(--accent)/.25)] bg-background/70 p-2">
            <code className="mono min-w-0 flex-1 truncate px-1 text-[11px]" data-testid="text-created-secret">{secret}</code>
            <button type="button" onClick={() => void copy()} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[hsl(var(--accent))] px-2.5 py-2 text-[10px] font-bold text-[hsl(var(--accent-foreground))] hover:opacity-90" data-testid="button-copy-created-secret">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? 'Copied' : 'Copy key'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateKeyForm({ disabled, onCreated, adminKey }: { disabled: boolean; onCreated: (secret: string) => void; adminKey: string }) {
  const [name, setName] = useState('');
  const [neverExpire, setNeverExpire] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const create = useCreateControlKey({ request: controlRequest(adminKey) });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || create.isPending) return;
    create.mutate({ data: { name: name.trim(), expiresAt: neverExpire || !expiresAt ? null : new Date(expiresAt).toISOString() } }, {
      onSuccess: (result) => { onCreated(result.secret); setName(''); setExpiresAt(''); setNeverExpire(true); },
    });
  };
  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Create API key">
      <div>
        <label htmlFor="key-name" className="text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">Key name</label>
        <input id="key-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="e.g. local editor" disabled={disabled || create.isPending} className="field-focus mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-50" data-testid="input-key-name" />
      </div>
      <div>
        <div className="flex items-center justify-between"><label htmlFor="key-expiry" className="text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">Expiry</label><label className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground"><input type="checkbox" checked={neverExpire} onChange={(event) => setNeverExpire(event.target.checked)} disabled={disabled || create.isPending} className="accent-[hsl(var(--primary))]" data-testid="input-key-never-expire" /> Never expires</label></div>
        <input id="key-expiry" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} disabled={disabled || neverExpire || create.isPending} className="field-focus mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-45" data-testid="input-key-expiry" />
      </div>
      {create.isError && <p className="text-xs text-[hsl(var(--destructive))]" role="alert" data-testid="error-create-key">Could not create this key. Check the admin key and try again.</p>}
      <button type="submit" disabled={disabled || !name.trim() || create.isPending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-3 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-create-key"><Plus className="size-4" />{create.isPending ? 'Creating key…' : 'Create API key'}</button>
    </form>
  );
}

function KeysTable({ keys, onRevoke, revoking }: { keys: any[]; onRevoke: (id: string) => void; revoking: string }) {
  if (!keys.length) return <div className="flex flex-col items-center justify-center px-5 py-14 text-center"><div className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><KeyRound className="size-5" /></div><h3 className="mt-4 text-sm font-bold">No gateway keys yet</h3><p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">Create a scoped key for an editor, automation job, or local assistant. Secrets are never listed here.</p></div>;
  return (
    <div className="divide-y divide-border/60">
      {keys.map((item) => (
        <div key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" data-testid={`row-control-key-${item.id}`}>
          <div className="flex min-w-0 items-start gap-3"><div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${item.isActive ? 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]' : 'bg-muted text-muted-foreground'}`}><KeyRound className="size-4" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-xs font-bold">{item.name}</p><span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.1em] ${item.isActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>{item.isActive ? 'Active' : 'Revoked'}</span></div><p className="mono mt-1 text-[10px] text-muted-foreground">{item.keyPrefix} · created {formatDate(item.createdAt)}</p><p className="mt-1 text-[10px] text-muted-foreground">Expires {formatDate(item.expiresAt)} · {item.requestCount} requests{item.lastUsedAt ? ` · last used ${formatDate(item.lastUsedAt)}` : ''}</p></div></div>
          {item.isActive && <button type="button" onClick={() => onRevoke(item.id)} disabled={revoking === item.id} className="inline-flex shrink-0 items-center justify-center gap-1.5 self-end rounded-lg border border-[hsl(var(--destructive)/.22)] px-2.5 py-2 text-[10px] font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.06)] disabled:opacity-50 sm:self-center" data-testid={`button-revoke-key-${item.id}`}><Trash2 className="size-3.5" />{revoking === item.id ? 'Revoking…' : 'Revoke'}</button>}
        </div>
      ))}
    </div>
  );
}

export default function KeysPage() {
  const queryClient = useQueryClient();
  const { adminKey, setAdminKey } = useAdminAccess();
  const [menuOpen, setMenuOpen] = useState(false);
  const [secret, setSecret] = useState('');
  const [revoking, setRevoking] = useState('');
  const keysQuery = useListControlKeys({ request: controlRequest(adminKey), query: { queryKey: getListControlKeysQueryKey(), enabled: Boolean(adminKey), retry: false } });
  const revoke = useRevokeControlKey({ request: controlRequest(adminKey) });
  const keys = useMemo(() => keysQuery.data || [], [keysQuery.data]);
  const handleRevoke = (id: string) => {
    if (!window.confirm('Revoke this gateway key? Existing clients using it will stop working.')) return;
    setRevoking(id);
    revoke.mutate({ id }, { onSettled: () => { setRevoking(''); void queryClient.invalidateQueries({ queryKey: getListControlKeysQueryKey() }); } });
  };
  return (
    <div className="noise app-shell flex min-h-[100dvh]">
      {menuOpen && <button type="button" className="fixed inset-0 z-30 bg-foreground/20 md:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu" data-testid="button-menu-overlay" />}
      <div className={`${menuOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:hidden`}><Sidebar onClose={() => setMenuOpen(false)} /></div>
      <div className="hidden md:block"><Sidebar /></div>
      <main className="min-w-0 flex-1">
        <Header eyebrow="Control plane" title="API keys" onMenu={() => setMenuOpen(true)} />
        <div className="mx-auto max-w-[1260px] space-y-5 px-4 py-5 sm:px-8 sm:py-7">
          <div className="rise-in"><AdminAccessPanel adminKey={adminKey} onChange={setAdminKey} /></div>
          {secret && <SecretReveal secret={secret} onClose={() => setSecret('')} />}
          {!adminKey && <ControlMessage>Enter the operator key above to inspect or manage gateway credentials.</ControlMessage>}
          {adminKey && keysQuery.isError && <ControlMessage tone="error">The control plane rejected this request. Verify the operator key, then retry.</ControlMessage>}
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
            <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-sm)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4"><div><div className="flex items-center gap-2"><KeyRound className="size-4 text-[hsl(var(--primary))]" /><h2 className="text-sm font-bold">Gateway credentials</h2></div><p className="mt-1 text-[11px] text-muted-foreground">Prefixes and activity are visible. Secret values are intentionally absent.</p></div><span className="mono rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">{adminKey ? `${keys.length} ${keys.length === 1 ? 'key' : 'keys'}` : 'locked'}</span></div>
              {keysQuery.isLoading && adminKey && <div className="space-y-3 p-5"><div className="skeleton h-14 rounded-xl" /><div className="skeleton h-14 rounded-xl" /></div>}
              {adminKey && !keysQuery.isLoading && !keysQuery.isError && <KeysTable keys={keys} onRevoke={handleRevoke} revoking={revoking} />}
              {!adminKey && <div className="flex flex-col items-center justify-center px-5 py-14 text-center"><ShieldAlert className="size-6 text-[hsl(var(--accent))]" /><p className="mt-3 text-xs font-semibold">Admin access is required</p><p className="mt-1 max-w-xs text-[11px] leading-relaxed text-muted-foreground">This page will not make control requests until a session key is provided.</p></div>}
            </section>
            <aside className="rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-sm)]"><div className="mb-4 flex items-center gap-2"><Plus className="size-4 text-[hsl(var(--accent))]" /><h2 className="text-sm font-bold">Issue a key</h2></div><p className="mb-5 text-[11px] leading-relaxed text-muted-foreground">Name each credential by its job. Use an expiry for anything that should not live forever.</p><CreateKeyForm disabled={!adminKey} adminKey={adminKey} onCreated={setSecret} /></aside>
          </div>
          <footer className="border-t border-border/60 pb-3 pt-4 text-[10px] text-muted-foreground"><span>Ollama/Control · credential access stays in your hands.</span></footer>
        </div>
      </main>
    </div>
  );
}