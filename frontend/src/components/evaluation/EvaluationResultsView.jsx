import { useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import Card from '../shared/Card'
import Button from '../shared/Button'

const scoreColor = (normalised) => {
    if (normalised >= 0.8) return '#34d399'   // emerald
    if (normalised >= 0.6) return '#fbbf24'   // amber
    return '#f87171'                           // red
}

function ScorePill({ value, min, max, label }) {
    const pct = (value - min) / (max - min)
    const color = scoreColor(pct)
    const display = max <= 1 ? `${Math.round(pct * 100)}%` : value.toFixed(1)
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: color + '1a', color }}
        >
            {label && <span className="opacity-60 font-normal">{label}</span>}
            {display}
        </span>
    )
}

export default function EvaluationResultsView({ evaluation, metrics, onBack }) {
    const [expandedRow, setExpandedRow] = useState(null)

    if (!evaluation) return null

    const metricMap = Object.fromEntries((metrics || []).map((m) => [m.id, m]))

    // Build chart data from summary
    const summaryEntries = Object.entries(evaluation.summary || {})

    const radarData = summaryEntries.map(([name, value]) => {
        const m = metrics?.find((m) => m.name === name)
        const min = m?.scale_min ?? 0
        const max = m?.scale_max ?? 1
        const pct = ((value - min) / (max - min)) * 100
        return { metric: name, value: Math.round(pct) }
    })

    const barData = summaryEntries.map(([name, value]) => {
        const m = metrics?.find((m) => m.name === name)
        const min = m?.scale_min ?? 0
        const max = m?.scale_max ?? 1
        const pct = ((value - min) / (max - min)) * 100
        return { name, raw: value, pct: Math.round(pct), min, max }
    })

    return (
        <div className="space-y-6">
            {/* Back + title */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
                    Back
                </Button>
                <div>
                    <h2 className="text-xl font-semibold text-white">{evaluation.assistant_name}</h2>
                    <p className="text-sm text-text-tertiary mt-0.5">
                        {evaluation.dataset_name ? `Dataset: ${evaluation.dataset_name}` : 'Inline questions'} ·{' '}
                        {new Date(evaluation.created_at).toLocaleString()} · evaluated with{' '}
                        <span className="font-mono">{evaluation.eval_llm_model}</span>
                    </p>
                </div>
            </div>

            {/* Charts */}
            {summaryEntries.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Radar */}
                    <Card className="p-6">
                        <h3 className="text-sm font-medium text-text-secondary mb-5">Metric Overview</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="#ffffff10" />
                                <PolarAngleAxis
                                    dataKey="metric"
                                    tick={{ fill: '#8892a4', fontSize: 11 }}
                                />
                                <Radar
                                    name="Score"
                                    dataKey="value"
                                    stroke="#00c9a7"
                                    fill="#00c9a7"
                                    fillOpacity={0.15}
                                    strokeWidth={2}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </Card>

                    {/* Bar */}
                    <Card className="p-6">
                        <h3 className="text-sm font-medium text-text-secondary mb-5">Score Breakdown</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={barData} layout="vertical">
                                <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    tick={{ fill: '#4a5568', fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `${v}%`}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fill: '#8892a4', fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={100}
                                />
                                <Tooltip
                                    cursor={{ fill: '#ffffff06' }}
                                    contentStyle={{
                                        background: '#0d1117',
                                        border: '1px solid #ffffff15',
                                        borderRadius: 12,
                                        color: '#fff',
                                        fontSize: 12,
                                    }}
                                    formatter={(val, _name, props) => {
                                        const d = props.payload
                                        return [`${d.raw.toFixed(2)} (${val}%)`, d.name]
                                    }}
                                />
                                <Bar dataKey="pct" radius={[0, 6, 6, 0]}>
                                    {barData.map((entry, i) => (
                                        <Cell key={i} fill={scoreColor(entry.pct / 100)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
            )}

            {/* Summary badges */}
            <Card className="p-6">
                <h3 className="text-sm font-medium text-text-secondary mb-4">Average Scores</h3>
                <div className="flex flex-wrap gap-3">
                    {summaryEntries.map(([name, value]) => {
                        const m = metrics?.find((m) => m.name === name)
                        return (
                            <div key={name} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background-elevated border border-white/8">
                                <span className="text-sm text-white">{name}</span>
                                <ScorePill value={value} min={m?.scale_min ?? 0} max={m?.scale_max ?? 1} />
                            </div>
                        )
                    })}
                </div>
            </Card>

            {/* Per-question results */}
            {evaluation.results?.length > 0 && (
                <Card>
                    <div className="px-6 py-4 border-b border-white/8 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-text-tertiary" />
                        <h3 className="text-sm font-medium text-white">
                            Per-Question Results ({evaluation.results.length})
                        </h3>
                    </div>
                    <div className="divide-y divide-white/5">
                        {evaluation.results.map((row, i) => {
                            const isExpanded = expandedRow === i
                            return (
                                <div key={i}>
                                    <button
                                        onClick={() => setExpandedRow(isExpanded ? null : i)}
                                        className="w-full flex items-start gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors text-left"
                                    >
                                        <span className="text-xs text-text-quaternary font-mono mt-1 w-5 flex-shrink-0">
                                            {i + 1}
                                        </span>
                                        <p className="flex-1 text-sm text-text-secondary line-clamp-2">
                                            {row.question}
                                        </p>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {Object.entries(row.scores || {}).map(([name, value]) => {
                                                const m = metrics?.find((m) => m.name === name)
                                                return (
                                                    <ScorePill
                                                        key={name}
                                                        value={value}
                                                        min={m?.scale_min ?? 0}
                                                        max={m?.scale_max ?? 1}
                                                        label={name}
                                                    />
                                                )
                                            })}
                                            {isExpanded ? (
                                                <ChevronUp className="w-4 h-4 text-text-quaternary ml-1" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-text-quaternary ml-1" />
                                            )}
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="px-6 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-background-elevated border border-white/6">
                                                <p className="text-xs font-medium text-text-quaternary uppercase tracking-wide mb-2">
                                                    Answer
                                                </p>
                                                <p className="text-sm text-text-secondary leading-relaxed">{row.answer}</p>
                                            </div>
                                            {row.ground_truth && (
                                                <div className="p-4 rounded-xl bg-background-elevated border border-white/6">
                                                    <p className="text-xs font-medium text-text-quaternary uppercase tracking-wide mb-2">
                                                        Ground Truth
                                                    </p>
                                                    <p className="text-sm text-text-secondary leading-relaxed">{row.ground_truth}</p>
                                                </div>
                                            )}
                                            {row.context?.length > 0 && (
                                                <div className="md:col-span-2 p-4 rounded-xl bg-background-elevated border border-white/6">
                                                    <p className="text-xs font-medium text-text-quaternary uppercase tracking-wide mb-2">
                                                        Retrieved Context
                                                    </p>
                                                    {row.context.map((c, ci) => (
                                                        <p key={ci} className="text-xs text-text-tertiary leading-relaxed mb-1">
                                                            {c}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </Card>
            )}
        </div>
    )
}