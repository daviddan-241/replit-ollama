import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, ArrowUpRight, Globe2, LockKeyhole, Play, RotateCcw, TerminalSquare } from 'lucide-react';
import { useExecuteSafeCommand, useFetchPublicWebPage } from '@workspace/api-client-react';
import { AdminAccessPanel, controlRequest, useAdminAccess } from '@/components/control-access';
import { Header, Sidebar } from '@/components/page-shell';

function ToolError({ children }: { children: string }) {
  return <div className="rounded-xl border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.06)] px-3 py-2.5 text-xs text-[hsl(var(--destructive))]" role="alert" data-testid="error-tool">{children}</div>;
}

function WebFetchTool({ adminKey }: { adminKey: string }) {
  const [url, setUrl] = useState('');
  const web = useFetchPublicWebPage({ request: controlRequest(adminKey) });
  const result = web.data;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!url.trim() || web.isPending) return;
    web.mutate({ data: { url: url.trim() } });
  };
  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-sm)]">
      <div className="border-b border-border/70 px-5 py-4"><div className="flex items-center gap-2"><Globe2 className="size-4 text-[hsl(var(--primary))]" /><h2 className="text-sm font-bold">Public web fetch</h2></div><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Retrieve a public HTTP(S) page for inspection without exposing the host network.</p></div>
      <form onSubmit={submit} className="space-y-3 p-5">
        <div className="field-focus flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5"><Globe2 className="size-3.5 shrink-0 text-muted-foreground" /><label htmlFor="web-url" className="sr-only">Public page URL</label><input id="web-url" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} disabled={!adminKey || web.isPending} placeholder="https://example.com/docs" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground disabled:opacity-50" data-testid="input-web-url" /><button type="submit" disabled={!adminKey || !url.trim() || web.isPending} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-2.5 py-2 text-[10px] font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-fetch-web"><ArrowUpRight className="size-3.5" />{web.isPending ? 'Fetching…' : 'Fetch'}</button></div>
        {!adminKey && <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><LockKeyhole className="size-3" />Operator access unlocks tool execution.</p>}
        {web.isError && <ToolError>Fetch failed. Only public HTTP(S) destinations are accepted.</ToolError>}
      </form>
      {web.isPending && <div className="space-y-2 border-t border-border/60 p-5"><div className="skeleton h-3 w-1/3 rounded-full" /><div className="skeleton h-3 w-full rounded-full" /><div className="skeleton h-3 w-4/5 rounded-full" /></div>}
      {result && !web.isPending && <div className="border-t border-border/60 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="mono truncate text-[10px] text-muted-foreground">{result.url}</p><p className="mt-1 text-xs font-semibold">HTTP {result.status}{result.contentType ? ` · ${result.contentType}` : ''}</p></div><button type="button" onClick={() => { setUrl(''); web.reset(); }} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-[10px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground" data-testid="button-clear-web-result"><RotateCcw className="size-3.5" /> Clear</button></div><pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[hsl(221_28%_17%)] p-4 text-[10px] leading-relaxed text-[hsl(38_30%_92%/.82)]" data-testid="text-web-result">{result.text}</pre></div>}
      {!result && !web.isPending && !web.isError && <div className="px-5 pb-5 text-[10px] text-muted-foreground">Result text will appear here after a successful fetch.</div>}
    </section>
  );
}

