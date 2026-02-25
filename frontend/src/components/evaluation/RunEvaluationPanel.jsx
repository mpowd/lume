import { useState, useEffect } from 'react'
import { X, Play, Loader2, AlertCircle, Check, ChevronDown, Zap, Database, Bot } from 'lucide-react'
import Button from '../shared/Button'

const EVAL_MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo']

export default function RunEvaluationPanel({ assistants, datasets, metrics, onClose, onRun, running, progress }) {
    const [config, setConfig] = useState({
        assistantId: '',
        metricIds: [],
        datasetId: '',          // empty = no dataset
        useDataset: false,
        evalModel: 'gpt-4o-mini',
        evalProvider: 'openai',
        inlineQuestions: [{ question: '', ground_truth: '' }],
    })

    // When assistant changes, auto-deselect context metrics if no retrieval
    const selectedAssistant = assistants?.find(
        (a) => (a.id || a._id) === config.assistantId
    )
    const hasRetrieval = selectedAssistant?.config?.knowledge_base_ids?.length > 0

    useEffect(() => {
        if (!hasRetrieval && config.assistantId) {
            // drop metrics that require context
            setConfig((c) => ({
                ...c,
                metricIds: c.metricIds.filter((id) => {
                    const m = metrics.find((m) => m.id === id)
                    return !m?.requires_context
                }),
            }))
        }
    }, [config.assistantId, hasRetrieval])

    const toggleMetric = (id) => {
        setConfig((c) => ({
            ...c,
            metricIds: c.metricIds.includes(id)
                ? c.metricIds.filter((x) => x !== id)
                : [...c.metricIds, id],
        }))
    }

    const updateInline = (idx, field, val) => {
        setConfig((c) => {
            const qs = [...c.inlineQuestions]
            qs[idx] = { ...qs[idx], [field]: val }
            return { ...c, inlineQuestions: qs }
        })
    }

    const addInline = () =>
        setConfig((c) => ({
            ...c,
            inlineQuestions: [...c.inlineQuestions, { question: '', ground_truth: '' }],
        }))

    const removeInline = (idx) =>
        setConfig((c) => ({
            ...c,
            inlineQuestions: c.inlineQuestions.filter((_, i) => i !== idx),
        }))

    const canRun =
        config.assistantId &&
        config.metricIds.length > 0 &&
        (!config.useDataset || config.datasetId || config.inlineQuestions.some((q) => q.question.trim()))

    const handleRun = () => {
        if (!canRun || running) return
        onRun(config)
    }

    const builtinMetrics = metrics.filter((m) => m.is_builtin)
    const customMetrics = metrics.filter((m) => !m.is_builtin)

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => !running && onClose()}
            />
            <div className="relative z-10 w-full max-w-lg h-full bg-background border-l border-white/10 flex flex-col shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-brand-teal/10 border border-brand-teal/20">
                            <Play className="w-4 h-4 text-brand-teal" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Run Evaluation</h3>
                            <p className="text-xs text-text-tertiary mt-0.5">Configure and launch an evaluation run</p>
                        </div>
                    </div>
                    <button
                        onClick={() => !running && onClose()}
                        disabled={running}
                        className="p-2 rounded-lg hover:bg-white/8 text-text-tertiary hover:text-white transition-colors disabled:opacity-40"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">

                    {/* 1. Assistant */}
                    <section>
                        <SectionLabel icon={Bot} label="Assistant" required />
                        <div className="space-y-2">
                            {(assistants || []).filter((a) => a.type === 'qa' && a.is_active !== false).map((a) => {
                                const id = a.id || a._id
                                const selected = config.assistantId === id
                                const kbCount = a.config?.knowledge_base_ids?.length || 0
                                return (
                                    <SelectRow
                                        key={id}
                                        selected={selected}
                                        onClick={() => setConfig((c) => ({ ...c, assistantId: id }))}
                                        disabled={running}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white">{a.name}</p>
                                            <p className="text-xs text-text-tertiary mt-0.5">
                                                {a.config?.llm_model || '—'} · {kbCount > 0 ? `${kbCount} knowledge source${kbCount !== 1 ? 's' : ''}` : 'no retrieval'}
                                            </p>
                                        </div>
                                    </SelectRow>
                                )
                            })}
                        </div>
                        {selectedAssistant && !hasRetrieval && (
                            <div className="mt-3 flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
                                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-400">
                                    No knowledge sources — context-based metrics are unavailable and have been deselected.
                                </p>
                            </div>
                        )}
                    </section>

                    {/* 2. Metrics */}
                    <section>
                        <SectionLabel icon={Zap} label="Metrics" required hint={`${config.metricIds.length} selected`} />
                        {metrics.length === 0 ? (
                            <div className="py-6 text-center text-sm text-text-tertiary border border-dashed border-white/10 rounded-xl">
                                No metrics defined yet. Create metrics in the Metrics tab.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {builtinMetrics.length > 0 && (
                                    <>
                                        <p className="text-xs text-text-quaternary uppercase tracking-wider mb-2">Built-in</p>
                                        {builtinMetrics.map((m) => <MetricRow key={m.id} metric={m} selected={config.metricIds.includes(m.id)} hasRetrieval={hasRetrieval} onToggle={() => toggleMetric(m.id)} disabled={running} />)}
                                    </>
                                )}
                                {customMetrics.length > 0 && (
                                    <>
                                        <p className="text-xs text-text-quaternary uppercase tracking-wider mt-3 mb-2">Custom</p>
                                        {customMetrics.map((m) => <MetricRow key={m.id} metric={m} selected={config.metricIds.includes(m.id)} hasRetrieval={hasRetrieval} onToggle={() => toggleMetric(m.id)} disabled={running} />)}
                                    </>
                                )}
                            </div>
                        )}
                    </section>

                    {/* 3. Questions source */}
                    <section>
                        <SectionLabel icon={Database} label="Questions" />
                        <div className="flex rounded-xl border border-white/10 overflow-hidden mb-3">
                            {[
                                { v: false, l: 'From dataset' },
                                { v: true, l: 'Inline / ad-hoc' },
                            ].map(({ v, l }) => (
                                <button
                                    key={l}
                                    onClick={() => setConfig((c) => ({ ...c, useDataset: v }))}
                                    disabled={running}
                                    className={`flex-1 py-2.5 text-sm font-medium transition-all disabled:opacity-50 ${config.useDataset === v
                                        ? 'bg-background-elevated text-white border-b-2 border-brand-teal'
                                        : 'text-text-tertiary hover:text-white'
                                        }`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>

                        {!config.useDataset ? (
                            /* Dataset picker */
                            <div className="space-y-2">
                                <SelectRow
                                    selected={!config.datasetId}
                                    onClick={() => setConfig((c) => ({ ...c, datasetId: '' }))}
                                    disabled={running}
                                >
                                    <p className="text-sm text-text-tertiary italic">No dataset — only inline answers will be scored</p>
                                </SelectRow>
                                {(datasets || []).map((d) => {
                                    const id = d.id || d._id
                                    return (
                                        <SelectRow
                                            key={id}
                                            selected={config.datasetId === id}
                                            onClick={() => setConfig((c) => ({ ...c, datasetId: id }))}
                                            disabled={running}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white">{d.name || d.dataset_name}</p>
                                                <p className="text-xs text-text-tertiary mt-0.5">{d.num_pairs || d.qa_pairs?.length || 0} Q&A pairs</p>
                                            </div>
                                        </SelectRow>
                                    )
                                })}
                            </div>
                        ) : (
                            /* Inline questions */
                            <div className="space-y-2">
                                {config.inlineQuestions.map((q, i) => (
                                    <div key={i} className="p-4 bg-background-elevated border border-white/8 rounded-xl space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-text-quaternary font-mono">#{i + 1}</span>
                                            {config.inlineQuestions.length > 1 && (
                                                <button onClick={() => removeInline(i)} disabled={running} className="text-text-quaternary hover:text-red-400 transition-colors disabled:opacity-40">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            value={q.question}
                                            onChange={(e) => updateInline(i, 'question', e.target.value)}
                                            disabled={running}
                                            placeholder="Question…"
                                            className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg text-white text-sm placeholder:text-text-quaternary focus:outline-none focus:border-brand-teal/50 hover:border-white/20 transition-all disabled:opacity-50"
                                        />
                                        <input
                                            value={q.ground_truth}
                                            onChange={(e) => updateInline(i, 'ground_truth', e.target.value)}
                                            disabled={running}
                                            placeholder="Ground truth answer (optional)…"
                                            className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg text-text-secondary text-sm placeholder:text-text-quaternary focus:outline-none focus:border-brand-teal/50 hover:border-white/20 transition-all disabled:opacity-50"
                                        />
                                    </div>
                                ))}
                                <button
                                    onClick={addInline}
                                    disabled={running}
                                    className="w-full py-2 text-xs text-text-tertiary hover:text-brand-teal border border-dashed border-white/10 hover:border-brand-teal/30 rounded-xl transition-all disabled:opacity-40"
                                >
                                    + Add question
                                </button>
                            </div>
                        )}
                    </section>

                    {/* 4. Evaluator model */}
                    <section>
                        <SectionLabel label="Evaluator Model" />
                        <div className="grid grid-cols-3 gap-2">
                            {EVAL_MODELS.map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setConfig((c) => ({ ...c, evalModel: m }))}
                                    disabled={running}
                                    className={`py-2 px-3 text-xs rounded-xl border font-mono transition-all disabled:opacity-50 ${config.evalModel === m
                                        ? 'border-brand-teal/40 bg-brand-teal/8 text-brand-teal'
                                        : 'border-white/10 text-text-tertiary hover:border-white/20 hover:text-white'
                                        }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="border-t border-white/8 px-6 py-5 flex-shrink-0">
                    {running ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-text-secondary">
                                    <Loader2 className="w-4 h-4 animate-spin text-brand-teal" />
                                    <span>{progress?.label || 'Running evaluation…'}</span>
                                </div>
                                <span className="text-brand-teal font-mono text-xs">
                                    {progress?.current ?? 0}/{progress?.total ?? '?'}
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-background-elevated rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-brand-teal transition-all duration-300 rounded-full"
                                    style={{ width: `${progress?.total ? (progress.current / progress.total) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <Button
                            variant="primary"
                            fullWidth
                            icon={Play}
                            onClick={handleRun}
                            disabled={!canRun}
                        >
                            Start Evaluation
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Small shared sub-components ───────────────────────────

function SectionLabel({ icon: Icon, label, required, hint }) {
    return (
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
                {Icon && <Icon className="w-3.5 h-3.5 text-text-tertiary" />}
                <span className="text-sm font-medium text-text-secondary">
                    {label}
                    {required && <span className="text-danger ml-1">*</span>}
                </span>
            </div>
            {hint && <span className="text-xs text-brand-teal font-medium">{hint}</span>}
        </div>
    )
}

function SelectRow({ selected, onClick, disabled, children }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all disabled:opacity-50 ${selected
                ? 'border-brand-teal/35 bg-brand-teal/6'
                : 'border-white/8 hover:border-white/16 bg-transparent'
                }`}
        >
            <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${selected ? 'border-brand-teal bg-brand-teal' : 'border-white/20'
                }`}>
                {selected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
            </div>
            {children}
        </button>
    )
}

function MetricRow({ metric, selected, hasRetrieval, onToggle, disabled }) {
    const unavailable = metric.requires_context && !hasRetrieval
    return (
        <button
            onClick={() => !unavailable && onToggle()}
            disabled={disabled || unavailable}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${unavailable
                ? 'border-white/4 opacity-30 cursor-not-allowed'
                : selected
                    ? 'border-brand-teal/35 bg-brand-teal/6'
                    : 'border-white/8 hover:border-white/16 bg-transparent'
                }`}
        >
            <div className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${selected && !unavailable ? 'bg-brand-teal border-brand-teal' : 'border-white/20'
                }`}>
                {selected && !unavailable && (
                    <svg className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{metric.name}</p>
                {metric.description && (
                    <p className="text-xs text-text-quaternary mt-0.5 line-clamp-1">{metric.description}</p>
                )}
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
                {metric.requires_context && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/15">
                        context
                    </span>
                )}
                {metric.requires_ground_truth && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/15">
                        GT
                    </span>
                )}
                <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-text-quaternary font-mono">
                    {metric.scale_min}–{metric.scale_max}
                </span>
            </div>
        </button>
    )
}