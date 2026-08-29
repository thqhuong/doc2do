import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type FormEvent, type ReactNode } from "react";
import type { ActionItem, AnalysisResponse, Deadline, Doc2DoResult, SourceRef } from "@doc2do/contracts";
import { createAnalysis, type AnalysisInput } from "./api";
import { DEMO_CONTEXT, demoAnalysis } from "./demo-data";
import { buildGoogleCalendarUrl, downloadIcs, type CalendarEventDraft } from "./ics";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PLAN_SESSION_KEY = "doc2do.current-plan.v1";
const ACCEPTED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"]);
const PROCESS_STAGES = [
  { label: "Reading your document", detail: "Finding headings, dates, links, and requirements" },
  { label: "Understanding what applies", detail: "Comparing the source with your optional context" },
  { label: "Building your action plan", detail: "Prioritizing tasks and connecting every claim to evidence" },
  { label: "Checking the details", detail: "Validating dates, links, uncertainty, and source references" },
] as const;

type Screen = "input" | "processing" | "result";
type InputMode = "upload" | "text";
type IconName =
  | "arrow"
  | "calendar"
  | "check"
  | "chevron"
  | "copy"
  | "edit"
  | "file"
  | "lock"
  | "sparkle"
  | "source"
  | "upload"
  | "warning"
  | "x";

interface ActionState {
  title: string;
  complete: boolean;
}

interface SavedPlan {
  analysis: AnalysisResponse;
  actionStates: Record<string, ActionState>;
}

interface EvidenceSelection {
  title: string;
  refs: string[];
  state?: ActionItem["evidence_state"];
  confidence?: ActionItem["confidence"];
}

export function validateFile(file: File): string | null {
  const acceptedExtension = /\.(pdf|jpe?g|png|webp|txt)$/i.test(file.name);
  if ((!file.type && !acceptedExtension) || (file.type && !ACCEPTED_TYPES.has(file.type))) {
    return "Choose a PDF, JPEG, PNG, WebP, or text file.";
  }
  if (file.size > MAX_FILE_SIZE) return "That file is over 10 MB. Try a smaller file or paste the text instead.";
  return null;
}

function loadSavedPlan(): SavedPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.sessionStorage.getItem(PLAN_SESSION_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<SavedPlan>;
    const actions = parsed.analysis?.result?.actions;
    if (parsed.analysis?.status !== "complete" || !Array.isArray(actions)) return null;

    return {
      analysis: parsed.analysis,
      actionStates: Object.fromEntries(actions.map((action) => {
        const state = parsed.actionStates?.[action.id];
        return [action.id, {
          title: typeof state?.title === "string" && state.title.trim() ? state.title : action.title,
          complete: state?.complete === true,
        }];
      })),
    };
  } catch {
    window.sessionStorage.removeItem(PLAN_SESSION_KEY);
    return null;
  }
}

