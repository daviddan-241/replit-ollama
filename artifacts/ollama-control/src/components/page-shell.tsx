import { Activity, Box, CircleHelp, ExternalLink, KeyRound, Menu, Network, Settings2, TerminalSquare, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export function Sidebar({ connected, onClose }: { connected?: boolean; onClose?: () => void }) {
  const [location] = useLocation();
  const active = (path: string) => location === path;
  return (
    <aside className="flex h-full w-[246px] shrink-0 flex-col border-r border-border/75 bg-[hsl(39_30%_91%/.72)] px-4 py-5 shadow-xl dark:bg-card/50 md:shadow-none">
      <div className="flex items-center justify-between px-2">
        <Link href="/" className="flex items-center gap-2.5" data-testid="link-home">
          <span className="relative flex size-8 items-center justify-center rounded-[10px] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm"><span className="absolute size-3.5 rounded-[4px] border-2 border-current" /><span className="absolute size-1.5 rounded-full bg-[hsl(var(--accent))]" /></span>
          <span className="text-[14px] font-extrabold tracking-[-.03em]">Ollama<span className="text-[hsl(var(--accent))]">/</span>Control</span>
        </Link>
        {onClose && <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted md:hidden" data-testid="button-close-menu"><X className="size-4" /></button>}
      </div>
      <div className="mt-8 px-2 text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">Workspace</div>
      <nav className="mt-2 space-y-1" aria-label="Main navigation">
        <Link href="/" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${active('/') ? 'bg-card text-foreground shadow-sm ring-1 ring-border/70' : 'text-muted-foreground hover:bg-card/70 hover:text-foreground'}`} data-testid="link-dashboard"><Activity className={`size-[17px] ${active('/') ? 'text-[hsl(var(--primary))]' : ''}`} /> Dashboard {active('/') && <span className="ml-auto size-1.5 rounded-full bg-[hsl(var(--accent))]" />}</Link>
        <Link href="/keys" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active('/keys') ? 'bg-card font-semibold text-foreground shadow-sm ring-1 ring-border/70' : 'text-muted-foreground hover:bg-card/70 hover:text-foreground'}`} data-testid="link-keys"><KeyRound className={`size-[17px] ${active('/keys') ? 'text-[hsl(var(--primary))]' : ''}`} /> API keys {active('/keys') && <span className="ml-auto size-1.5 rounded-full bg-[hsl(var(--accent))]" />}</Link>
        <Link href="/tools" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active('/tools') ? 'bg-card font-semibold text-foreground shadow-sm ring-1 ring-border/70' : 'text-muted-foreground hover:bg-card/70 hover:text-foreground'}`} data-testid="link-tools"><TerminalSquare className={`size-[17px] ${active('/tools') ? 'text-[hsl(var(--accent))]' : ''}`} /> Tools {active('/tools') && <span className="ml-auto size-1.5 rounded-full bg-[hsl(var(--accent))]" />}</Link>
        <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card/70 hover:text-foreground" onClick={() => document.getElementById('models')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-models-nav"><Box className="size-[17px]" /> Models <span className="mono ml-auto text-[10px] text-muted-foreground">⌘ M</span></button>
        <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card/70 hover:text-foreground" onClick={() => document.getElementById('gateway')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-gateway-nav"><Network className="size-[17px]" /> Gateway</button>
      </nav>
      <div className="mt-8 px-2 text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">System</div>
      <nav className="mt-2 space-y-1">
        <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card/70 hover:text-foreground" onClick={() => document.getElementById('settings')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-settings-nav"><Settings2 className="size-[17px]" /> Settings</button>
        <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card/70 hover:text-foreground" onClick={() => window.open('https://ollama.com/library', '_blank')} data-testid="button-docs-nav"><CircleHelp className="size-[17px]" /> Documentation <ExternalLink className="ml-auto size-3" /></button>
      </nav>
      <div className="mt-auto rounded-2xl border border-border/70 bg-card/65 p-3.5"><div className="flex items-center gap-2 text-xs font-semibold"><span className={`size-2 rounded-full ${connected === undefined ? 'bg-muted-foreground/45' : connected ? 'bg-emerald-500' : 'bg-[hsl(var(--destructive))]'}`} /> Local runtime</div><p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{connected === undefined ? 'Runtime status is shown on the dashboard.' : connected ? 'Ollama is responding on this machine.' : 'Connect Ollama to unlock local inference.'}</p></div>
      <div className="mt-4 flex items-center gap-2 px-2 text-[10px] text-muted-foreground"><span className="mono">v0.4.2</span><span>•</span><span>Local-first</span></div>
    </aside>
  );
}

export function Header({ eyebrow, title, onMenu }: { eyebrow: string; title: string; onMenu?: () => void }) {
  return <header className="flex h-[72px] items-center justify-between border-b border-border/70 px-5 sm:px-8"><div className="flex items-center gap-3">{onMenu && <button type="button" onClick={onMenu} className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden" data-testid="button-open-menu"><Menu className="size-5" /></button>}<div><p className="mono text-[10px] font-medium uppercase tracking-[.16em] text-muted-foreground">{eyebrow}</p><h1 className="mt-0.5 text-base font-bold tracking-[-.025em]">{title}</h1></div></div><div className="flex items-center gap-2"><span className="hidden items-center gap-2 rounded-full border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.06)] px-3 py-1.5 text-[11px] font-semibold text-[hsl(var(--primary))] sm:flex"><span className="status-pulse size-1.5 rounded-full bg-[hsl(var(--primary))]" /> local-first</span><button type="button" onClick={() => window.open('https://ollama.com/library', '_blank')} className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground" aria-label="Open Ollama documentation" data-testid="button-header-docs"><ExternalLink className="size-4" /></button></div></header>;
}