function TerminalTool({ adminKey }: { adminKey: string }) {
  const [commandText, setCommandText] = useState('');
  const terminal = useExecuteSafeCommand({ request: controlRequest(adminKey) });
  const response = terminal.data;
  const tokens = useMemo(() => commandText.trim().split(/\s+/).filter(Boolean).slice(0, 6), [commandText]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adminKey || !tokens.length || terminal.isPending) return;
    terminal.mutate({ data: { command: tokens } });
  };
  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-sm)]">
      <div className="border-b border-border/70 px-5 py-4"><div className="flex items-center gap-2"><TerminalSquare className="size-4 text-[hsl(var(--accent))]" /><h2 className="text-sm font-bold">Constrained terminal</h2></div><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Run one allowlisted command as an array of arguments inside the server sandbox.</p></div>
      <form onSubmit={submit} className="space-y-3 p-5">
        <div className="console-grid field-focus flex items-center gap-2 rounded-xl border border-[hsl(38_30%_92%/.15)] px-3 py-2.5"><span className="mono text-xs text-[hsl(var(--accent))]">$</span><label htmlFor="safe-command" className="sr-only">Constrained command</label><input id="safe-command" value={commandText} onChange={(event) => setCommandText(event.target.value.replace(/[;&|`$<>]/g, ''))} disabled={!adminKey || terminal.isPending} placeholder="ls -la" className="mono min-w-0 flex-1 bg-transparent text-xs text-[hsl(38_30%_92%)] outline-none placeholder:text-[hsl(38_30%_92%/.42)] disabled:opacity-50" data-testid="input-safe-command" /><button type="submit" disabled={!adminKey || !tokens.length || terminal.isPending} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[hsl(var(--accent))] px-2.5 py-2 text-[10px] font-bold text-[hsl(var(--accent-foreground))] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-execute-command"><Play className="size-3.5" />{terminal.isPending ? 'Running…' : 'Run'}</button></div>
        <div className="flex items-start gap-2 rounded-xl border border-[hsl(var(--accent)/.2)] bg-[hsl(var(--accent)/.06)] p-3 text-[10px] leading-relaxed text-muted-foreground"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[hsl(var(--accent))]" /><span>No apt, arbitrary shell syntax, private-network access, or host secret access. The server decides which command tokens are allowed.</span></div>
        {terminal.isError && <ToolError>Command rejected. Use a single safe command and check the operator key.</ToolError>}
      </form>
      {terminal.isPending && <div className="space-y-2 border-t border-border/60 p-5"><div className="skeleton h-3 w-1/2 rounded-full" /><div className="skeleton h-20 rounded-xl" /></div>}
      {response && !terminal.isPending && <div className="border-t border-border/60 p-5"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[.1em] ${response.exitCode === 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]'}`}>{response.exitCode === 0 ? 'Completed' : `Exit ${response.exitCode ?? 'unknown'}`}</span><span className="mono text-[10px] text-muted-foreground">{response.command.join(' ')}</span></div><div className="mt-3 overflow-hidden rounded-xl bg-[hsl(221_28%_17%)]"><pre className="max-h-[260px] min-h-[72px] overflow-auto whitespace-pre-wrap break-words p-4 text-[10px] leading-relaxed text-[hsl(38_30%_92%/.82)]" data-testid="text-command-stdout">{response.stdout || '(no stdout)'}</pre>{response.stderr && <pre className="border-t border-[hsl(38_30%_92%/.1)] p-4 text-[10px] leading-relaxed text-[hsl(var(--accent))]" data-testid="text-command-stderr">{response.stderr}</pre>}</div><p className="mt-2 text-[10px] text-muted-foreground">{response.note} · network access: {response.networkAccess ? 'enabled by policy' : 'disabled'}</p></div>}
      {!response && !terminal.isPending && !terminal.isError && <div className="px-5 pb-5 text-[10px] text-muted-foreground">Command output will appear here. Arguments are capped before the request leaves this page.</div>}
    </section>
  );
}

export default function ToolsPage() {
  const { adminKey, setAdminKey } = useAdminAccess();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="noise app-shell flex min-h-[100dvh]">
      {menuOpen && <button type="button" className="fixed inset-0 z-30 bg-foreground/20 md:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu" data-testid="button-menu-overlay" />}
      <div className={`${menuOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:hidden`}><Sidebar onClose={() => setMenuOpen(false)} /></div>
      <div className="hidden md:block"><Sidebar /></div>
      <main className="min-w-0 flex-1">
        <Header eyebrow="Controlled tools" title="Tools console" onMenu={() => setMenuOpen(true)} />
        <div className="mx-auto max-w-[1260px] space-y-5 px-4 py-5 sm:px-8 sm:py-7">
          <div className="rise-in"><AdminAccessPanel adminKey={adminKey} onChange={setAdminKey} /></div>
          <section className="rounded-2xl border border-[hsl(var(--accent)/.25)] bg-[hsl(var(--accent)/.06)] p-4 sm:p-5"><div className="flex items-start gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent)/.13)] text-[hsl(var(--accent))]"><AlertTriangle className="size-4" /></div><div><h2 className="text-sm font-bold">Boundaries are the feature</h2><p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">These tools are deliberately narrow. Web fetch is limited to public pages with SSRF protections. Terminal execution is sandboxed and allowlisted; it cannot install packages, chain shell syntax, reach private networks, or read host secrets.</p></div></div></section>
          <div className="grid items-start gap-5 xl:grid-cols-2"><WebFetchTool adminKey={adminKey} /><TerminalTool adminKey={adminKey} /></div>
          <footer className="border-t border-border/60 pb-3 pt-4 text-[10px] text-muted-foreground"><span>Ollama/Control · inspect first, execute narrowly.</span></footer>
        </div>
      </main>
    </div>
  );
}