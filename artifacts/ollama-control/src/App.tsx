import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  Box,
  Check,
  ChevronRight,
  CircleHelp,
  Clipboard,
  CloudOff,
  Code2,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  KeyRound,
  Menu,
  MessageSquare,
  Network,
  RefreshCw,
  Send,
  Server,
  Settings2,
  TerminalSquare,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import {
  getGetOllamaStatusQueryKey,
  getHealthCheckQueryKey,
  getListOllamaCatalogQueryKey,
  getListOllamaModelsQueryKey,
  useCreateOllamaChatCompletion,
  useGetOllamaStatus,
  useHealthCheck,
  useListOllamaCatalog,
  useListOllamaModels,
  usePullOllamaModel,
} from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';
import KeysPage from '@/pages/keys';
import ToolsPage from '@/pages/tools';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import './index.css';

const queryClient = new QueryClient();

type ChatLine = { role: 'user' | 'assistant'; content: string };

function extractAssistantText(result: unknown) {
  if (typeof result !== 'string') {
    const response = result as { choices?: Array<{ message?: { content?: string } }> };
    return response.choices?.[0]?.message?.content || 'The model returned an empty response.';
  }

  const chunks = result
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6))
    .filter((line) => line !== '[DONE]')
    .flatMap((line) => {
      try {
        const chunk = JSON.parse(line) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        return [chunk.choices?.[0]?.delta?.content || ''];
      } catch {
        return [];
      }
    })
    .join('');

  return chunks || result;
}

function formatSize(size: number | null | undefined) {
  if (!size) return '—';
  if (size > 1_000_000_000) return `${(size / 1_000_000_000).toFixed(1)} GB`;
  return `${(size / 1_000_000).toFixed(0)} MB`;
}

function formatCreated(created: number) {
  if (!created) return 'unknown';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(created * 1000));
}

function ErrorNotice({ message, onRetry, compact = false }: { message?: string; onRetry: () => void; compact?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.06)] ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <div className="flex min-w-0 items-center gap-2">
        <CloudOff className="size-4 shrink-0 text-[hsl(var(--destructive))]" />
        <p className="truncate text-xs text-[hsl(var(--destructive))]" data-testid="status-error">{message || 'The local service did not respond.'}</p>
      </div>
      <button type="button" onClick={onRetry} className="shrink-0 rounded-lg border border-[hsl(var(--destructive)/.28)] px-2.5 py-1.5 text-[11px] font-semibold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.08)]" data-testid="button-retry">
        Retry
      </button>
    </div>
  );
}

function StatSkeleton() {
  return <div className="h-[76px] rounded-xl border border-border/70 bg-card/60 p-4"><div className="skeleton h-2.5 w-20 rounded-full" /><div className="skeleton mt-3 h-5 w-12 rounded-md" /></div>;
}