function App() {
  const [savedPlan] = useState(loadSavedPlan);
  const [screen, setScreen] = useState<Screen>(savedPlan ? "result" : "input");
  const [inputMode, setInputMode] = useState<InputMode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(savedPlan?.analysis ?? null);
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>(savedPlan?.actionStates ?? {});
  const [evidence, setEvidence] = useState<EvidenceSelection | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => () => clearProcessing(), []);

  useEffect(() => {
    if (screen !== "result" || !analysis) return;
    window.sessionStorage.setItem(PLAN_SESSION_KEY, JSON.stringify({ analysis, actionStates } satisfies SavedPlan));
  }, [actionStates, analysis, screen]);

  const result = analysis?.result ?? null;
  const progress = result
    ? Math.round((Object.values(actionStates).filter((item) => item.complete).length / Math.max(result.actions.length, 1)) * 100)
    : 0;

  function clearProcessing() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    abortRef.current?.abort();
    abortRef.current = null;
  }

  function selectFile(candidate: File) {
    const validationError = validateFile(candidate);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setError(null);
    setFile(candidate);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) selectFile(dropped);
  }

  async function runAnalysis(input: AnalysisInput | "demo") {
    clearProcessing();
    setError(null);
    setStage(0);
    setScreen("processing");
    const controller = new AbortController();
    abortRef.current = controller;
    [650, 1300, 1950].forEach((delay, index) => {
      timersRef.current.push(window.setTimeout(() => setStage(index + 1), delay));
    });

    try {
      const minimumDelay = new Promise((resolve) => window.setTimeout(resolve, 2550));
      const request = input === "demo" ? Promise.resolve(demoAnalysis) : createAnalysis(input, controller.signal);
      const [response] = await Promise.all([request, minimumDelay]);
      if (controller.signal.aborted) return;
      setAnalysis(response);
      setActionStates(
        Object.fromEntries(response.result.actions.map((action) => [action.id, { title: action.title, complete: false }])),
      );
      setScreen("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setScreen("input");
    } finally {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
      abortRef.current = null;
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (inputMode === "upload") {
      if (!file) {
        setError("Add a document first, or try the sample.");
        return;
      }
      void runAnalysis({ kind: "file", file, context });
      return;
    }
    if (text.trim().length < 20) {
      setError("Paste at least a few sentences so Doc2Do has enough context to analyze.");
      return;
    }
    void runAnalysis({ kind: "text", text: text.trim(), context });
  }

  function runDemo() {
    setContext(DEMO_CONTEXT);
    void runAnalysis("demo");
  }

  function cancelAnalysis() {
    clearProcessing();
    setScreen("input");
  }

  function reset() {
    window.sessionStorage.removeItem(PLAN_SESSION_KEY);
    setScreen("input");
    setAnalysis(null);
    setActionStates({});
    setFile(null);
    setText("");
    setContext("");
    setEvidence(null);
    setCalendarOpen(false);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleAction(actionId: string) {
    setActionStates((current) => ({
      ...current,
      [actionId]: {
        title: current[actionId]?.title ?? "Action",
        complete: !current[actionId]?.complete,
      },
    }));
  }

  function renameAction(actionId: string, title: string) {
    setActionStates((current) => ({
      ...current,
      [actionId]: {
        title: title.trim() || current[actionId]?.title || "Action",
        complete: current[actionId]?.complete ?? false,
      },
    }));
    setEditingActionId(null);
  }

  async function copyChecklist() {
    if (!result) return;
    const checklist = result.actions
      .map((action) => `${actionStates[action.id]?.complete ? "[x]" : "[ ]"} ${actionStates[action.id]?.title ?? action.title}`)
      .join("\n");
    await navigator.clipboard.writeText(`${result.document.title}\n\n${checklist}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="app-shell">
      <Header onReset={reset} hasResult={screen === "result"} />
      <main>
        {screen === "input" && (
          <Landing
            inputMode={inputMode}
            setInputMode={setInputMode}
            file={file}
            onFile={selectFile}
            text={text}
            setText={setText}
            context={context}
            setContext={setContext}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            onDrop={onDrop}
            onSubmit={submit}
            onDemo={runDemo}
            error={error}
          />
        )}
        {screen === "processing" && <Processing stage={stage} onCancel={cancelAnalysis} />}
        {screen === "result" && result && (
          <ResultView
            result={result}
            mode={analysis?.mode ?? "gemini"}
            states={actionStates}
            progress={progress}
            editingActionId={editingActionId}
            setEditingActionId={setEditingActionId}
            toggleAction={toggleAction}
            renameAction={renameAction}
            openEvidence={setEvidence}
            onCopy={() => void copyChecklist()}
            copied={copied}
            openCalendar={() => setCalendarOpen(true)}
          />
        )}
      </main>
      <Footer />
      {result && evidence && (
        <EvidenceDrawer selection={evidence} result={result} onClose={() => setEvidence(null)} />
      )}
      {result && calendarOpen && (
        <CalendarModal result={result} onClose={() => setCalendarOpen(false)} />
      )}
    </div>
  );
}

function Header({ onReset, hasResult }: { onReset: () => void; hasResult: boolean }) {
  return (
    <header className="site-header">
      <button className="wordmark" onClick={onReset} aria-label="Doc2Do home">
        <span className="wordmark-mark" aria-hidden="true"><span /><span /><span /></span>
        <span>Doc<span>2</span>Do</span>
      </button>
      <div className="header-actions">
        {hasResult && <button className="text-button" onClick={onReset}>New document</button>}
        <span className="privacy-pill"><Icon name="lock" /> Files aren't stored</span>
      </div>
    </header>
  );
}

interface LandingProps {
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  file: File | null;
  onFile: (file: File) => void;
  text: string;
  setText: (text: string) => void;
  context: string;
  setContext: (context: string) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  onDrop: (event: DragEvent<HTMLLabelElement>) => void;
  onSubmit: (event: FormEvent) => void;
  onDemo: () => void;
  error: string | null;
}

function Landing(props: LandingProps) {
  const {
    inputMode, setInputMode, file, onFile, text, setText, context, setContext,
    isDragging, setIsDragging, onDrop, onSubmit, onDemo, error,
  } = props;
  return (
    <>
      <section className="hero content-width">
        <div className="hero-copy">
          <p className="eyebrow"><span>AI Riser Vietnam 2026</span> · Built with Gemini</p>
          <h1>From confusing<br />document to <em>done.</em></h1>
          <p className="hero-lead">
            Upload any notice, form, or screenshot. Doc2Do finds what matters, shows where it came from,
            and turns it into a plan you can act on.
          </p>
          <div className="trust-row" aria-label="Product benefits">
            <span><Icon name="source" /> Source-backed</span>
            <span><Icon name="check" /> Clear next steps</span>
            <span><Icon name="calendar" /> Deadline-ready</span>
          </div>
        </div>
        <div className="hero-side" aria-hidden="true">
          <div className="paper-stack paper-back" />
          <div className="paper-stack paper-front">
            <div className="paper-kicker">SCHOLARSHIP NOTICE</div>
            <div className="paper-line long" /><div className="paper-line medium" />
            <div className="paper-highlight">Deadline · 12 Sep, 17:00</div>
            <div className="paper-line long" /><div className="paper-line short" />
            <div className="paper-check"><span>✓</span> 4 clear actions</div>
          </div>
          <svg className="hero-arrow" viewBox="0 0 92 52"><path d="M3 17C26 3 46 4 61 16c7 6 8 16 2 21-7 6-16-1-12-9 5-11 23-10 36-7" /><path d="m78 14 10 7-10 7" /></svg>
        </div>
      </section>

      <section className="workspace-section" id="analyze">
        <div className="content-width workspace-grid">
          <form className="upload-card" onSubmit={onSubmit} noValidate>
            <div className="card-heading">
              <div><span className="step-number">01</span><h2>Add your document</h2></div>
              <span className="card-note">No sign-in needed</span>
            </div>
            <div className="input-tabs" role="tablist" aria-label="Document input method">
              <button type="button" role="tab" aria-selected={inputMode === "upload"} onClick={() => setInputMode("upload")}>Upload file</button>
              <button type="button" role="tab" aria-selected={inputMode === "text"} onClick={() => setInputMode("text")}>Paste text</button>
            </div>

            {inputMode === "upload" ? (
              <label
                className={`drop-zone ${isDragging ? "is-dragging" : ""} ${file ? "has-file" : ""}`}
                onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false); }}
                onDrop={onDrop}
              >
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,application/pdf,image/jpeg,image/png,image/webp,text/plain"
                  onChange={(event) => { const selected = event.target.files?.[0]; if (selected) onFile(selected); }}
                />
                <span className="drop-icon"><Icon name={file ? "file" : "upload"} /></span>
                {file ? (
                  <>
                    <strong>{file.name}</strong>
                    <span>{formatBytes(file.size)} · Ready to analyze</span>
                    <small>Choose another file</small>
                  </>
                ) : (
                  <>
                    <strong>Drop your document here</strong>
                    <span>or <u>browse your files</u></span>
                    <small>PDF, JPEG, PNG, WebP, or TXT · Max 10 MB</small>
                  </>
                )}
              </label>
            ) : (
              <div className="paste-field">
                <label htmlFor="document-text">Document text</label>
                <textarea
                  id="document-text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Paste the notice, email, or instructions here…"
                  rows={8}
                />
                <span>{text.length.toLocaleString()} characters</span>
              </div>
            )}

            <div className="context-field">
              <label htmlFor="user-context"><span className="step-number">02</span>Tell us what applies to you <small>Optional</small></label>
              <p>One sentence helps Doc2Do assess eligibility without guessing.</p>
              <textarea
                id="user-context"
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="e.g. I am a third-year CS student with a 3.4 GPA…"
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="data-use-note">
              <Icon name="lock" />
              <p>
                <strong>Doc2Do does not store your document.</strong> Gemini Free Tier processes it, so do not
                upload sensitive, confidential, or personal information. <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">Review Gemini data terms</a>.
              </p>
            </div>

            {error && <div className="error-banner" role="alert"><Icon name="warning" /><span><strong>We need one small fix</strong>{error}</span></div>}

            <button className="primary-button analyze-button" type="submit">
              Build my action plan <Icon name="arrow" />
            </button>
            <div className="sample-divider"><span>or see it in action</span></div>
            <button className="sample-button" type="button" onClick={onDemo}>
              <Icon name="sparkle" />
              <span><strong>Try the scholarship sample</strong><small>Pre-filled with a fictional Vietnamese notice</small></span>
              <Icon name="arrow" />
            </button>
          </form>

          <aside className="how-card">
            <p className="eyebrow">What you get</p>
            <h2>Not another summary.<br />A plan you can trust.</h2>
            <ol className="how-list">
              <li><span>1</span><div><strong>Understand</strong><p>A plain-language explanation of what the document means for you.</p></div></li>
              <li><span>2</span><div><strong>Verify</strong><p>Tap any critical claim to see the exact source line behind it.</p></div></li>
              <li><span>3</span><div><strong>Act</strong><p>A prioritized checklist, reviewed deadlines, and calendar export.</p></div></li>
            </ol>
            <div className="privacy-note"><Icon name="lock" /><div><strong>Your document is processed transiently</strong><p>Doc2Do does not store the original file by default.</p></div></div>
          </aside>
        </div>
      </section>
    </>
  );
}

function Processing({ stage, onCancel }: { stage: number; onCancel: () => void }) {
  return (
    <section className="processing-view content-width" aria-live="polite">
      <div className="processing-art" aria-hidden="true">
        <div className="scan-paper"><span /><span /><span /><span /></div>
        <div className="scan-line" />
        <div className="orbit orbit-one" /><div className="orbit orbit-two" />
      </div>
      <p className="eyebrow">Turning information into action</p>
      <h1>{PROCESS_STAGES[stage]?.label}</h1>
      <p>{PROCESS_STAGES[stage]?.detail}</p>
      <div className="progress-track" role="progressbar" aria-label="Analysis progress" aria-valuemin={0} aria-valuemax={4} aria-valuenow={stage + 1}>
        <span style={{ width: `${((stage + 1) / 4) * 100}%` }} />
      </div>
      <ol className="stage-list">
        {PROCESS_STAGES.map((item, index) => (
          <li key={item.label} className={index < stage ? "done" : index === stage ? "active" : ""}>
            <span>{index < stage ? "✓" : index + 1}</span>{item.label}
          </li>
        ))}
      </ol>
      <button className="text-button" onClick={onCancel}>Cancel analysis</button>
      <small>Your file is only held while this analysis is running.</small>
    </section>
  );
}

interface ResultViewProps {
  result: Doc2DoResult;
  mode: AnalysisResponse["mode"];
  states: Record<string, ActionState>;
  progress: number;
  editingActionId: string | null;
  setEditingActionId: (id: string | null) => void;
  toggleAction: (id: string) => void;
  renameAction: (id: string, title: string) => void;
  openEvidence: (selection: EvidenceSelection) => void;
  onCopy: () => void;
  copied: boolean;
  openCalendar: () => void;
}

function ResultView(props: ResultViewProps) {
  const { result, mode, states, progress, editingActionId, setEditingActionId, toggleAction, renameAction, openEvidence, onCopy, copied, openCalendar } = props;
  const nextAction = result.actions.find((action) => action.id === result.next_best_action_id) ?? result.actions[0];
  const nearestDeadline = result.deadlines.find((deadline) => deadline.date_time_iso) ?? result.deadlines[0];
  const requirements = Array.from(new Set(result.actions.flatMap((action) => action.requirements)));

  return (
    <section className="result-view">
      <div className="result-intro content-width">
        <div className="result-breadcrumb"><span>Your action plan</span><span>•</span><span>{mode === "demo" ? "Sample analysis" : "Gemini analysis"}</span></div>
        <div className="result-title-row">
          <div><p className="eyebrow">{result.document.issuer ?? "Document analysis"}</p><h1>{result.document.title}</h1></div>
          <div className="result-actions">
            <button className="secondary-button" onClick={onCopy}><Icon name={copied ? "check" : "copy"} />{copied ? "Copied" : "Copy checklist"}</button>
            <button className="primary-button" onClick={openCalendar}><Icon name="calendar" /> Add deadline</button>
          </div>
        </div>
      </div>

      <div className="result-grid content-width">
        <div className="result-main">
          <article className="summary-card">
            <div className="summary-topline">
              <EligibilityBadge status={result.applicability.status} />
              <button
                className="evidence-link"
                onClick={() => openEvidence({ title: "Why this eligibility assessment?", refs: result.source_refs.slice(0, 2).map((ref) => ref.id), state: "source_backed", confidence: "high" })}
              ><Icon name="source" /> View evidence</button>
            </div>
            <p className="summary-text">{result.document.summary}</p>
            <div className="reason-list">
              {result.applicability.reasons.map((reason) => <span key={reason}><Icon name="check" />{reason}</span>)}
            </div>
            {nextAction && (
              <div className="next-action"><span>Start here</span><div><strong>{states[nextAction.id]?.title ?? nextAction.title}</strong><p>{nextAction.description}</p></div><Icon name="arrow" /></div>
            )}
          </article>

          {nearestDeadline && <DeadlineStrip deadline={nearestDeadline} onCalendar={openCalendar} />}

          <section className="checklist-section" aria-labelledby="checklist-title">
            <div className="section-heading">
              <div><p className="eyebrow">Your path forward</p><h2 id="checklist-title">Action checklist</h2></div>
              <div className="completion"><span>{progress}% complete</span><div><i style={{ width: `${progress}%` }} /></div></div>
            </div>
            <div className="action-list">
              {result.actions.map((action, index) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  index={index}
                  state={states[action.id] ?? { title: action.title, complete: false }}
                  deadline={result.deadlines.find((item) => item.id === action.deadline_id)}
                  isNext={action.id === result.next_best_action_id}
                  isEditing={editingActionId === action.id}
                  onToggle={() => toggleAction(action.id)}
                  onEdit={() => setEditingActionId(action.id)}
                  onRename={(title) => renameAction(action.id, title)}
                  onEvidence={() => openEvidence({ title: action.title, refs: action.source_refs, state: action.evidence_state, confidence: action.confidence })}
                />
              ))}
            </div>
          </section>

          {result.warnings.length > 0 && (
            <section className="warnings-card" aria-labelledby="warnings-title">
              <div className="warning-heading"><Icon name="warning" /><div><p className="eyebrow">Before you act</p><h2 id="warnings-title">Details to confirm</h2></div></div>
              {result.warnings.map((warning, index) => (
                <div className="warning-item" key={`${warning.type}-${index}`}>
                  <span>{index + 1}</span><p>{warning.message}</p>
                  {warning.source_refs.length > 0 && <button onClick={() => openEvidence({ title: "Source for this warning", refs: warning.source_refs, state: "needs_confirmation", confidence: "medium" })}>See source</button>}
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="result-sidebar">
          <section className="side-card progress-card">
            <div className="progress-ring" style={{ "--progress": `${progress * 3.6}deg` } as CSSProperties}><span>{progress}%</span></div>
            <div><strong>{progress === 100 ? "Plan complete" : `${Object.values(states).filter((item) => item.complete).length} of ${result.actions.length} done`}</strong><p>Your progress is saved in this browser session.</p></div>
          </section>
          <section className="side-card">
            <div className="side-heading"><Icon name="file" /><h2>What you'll need</h2></div>
            <ul className="requirement-list">{requirements.map((item) => <li key={item}><span />{item}</li>)}</ul>
          </section>
          <section className="side-card source-card">
            <div className="side-heading"><Icon name="source" /><h2>Source coverage</h2></div>
            <strong>{result.source_refs.length} source passages</strong>
            <p>Critical actions are linked to exact lines from the document.</p>
            <button className="secondary-button full-width" onClick={() => openEvidence({ title: "All source passages", refs: result.source_refs.map((ref) => ref.id), state: "source_backed", confidence: "high" })}>Browse sources <Icon name="arrow" /></button>
          </section>
          <p className="disclaimer"><Icon name="warning" />{result.disclaimer}</p>
        </aside>
      </div>
    </section>
  );
}

function EligibilityBadge({ status }: { status: Doc2DoResult["applicability"]["status"] }) {
  const labels = { likely_eligible: "Likely eligible", likely_ineligible: "Likely ineligible", unclear: "Eligibility unclear", not_applicable: "Not applicable" };
  return <span className={`eligibility-badge ${status}`}><Icon name={status === "likely_eligible" ? "check" : "warning"} />{labels[status]}</span>;
}

function DeadlineStrip({ deadline, onCalendar }: { deadline: Deadline; onCalendar: () => void }) {
  return (
    <section className="deadline-strip">
      <div className="deadline-date"><span>{formatDay(deadline.date_time_iso)}</span><strong>{formatMonth(deadline.date_time_iso)}</strong></div>
      <div className="deadline-copy"><p className="eyebrow">Nearest deadline</p><h2>{deadline.label}</h2><p>{formatDateTime(deadline.date_time_iso)} {deadline.timezone ? `· ${deadline.timezone}` : "· Timezone not specified"}</p></div>
      {deadline.needs_confirmation && <span className="confirmation-badge"><Icon name="warning" /> Needs confirmation</span>}
      <button className="icon-button" onClick={onCalendar} aria-label="Review calendar event"><Icon name="calendar" /></button>
    </section>
  );
}

interface ActionCardProps {
  action: ActionItem;
  index: number;
  state: ActionState;
  deadline: Deadline | undefined;
  isNext: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRename: (title: string) => void;
  onEvidence: () => void;
}

function ActionCard({ action, index, state, deadline, isNext, isEditing, onToggle, onEdit, onRename, onEvidence }: ActionCardProps) {
  const [draft, setDraft] = useState(state.title);
  useEffect(() => setDraft(state.title), [state.title]);
  return (
    <article className={`action-card ${state.complete ? "is-complete" : ""} ${isNext ? "is-next" : ""}`}>
      <button className="check-control" onClick={onToggle} aria-label={`${state.complete ? "Mark incomplete" : "Mark complete"}: ${state.title}`} aria-pressed={state.complete}>
        {state.complete ? <Icon name="check" /> : <span>{String(index + 1).padStart(2, "0")}</span>}
      </button>
      <div className="action-content">
        <div className="action-meta"><PriorityBadge priority={action.priority} />{isNext && <span className="start-badge">Best next step</span>}{deadline && <span><Icon name="calendar" />{formatShortDate(deadline.date_time_iso)}</span>}</div>
        {isEditing ? (
          <form className="edit-title" onSubmit={(event) => { event.preventDefault(); onRename(draft); }}>
            <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} aria-label="Action title" />
            <button type="submit">Save</button><button type="button" onClick={() => onRename(state.title)}>Cancel</button>
          </form>
        ) : (
          <div className="action-title-row"><h3>{state.title}</h3><button className="edit-button" onClick={onEdit} aria-label={`Edit ${state.title}`}><Icon name="edit" /></button></div>
        )}
        <p>{action.description}</p>
        {action.requirements.length > 0 && <div className="mini-requirements">{action.requirements.map((item) => <span key={item}>{item}</span>)}</div>}
        <div className="action-footer">
          <button className="evidence-link" onClick={onEvidence}><Icon name="source" /> Why this?</button>
          <EvidenceState state={action.evidence_state} />
          {action.links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label} <Icon name="arrow" /></a>)}
        </div>
      </div>
    </article>
  );
}

function PriorityBadge({ priority }: { priority: ActionItem["priority"] }) {
  const labels = { urgent: "Urgent", high: "High priority", normal: "Recommended", optional: "Optional" };
  return <span className={`priority-badge ${priority}`}>{labels[priority]}</span>;
}

function EvidenceState({ state }: { state: ActionItem["evidence_state"] }) {
  const labels = { source_backed: "Source-backed", inferred: "Inferred", needs_confirmation: "Needs confirmation" };
  return <span className={`evidence-state ${state}`}><span />{labels[state]}</span>;
}

function EvidenceDrawer({ selection, result, onClose }: { selection: EvidenceSelection; result: Doc2DoResult; onClose: () => void }) {
  const refs = selection.refs.map((id) => result.source_refs.find((ref) => ref.id === id)).filter((ref): ref is SourceRef => Boolean(ref));
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="evidence-drawer" role="dialog" aria-modal="true" aria-labelledby="evidence-title">
        <div className="drawer-header"><div><p className="eyebrow">Evidence trail</p><h2 id="evidence-title">{selection.title}</h2></div><button className="close-button" onClick={onClose} aria-label="Close evidence"><Icon name="x" /></button></div>
        {(selection.state || selection.confidence) && <div className="evidence-summary">{selection.state && <EvidenceState state={selection.state} />}<span>Confidence: <strong>{selection.confidence ?? "unknown"}</strong></span></div>}
        <div className="source-list">
          {refs.length > 0 ? refs.map((ref, index) => (
            <blockquote key={ref.id} className="source-quote">
              <div><span>{String(index + 1).padStart(2, "0")}</span><strong>{ref.location_label}</strong></div>
              <p lang={result.document.language === "vi" ? "vi" : undefined}>“{ref.snippet}”</p>
              <small>Exact excerpt from the uploaded source</small>
            </blockquote>
          )) : <div className="empty-evidence"><Icon name="warning" /><strong>No source excerpt was attached</strong><p>Treat this conclusion as unconfirmed and check the original document.</p></div>}
        </div>
        <div className="trust-explainer"><Icon name="source" /><div><strong>How Doc2Do builds trust</strong><p>Every critical date and action must point to a source passage. If it cannot, we label it as inferred or needing confirmation.</p></div></div>
        <button className="primary-button full-width" onClick={onClose}>Done reviewing</button>
      </aside>
    </div>
  );
}

function CalendarModal({ result, onClose }: { result: Doc2DoResult; onClose: () => void }) {
  const deadline = result.deadlines.find((item) => item.date_time_iso) ?? result.deadlines[0];
  const [title, setTitle] = useState(deadline ? `${result.document.title} — ${deadline.label}` : result.document.title);
  const [start, setStart] = useState(deadline?.date_time_iso?.slice(0, 16) ?? "");
  const [reminder, setReminder] = useState(1440);
  const [downloaded, setDownloaded] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const eventDraft: CalendarEventDraft = {
    title,
    start,
    durationMinutes: 30,
    reminderMinutes: reminder,
    description: `Deadline captured from ${result.document.title}. Review the original source before acting.`,
  };
  const googleCalendarUrl = start ? buildGoogleCalendarUrl(eventDraft) : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!start) return;
    downloadIcs(eventDraft);
    setDownloaded(true);
  }

  return (
    <div className="modal-layer centered" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-title">
        <div className="drawer-header"><div><p className="eyebrow">Review before adding</p><h2 id="calendar-title">Calendar event</h2></div><button className="close-button" onClick={onClose} aria-label="Close calendar review"><Icon name="x" /></button></div>
        <div className="consent-note"><Icon name="calendar" /><p>Nothing is added automatically. Review the details, then open a pre-filled Google Calendar event or download a calendar file.</p></div>
        <form onSubmit={submit} className="calendar-form">
          <label>Event title<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
          <label>Date and time<input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} required /></label>
          <div className="timezone-warning"><Icon name="warning" /><span><strong>Timezone needs confirmation</strong>The source did not name a timezone. Your calendar will use the timezone configured on this device.</span></div>
          <label>Reminder<select value={reminder} onChange={(event) => setReminder(Number(event.target.value))}><option value={60}>1 hour before</option><option value={1440}>1 day before</option><option value={4320}>3 days before</option><option value={10080}>1 week before</option></select></label>
          <div className="calendar-actions">
            <a
              className={`primary-button full-width ${googleCalendarUrl ? "" : "is-disabled"}`}
              href={googleCalendarUrl ?? undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!googleCalendarUrl}
              onClick={(event) => { if (!googleCalendarUrl) event.preventDefault(); }}
            ><Icon name="calendar" /> Open in Google Calendar</a>
            <button className="secondary-button full-width" type="submit"><Icon name={downloaded ? "check" : "calendar"} />{downloaded ? "Calendar file downloaded" : "Download calendar file (.ics)"}</button>
          </div>
          <small className="calendar-footnote">You stay in control. Doc2Do will never create an event without your confirmation.</small>
        </form>
      </section>
    </div>
  );
}

function Footer() {
  return <footer><span>Doc2Do · From document to done</span><span>Built with Gemini for AI Riser Vietnam 2026</span></footer>;
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    sparkle: <><path d="m12 3-1.2 3.8L7 8l3.8 1.2L12 13l1.2-3.8L17 8l-3.8-1.2Z"/><path d="m5 15-.7 2.3L2 18l2.3.7L5 21l.7-2.3L8 18l-2.3-.7Z"/></>,
    source: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M8 7h8M8 11h6"/></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></>,
    warning: <><path d="M10.3 3.6 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
    x: <><path d="M18 6 6 18M6 6l12 12"/></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDay(value: string | null): string {
  return parseDate(value)?.toLocaleDateString("en-GB", { day: "2-digit" }) ?? "—";
}

function formatMonth(value: string | null): string {
  return parseDate(value)?.toLocaleDateString("en-GB", { month: "short" }).toUpperCase() ?? "TBD";
}

function formatShortDate(value: string | null): string {
  return parseDate(value)?.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) ?? "No date";
}

function formatDateTime(value: string | null): string {
  return parseDate(value)?.toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) ?? "No explicit date found";
}

export default App;