function Sidebar({ connected, onClose }: { connected: boolean; onClose?: () => void }) {
  return (
    <aside className="flex h-full w-[246px] shrink-0 flex-col border-r border-border/75 bg-[hsl(39_30%_91%/.72)] px-4 py-5 shadow-xl dark:bg-card/50 md:shadow-none">
      <div className="flex items-center justify-between px-2">
        <Link href="/" className="flex items-center gap-2.5" data-testid="link-home">
          <span className="relative flex size-8 items-center justify-center rounded-[10px] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm">
            <span className="absolute size-3.5 rounded-[4px] border-2 border-current" />
            <span className="absolute size-1.5 rounded-full bg-[hsl(var(--accent))]" />
          </span>
          <span className="text-[14px] font-extrabold tracking-[-.03em]">Ollama<span className="text-[hsl(var(--accent))]">/</span>Control</span>
        </Link>
        {onClose && <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted md:hidden" data-testid="button-close-menu"><X className="size-4" /></button>}
      </div>

      <div className="mt-8 px-2 text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">Workspace</div>
      <nav className="mt-2 space-y-1" aria-label="Main navigation">
        <Link href="/" className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 text-sm font-semibold text-foreground shadow-sm ring-1 ring-border/70" data-testid="link-dashboard">
          <Activity className="size-[17px] text-[hsl(var(--primary))]" /> Dashboard <span className="ml-auto size-1.5 rounded-full bg-[hsl(var(--accent))]" />
        </Link>
        <Link href="/keys" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card/70 hover:text-foreground" data-testid="link-keys">
          <KeyRound className="size-[17px]" /> API keys
        </Link>
        <Link href="/tools" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card/70 hover:text-foreground" data-testid="link-tools">
          <TerminalSquare className="size-[17px]" /> Tools
        </Link>
        <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card/70 hover:text-foreground" onClick={() => document.getElementById('models')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-models-nav">
          <Box className="size-[17px]" /> Models <span className="mono ml-auto text-[10px] text-muted-foreground">⌘ M</span>
        </button>
        <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card/70 hover:text-foreground" onClick={() => document.getElementById('gateway')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-gateway-nav">
          <Network className="size-[17px]" /> Gateway
        </button>
      </nav>

      <div className="mt-8 px-2 text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">System</div>
      <nav className="mt-2 space-y-1">
        <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card/70 hover:text-foreground" onClick={() => document.getElementById('settings')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-settings-nav">
          <Settings2 className="size-[17px]" /> Settings
        </button>
        <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card/70 hover:text-foreground" onClick={() => window.open('https://ollama.com/library', '_blank')} data-testid="button-docs-nav">
          <CircleHelp className="size-[17px]" /> Documentation <ExternalLink className="ml-auto size-3" />
        </button>
      </nav>

      <div className="mt-auto rounded-2xl border border-border/70 bg-card/65 p-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold"><span className={`size-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-[hsl(var(--destructive))]'}`} /> Local runtime</div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{connected ? 'Ollama is responding on this machine.' : 'Connect Ollama to unlock local inference.'}</p>
        {!connected && <button type="button" className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-2 py-2 text-[11px] font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90" onClick={() => document.getElementById('setup')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-setup-runtime">View setup <ChevronRight className="size-3" /></button>}
      </div>
      <div className="mt-4 flex items-center gap-2 px-2 text-[10px] text-muted-foreground"><span className="mono">v0.4.2</span><span>•</span><span>Local-first</span></div>
    </aside>
  );
}

function Header({ connected, onMenu }: { connected: boolean; onMenu: () => void }) {
  return (
    <header className="flex h-[72px] items-center justify-between border-b border-border/70 px-5 sm:px-8">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onMenu} className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden" data-testid="button-open-menu"><Menu className="size-5" /></button>
        <div>
          <p className="mono text-[10px] font-medium uppercase tracking-[.16em] text-muted-foreground">Local AI cockpit</p>
          <h1 className="mt-0.5 text-base font-bold tracking-[-.025em]">Runtime dashboard</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold sm:flex ${connected ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300' : 'border-[hsl(var(--destructive)/.2)] bg-[hsl(var(--destructive)/.06)] text-[hsl(var(--destructive))]'}`} data-testid="status-runtime">
          {connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}{connected ? 'Connected' : 'Offline'}
        </div>
        <button type="button" className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground" onClick={() => document.getElementById('setup')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-settings-header"><Settings2 className="size-4" /></button>
      </div>
    </header>
  );
}

function StatusStats({ connected, status, health, isLoading }: { connected: boolean; status: any; health: any; isLoading: boolean }) {
  const stats = [
    { label: 'Runtime', value: connected ? 'Online' : 'Offline', note: status?.runtime || 'Waiting for Ollama', icon: Server, tone: connected ? 'text-emerald-600' : 'text-[hsl(var(--destructive))]' },
    { label: 'Installed models', value: status?.modelCount ?? '—', note: connected ? 'available locally' : 'connect to inspect', icon: Box, tone: 'text-[hsl(var(--primary))]' },
    { label: 'API surface', value: health?.status === 'ok' ? 'Ready' : health ? 'Ready' : '—', note: 'OpenAI-compatible', icon: Zap, tone: 'text-[hsl(var(--accent))]' },
    { label: 'Auth', value: status?.apiKeyConfigured ? 'Configured' : 'Local only', note: status?.apiKeyConfigured ? 'gateway key active' : 'no key required', icon: KeyRound, tone: 'text-violet-600' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {isLoading ? stats.map((item) => <StatSkeleton key={item.label} />) : stats.map((item) => (
        <div key={item.label} className="rounded-xl border border-border/75 bg-card/75 p-3.5 shadow-[var(--shadow-sm)]" data-testid={`stat-${item.label.toLowerCase().replace(' ', '-')}`}>
          <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">{item.label}</span><item.icon className={`size-4 ${item.tone}`} /></div>
          <div className={`mt-2 text-[19px] font-extrabold tracking-[-.04em] ${item.tone}`}>{item.value}</div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{item.note}</p>
        </div>
      ))}
    </div>
  );
}

function RuntimeHero({ connected, status, onRetry }: { connected: boolean; status: any; onRetry: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-md)] sm:p-6">
      <div className="absolute -right-16 -top-16 size-52 rounded-full border-[22px] border-[hsl(var(--primary)/.05)]" />
      <div className="absolute right-8 top-8 size-20 rounded-full border border-[hsl(var(--accent)/.14)]" />
      <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-muted-foreground"><span className={`size-2 rounded-full ${connected ? 'animate-[pulse-dot_2s_ease-in-out_infinite] bg-emerald-500' : 'bg-[hsl(var(--destructive))]'}`} /> Runtime health</div>
          <h2 className="mt-3 max-w-lg text-[clamp(1.7rem,4vw,2.8rem)] font-extrabold leading-[1.04] tracking-[-.055em]">{connected ? 'Your models are close.' : 'A quiet cockpit, waiting for Ollama.'}</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{connected ? `Connected to ${status?.endpoint || 'your local endpoint'}${status?.version ? ` · ${status.version}` : ''}. Pick a model and start a private session.` : 'The gateway is running, but Ollama is not responding yet. Follow the short setup path below, then refresh this view.'}</p>
          {!connected && <button type="button" onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90" data-testid="button-reconnect"><RefreshCw className="size-3.5" /> Check again</button>}
        </div>
        <div className="grid-lines relative w-full max-w-[260px] rounded-xl border border-border/70 bg-background/40 p-4 md:w-[260px]">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground"><span>Endpoint</span><TerminalSquare className="size-3.5" /></div>
          <p className="mono mt-3 truncate text-xs font-medium" data-testid="text-endpoint">{status?.endpoint || 'http://localhost:11434'}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground"><span className={`size-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-[hsl(var(--destructive))]'}`} />{connected ? 'Latency nominal' : 'No response'}</div>
        </div>
      </div>
    </section>
  );
}

function InstalledModels({ models, isLoading, isError, onRetry, activeModel, onSelect }: { models: any[]; isLoading: boolean; isError: boolean; onRetry: () => void; activeModel: string; onSelect: (id: string) => void }) {
  return (
    <section id="models" className="rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
        <div><div className="flex items-center gap-2"><Box className="size-4 text-[hsl(var(--primary))]" /><h2 className="text-sm font-bold">Installed locally</h2></div><p className="mt-1 text-[11px] text-muted-foreground">Models available to the gateway right now.</p></div>
        <span className="mono rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground" data-testid="text-models-object">/v1/models</span>
      </div>
      {isLoading && <div className="space-y-3 p-5"><div className="skeleton h-12 rounded-xl" /><div className="skeleton h-12 rounded-xl" /></div>}
      {isError && <div className="p-5"><ErrorNotice message="Could not list installed models." onRetry={onRetry} /></div>}
      {!isLoading && !isError && models.length === 0 && <div className="flex flex-col items-center justify-center px-5 py-12 text-center"><div className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Box className="size-5" /></div><h3 className="mt-4 text-sm font-bold">No models installed</h3><p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">Choose a lightweight model from the catalog below to make it available here.</p><a href="#catalog" className="mt-4 text-xs font-bold text-[hsl(var(--primary))] hover:underline" data-testid="link-browse-catalog">Browse catalog <ArrowUpRight className="ml-1 inline size-3" /></a></div>}
      {!isLoading && !isError && models.length > 0 && <div className="divide-y divide-border/60">{models.map((model) => (
        <button type="button" key={model.id} onClick={() => onSelect(model.id)} className={`flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/45 ${activeModel === model.id ? 'bg-[hsl(var(--primary)/.045)]' : ''}`} data-testid={`row-installed-model-${model.id}`}>
          <div className={`flex size-9 items-center justify-center rounded-xl ${activeModel === model.id ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-muted text-muted-foreground'}`}><Cpu className="size-4" /></div>
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-xs font-bold">{model.id}</p>{activeModel === model.id && <span className="rounded-full bg-[hsl(var(--primary)/.1)] px-1.5 py-0.5 text-[9px] font-bold text-[hsl(var(--primary))]">ACTIVE</span>}</div><p className="mono mt-0.5 truncate text-[10px] text-muted-foreground">{model.ownedBy || 'ollama'} · added {formatCreated(model.created)}</p></div>
          <div className="hidden text-right sm:block"><p className="mono text-[11px] font-medium">{formatSize(model.size)}</p><p className="mt-0.5 text-[10px] text-muted-foreground">disk size</p></div><ChevronRight className="size-4 text-muted-foreground" />
        </button>
      ))}</div>}
    </section>
  );
}

function Catalog({ catalog, isLoading, isError, onRetry, onPull, pulling }: { catalog: any[]; isLoading: boolean; isError: boolean; onRetry: () => void; onPull: (model: string) => void; pulling?: string }) {
  return (
    <section id="catalog" className="rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-4"><div><div className="flex items-center gap-2"><Download className="size-4 text-[hsl(var(--accent))]" /><h2 className="text-sm font-bold">Model catalog</h2></div><p className="mt-1 text-[11px] text-muted-foreground">Small, capable defaults for a laptop or phone-sized workflow.</p></div><span className="rounded-full border border-[hsl(var(--accent)/.25)] bg-[hsl(var(--accent)/.08)] px-2 py-1 text-[10px] font-bold text-[hsl(var(--accent))]">CURATED</span></div>
      {isLoading && <div className="grid gap-3 p-5 sm:grid-cols-2"><div className="skeleton h-40 rounded-xl" /><div className="skeleton h-40 rounded-xl" /></div>}
      {isError && <div className="p-5"><ErrorNotice message="The catalog is temporarily unavailable." onRetry={onRetry} /></div>}
      {!isLoading && !isError && catalog.length === 0 && <div className="p-8 text-center text-xs text-muted-foreground">No catalog entries returned.</div>}
      {!isLoading && !isError && catalog.length > 0 && <div className="grid gap-3 p-4 sm:grid-cols-2">{catalog.map((item) => (
        <article key={item.name} className="group rounded-xl border border-border/70 bg-background/35 p-4 hover:border-[hsl(var(--primary)/.4)] hover:bg-[hsl(var(--primary)/.025)]" data-testid={`card-catalog-${item.name}`}>
          <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold">{item.label || item.name}</h3>{item.recommended && <span className="rounded-full bg-[hsl(var(--accent)/.12)] px-1.5 py-0.5 text-[9px] font-bold text-[hsl(var(--accent))]">PICK</span>}</div><p className="mono mt-1 text-[10px] text-muted-foreground">{item.name} · {item.family} · {item.size}</p></div><button type="button" disabled={pulling === item.name} onClick={() => onPull(item.name)} className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-[hsl(var(--primary)/.35)] hover:text-[hsl(var(--primary))] disabled:opacity-50" data-testid={`button-pull-${item.name}`}>{pulling === item.name ? <RefreshCw className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}</button></div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{item.purpose}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{(item.capabilities || []).map((cap: string) => <span key={cap} className="rounded-md bg-muted px-2 py-1 text-[9px] font-medium text-muted-foreground">{cap}</span>)}</div>
          <p className="mono mt-3 truncate border-t border-border/60 pt-3 text-[10px] text-muted-foreground" title={item.pullCommand}>{item.pullCommand}</p>
        </article>
      ))}</div>}
    </section>
  );
}

function ChatPanel({ models, activeModel, onSelectModel, connected }: { models: any[]; activeModel: string; onSelectModel: (value: string) => void; connected: boolean }) {
  const chat = useCreateOllamaChatCompletion();
  const [input, setInput] = useState('');
  const [stream, setStream] = useState(true);
  const [temperature, setTemperature] = useState(0.4);
  const [maxTokens, setMaxTokens] = useState(512);
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const canSend = Boolean(input.trim() && activeModel && connected && !chat.isPending);

  const send = () => {
    if (!canSend) return;
    const next = [...messages, { role: 'user' as const, content: input.trim() }];
    setMessages(next);
    setInput('');
    chat.mutate({ data: { model: activeModel, messages: next, stream, temperature, max_tokens: maxTokens } }, {
      onSuccess: (result) => {
        setMessages((current) => [...current, { role: 'assistant', content: extractAssistantText(result) }]);
      },
      onError: () => setMessages((current) => [...current, { role: 'assistant', content: 'The gateway could not complete this request. Check that Ollama is running and try again.' }]),
    });
  };

  return (
    <section className="rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4"><div><div className="flex items-center gap-2"><MessageSquare className="size-4 text-[hsl(var(--primary))]" /><h2 className="text-sm font-bold">Quick session</h2></div><p className="mt-1 text-[11px] text-muted-foreground">A small test window for the OpenAI-compatible gateway.</p></div><span className="mono rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">/v1/chat/completions</span></div>
      <div className="min-h-[126px] space-y-3 p-5">
        {messages.length === 0 && <div className="flex min-h-[90px] flex-col items-center justify-center text-center"><div className="flex size-9 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.08)] text-[hsl(var(--primary))]"><Code2 className="size-4" /></div><p className="mt-2 text-xs font-semibold">Send a first prompt</p><p className="mt-1 text-[11px] text-muted-foreground">Try: “Explain this function in one paragraph.”</p></div>}
        {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex gap-2.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[86%] rounded-xl px-3 py-2 text-xs leading-relaxed ${message.role === 'user' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-muted text-foreground'}`} data-testid={`chat-message-${message.role}-${index}`}>{message.content}</div></div>)}
        {chat.isPending && <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><span className="flex gap-1"><i className="size-1.5 animate-bounce rounded-full bg-[hsl(var(--primary))]" /><i className="size-1.5 animate-bounce rounded-full bg-[hsl(var(--primary))] [animation-delay:120ms]" /><i className="size-1.5 animate-bounce rounded-full bg-[hsl(var(--primary))] [animation-delay:240ms]" /></span> Thinking with {activeModel}</div>}
      </div>
      <div className="border-t border-border/70 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2"><select value={activeModel} onChange={(event) => onSelectModel(event.target.value)} className="max-w-[170px] rounded-lg border border-border bg-background px-2.5 py-2 text-[11px] font-semibold outline-none focus:border-[hsl(var(--primary))]" data-testid="select-chat-model"><option value="">Select model</option>{models.map((model) => <option key={model.id} value={model.id}>{model.id}</option>)}</select><label className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-[11px] text-muted-foreground"><input type="checkbox" checked={stream} onChange={(event) => setStream(event.target.checked)} className="accent-[hsl(var(--primary))]" data-testid="input-stream" /> stream</label><label className="mono flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-2 text-[10px] text-muted-foreground"><span>temp</span><input type="number" min="0" max="2" step=".1" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} className="w-8 bg-transparent text-center outline-none" data-testid="input-temperature" /></label><label className="mono flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-2 text-[10px] text-muted-foreground"><span>max</span><input type="number" min="1" step="64" value={maxTokens} onChange={(event) => setMaxTokens(Number(event.target.value))} className="w-12 bg-transparent text-center outline-none" data-testid="input-max-tokens" /></label></div>
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 focus-within:border-[hsl(var(--primary)/.6)]"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder={connected ? 'Ask a local model…' : 'Connect Ollama to start a session'} disabled={!connected} rows={2} className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1 text-xs outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed" data-testid="input-chat-message" /><button type="button" onClick={send} disabled={!canSend} className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-send-chat"><Send className="size-4" /></button></div>
        <p className="mt-2 text-[10px] text-muted-foreground">{stream ? 'Streaming response mode enabled.' : 'Standard JSON response mode.'} <span className="float-right">Enter to send · Shift + Enter for newline</span></p>
      </div>
    </section>
  );
}

function GatewayDetails({ endpoint, apiKeyConfigured, onCopy }: { endpoint: string; apiKeyConfigured: boolean; onCopy: (text: string) => void }) {
  const [copied, setCopied] = useState('');
  const copy = (value: string) => { onCopy(value); setCopied(value); window.setTimeout(() => setCopied(''), 1400); };
  return (
    <section id="gateway" className="rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-sm)]">
      <div className="border-b border-border/70 px-5 py-4"><div className="flex items-center gap-2"><Network className="size-4 text-[hsl(var(--accent))]" /><h2 className="text-sm font-bold">Gateway connection</h2></div><p className="mt-1 text-[11px] text-muted-foreground">Drop this base URL into any OpenAI SDK or local tool.</p></div>
      <div className="space-y-3 p-5">
        <div><p className="mb-1.5 text-[10px] font-bold uppercase tracking-[.13em] text-muted-foreground">Base URL</p><div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5"><span className="mono min-w-0 flex-1 truncate text-xs" data-testid="text-gateway-url">{endpoint}/v1</span><button type="button" onClick={() => copy(`${endpoint}/v1`)} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" data-testid="button-copy-base-url">{copied === `${endpoint}/v1` ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}</button></div></div>
        <div><p className="mb-1.5 text-[10px] font-bold uppercase tracking-[.13em] text-muted-foreground">API key</p><div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5"><KeyRound className="size-3.5 text-muted-foreground" /><span className="mono flex-1 text-xs">{apiKeyConfigured ? 'configured in gateway' : 'not required for local use'}</span><span className={`size-2 rounded-full ${apiKeyConfigured ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} /></div></div>
        <div className="rounded-xl bg-[hsl(221_28%_17%)] p-3.5 text-[hsl(38_30%_92%)]"><div className="mb-2 flex items-center justify-between"><span className="mono text-[10px] text-[hsl(38_30%_92%/.6)]">OPENAI SDK</span><button type="button" onClick={() => copy('export OPENAI_BASE_URL=' + endpoint + '/v1')} className="text-[hsl(38_30%_92%/.65)] hover:text-[hsl(38_30%_92%)]" data-testid="button-copy-command">{copied === `export OPENAI_BASE_URL=${endpoint}/v1` ? <Check className="size-3.5" /> : <Clipboard className="size-3.5" />}</button></div><code className="mono block text-[10px] leading-relaxed text-[hsl(38_30%_92%/.82)]">client = OpenAI(<br />&nbsp;&nbsp;base_url=<span className="text-[hsl(var(--accent))]">“{endpoint}/v1”</span>,<br />&nbsp;&nbsp;api_key=<span className="text-[hsl(var(--accent))]">“ollama”</span>)</code></div>
      </div>
    </section>
  );
}

function SetupPanel() {
  return <section id="setup" className="rounded-2xl border border-[hsl(var(--accent)/.2)] bg-[hsl(var(--accent)/.055)] p-5"><div className="flex items-start gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent)/.14)] text-[hsl(var(--accent))]"><TerminalSquare className="size-4" /></div><div><h2 className="text-sm font-bold">Bring the runtime online</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">Install Ollama on the host that should run your models, then start it once. This dashboard will detect the runtime automatically.</p><div className="mt-4 flex flex-wrap gap-2"><a href="https://ollama.com/download" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--accent))] px-3 py-2 text-[11px] font-bold text-[hsl(var(--accent-foreground))] hover:opacity-90" data-testid="link-download-ollama">Download Ollama <ExternalLink className="size-3" /></a><code className="mono flex items-center rounded-lg border border-[hsl(var(--accent)/.2)] bg-card/60 px-3 py-2 text-[10px] text-muted-foreground">ollama serve</code></div></div></div></section>;
}

function Dashboard() {
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModel, setActiveModel] = useState('');
  const [pulling, setPulling] = useState('');
  const [copyNotice, setCopyNotice] = useState(false);
  const statusQuery = useGetOllamaStatus({ query: { queryKey: getGetOllamaStatusQueryKey(), refetchInterval: 20000 } });
  const healthQuery = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), retry: false } });
  const catalogQuery = useListOllamaCatalog({ query: { queryKey: getListOllamaCatalogQueryKey(), staleTime: 60000 } });
  const modelsQuery = useListOllamaModels({ query: { queryKey: getListOllamaModelsQueryKey(), refetchInterval: 20000 } });
  const pullMutation = usePullOllamaModel();
  const status = statusQuery.data;
  const models = modelsQuery.data?.data || [];
  const catalog = catalogQuery.data || [];
  const connected = Boolean(status?.connected);
  const selectedModel = useMemo(() => activeModel || models[0]?.id || '', [activeModel, models]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getGetOllamaStatusQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListOllamaModelsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getHealthCheckQueryKey() });
  };
  const pull = (model: string) => {
    setPulling(model);
    pullMutation.mutate({ data: { model } }, { onSettled: () => { setPulling(''); void queryClient.invalidateQueries({ queryKey: getListOllamaModelsQueryKey() }); } });
  };
  const copyText = (text: string) => { void navigator.clipboard?.writeText(text); setCopyNotice(true); window.setTimeout(() => setCopyNotice(false), 1400); };
  const endpoint = status?.endpoint || 'http://localhost:11434';
  const gatewayEndpoint = `${window.location.origin}/api`;

  return (
    <div className="noise app-shell flex">
      {menuOpen && <button type="button" className="fixed inset-0 z-30 bg-foreground/20 md:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu" data-testid="button-menu-overlay" />}
      <div className={`${menuOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:block md:translate-x-0`}><Sidebar connected={connected} onClose={() => setMenuOpen(false)} /></div>
      <main className="min-w-0 flex-1">
        <Header connected={connected} onMenu={() => setMenuOpen(true)} />
        <div className="mx-auto max-w-[1450px] px-4 py-5 sm:px-8 sm:py-7">
          <div className="rise-in"><StatusStats connected={connected} status={status} health={healthQuery.data} isLoading={statusQuery.isLoading} /></div>
          <div className="rise-in mt-4 [animation-delay:80ms]"><RuntimeHero connected={connected} status={status} onRetry={refresh} /></div>
          {statusQuery.isError && <div className="rise-in mt-4"><ErrorNotice message="Ollama status could not be read. The setup tools below are still available." onRetry={refresh} /></div>}
          <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
            <div className="rise-in space-y-5 [animation-delay:140ms]">
              <InstalledModels models={models} isLoading={modelsQuery.isLoading} isError={modelsQuery.isError} onRetry={() => void modelsQuery.refetch()} activeModel={selectedModel} onSelect={setActiveModel} />
              <Catalog catalog={catalog} isLoading={catalogQuery.isLoading} isError={catalogQuery.isError} onRetry={() => void catalogQuery.refetch()} onPull={pull} pulling={pulling} />
            </div>
            <div className="rise-in space-y-5 [animation-delay:220ms]">
              <ChatPanel models={models} activeModel={selectedModel} onSelectModel={setActiveModel} connected={connected} />
              <GatewayDetails endpoint={gatewayEndpoint} apiKeyConfigured={Boolean(status?.apiKeyConfigured)} onCopy={copyText} />
              {!connected && <SetupPanel />}
            </div>
          </div>
          <footer id="settings" className="mt-8 flex flex-col justify-between gap-2 border-t border-border/60 pb-3 pt-4 text-[10px] text-muted-foreground sm:flex-row"><span>Ollama/Control · local inference, clearly surfaced.</span><span className="mono">gateway status: {healthQuery.data?.status || 'checking'}</span></footer>
        </div>
      </main>
      {copyNotice && <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-3.5 py-2 text-xs font-semibold text-background shadow-lg rise-in" data-testid="status-copy"><Check className="size-3.5 text-emerald-400" /> Copied to clipboard</div>}
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={Dashboard} /><Route path="/keys" component={KeysPage} /><Route path="/tools" component={ToolsPage} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;