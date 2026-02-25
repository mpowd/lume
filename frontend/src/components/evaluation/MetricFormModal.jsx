import { useState, useEffect, useRef } from 'react'
import { X, Zap, Hash } from 'lucide-react'
import FormInput from '../shared/FormInput'
import FormTextarea from '../shared/FormTextarea'
import Button from '../shared/Button'

const VARIABLE_CHIPS = [
    { label: '{question}', description: 'The input question' },
    { label: '{answer}', description: 'The assistant answer' },
    { label: '{ground_truth}', description: 'Expected answer' },
    { label: '{context}', description: 'Retrieved context chunks' },
]

const SCALE_PRESETS = [
    { label: '0 – 1', min: 0, max: 1 },
    { label: '0 – 5', min: 0, max: 5 },
    { label: '0 – 10', min: 0, max: 10 },
    { label: '0 – 100', min: 0, max: 100 },
]

const DEFAULT_PROMPT = `Rate the following answer on a scale from {scale_min} to {scale_max}.

Question: {question}
Answer: {answer}

Return only a single number between {scale_min} and {scale_max}. Do not include any explanation.`

export default function MetricFormModal({ metric, onSave, onClose, saving }) {
    const isEdit = !!metric
    const textareaRef = useRef(null)

    const [form, setForm] = useState({
        name: '',
        description: '',
        prompt_template: DEFAULT_PROMPT,
        scale_min: 0,
        scale_max: 1,
        requires_context: false,
        requires_ground_truth: false,
    })

    useEffect(() => {
        if (metric) {
            setForm({
                name: metric.name || '',
                description: metric.description || '',
                prompt_template: metric.prompt_template || DEFAULT_PROMPT,
                scale_min: metric.scale_min ?? 0,
                scale_max: metric.scale_max ?? 1,
                requires_context: metric.requires_context || false,
                requires_ground_truth: metric.requires_ground_truth || false,
            })
        }
    }, [metric])

    const insertVariable = (variable) => {
        const ta = textareaRef.current
        if (!ta) return
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const newPrompt =
            form.prompt_template.slice(0, start) +
            variable +
            form.prompt_template.slice(end)
        setForm((f) => ({ ...f, prompt_template: newPrompt }))
        // Restore cursor after variable
        setTimeout(() => {
            ta.focus()
            ta.setSelectionRange(start + variable.length, start + variable.length)
        }, 0)
    }

    const applyScalePreset = (preset) => {
        setForm((f) => ({
            ...f,
            scale_min: preset.min,
            scale_max: preset.max,
            prompt_template: f.prompt_template
                .replace(/\{scale_min\}/g, preset.min)
                .replace(/\{scale_max\}/g, preset.max),
        }))
    }

    const handleSubmit = () => {
        if (!form.name.trim() || !form.prompt_template.trim()) return
        onSave({
            name: form.name.trim(),
            description: form.description.trim() || null,
            type: 'llm_judge',
            prompt_template: form.prompt_template.trim(),
            scale_min: Number(form.scale_min),
            scale_max: Number(form.scale_max),
            requires_context: form.requires_context,
            requires_ground_truth: form.requires_ground_truth,
            is_builtin: false,
        })
    }

    const isValid = form.name.trim() && form.prompt_template.trim()

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl bg-background border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                            <Zap className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">
                                {isEdit ? 'Edit Metric' : 'New Metric'}
                            </h2>
                            <p className="text-xs text-text-tertiary mt-0.5">
                                LLM-as-judge — the evaluator model scores each answer
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/8 text-text-tertiary hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    {/* Name + description */}
                    <div className="grid grid-cols-1 gap-4">
                        <FormInput
                            label="Metric Name"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Grammar, Tone, Conciseness"
                            required
                        />
                        <FormInput
                            label="Description (optional)"
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            placeholder="What does this metric measure?"
                        />
                    </div>

                    {/* Scale */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Score Scale
                        </label>
                        <div className="flex gap-2 mb-3">
                            {SCALE_PRESETS.map((p) => (
                                <button
                                    key={p.label}
                                    onClick={() => applyScalePreset(p)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.scale_min === p.min && form.scale_max === p.max
                                        ? 'bg-brand-teal/15 border-brand-teal/40 text-brand-teal'
                                        : 'border-white/10 text-text-tertiary hover:border-white/20 hover:text-white'
                                        }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <FormInput
                                label="Min"
                                type="number"
                                value={form.scale_min}
                                onChange={(e) => setForm((f) => ({ ...f, scale_min: e.target.value }))}
                                className="flex-1"
                            />
                            <FormInput
                                label="Max"
                                type="number"
                                value={form.scale_max}
                                onChange={(e) => setForm((f) => ({ ...f, scale_max: e.target.value }))}
                                className="flex-1"
                            />
                        </div>
                    </div>

                    {/* Prompt template */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-text-secondary">
                                Evaluation Prompt <span className="text-danger">*</span>
                            </label>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-text-quaternary mr-1">Insert:</span>
                                {VARIABLE_CHIPS.map((chip) => (
                                    <button
                                        key={chip.label}
                                        onClick={() => insertVariable(chip.label)}
                                        title={chip.description}
                                        className="px-2 py-0.5 rounded-md text-xs font-mono bg-brand-teal/8 text-brand-teal border border-brand-teal/20 hover:bg-brand-teal/15 transition-colors"
                                    >
                                        {chip.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <textarea
                            ref={textareaRef}
                            value={form.prompt_template}
                            onChange={(e) => setForm((f) => ({ ...f, prompt_template: e.target.value }))}
                            rows={10}
                            placeholder="Write your evaluation prompt. Use variable chips above to insert dynamic values. The LLM must return a single number."
                            className="w-full px-4 py-3 bg-transparent border border-white/10 rounded-xl text-white text-sm font-mono placeholder:text-text-quaternary focus:outline-none focus:border-brand-teal/50 hover:border-white/20 transition-all resize-none leading-relaxed"
                        />
                        <p className="text-xs text-text-quaternary mt-2">
                            The evaluator LLM must return a single number between {form.scale_min} and {form.scale_max}.
                        </p>
                    </div>

                    {/* Flags */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            {
                                key: 'requires_context',
                                label: 'Requires retrieval context',
                                description: 'Disable for assistants without knowledge sources',
                                icon: '📡',
                            },
                            {
                                key: 'requires_ground_truth',
                                label: 'Requires ground truth',
                                description: 'Needs a dataset with expected answers',
                                icon: '🎯',
                            },
                        ].map(({ key, label, description, icon }) => (
                            <button
                                key={key}
                                onClick={() => setForm((f) => ({ ...f, [key]: !f[key] }))}
                                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${form[key]
                                    ? 'border-brand-teal/30 bg-brand-teal/5'
                                    : 'border-white/8 hover:border-white/16 bg-transparent'
                                    }`}
                            >
                                <span className="text-lg flex-shrink-0">{icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${form[key] ? 'text-brand-teal' : 'text-white'}`}>
                                        {label}
                                    </p>
                                    <p className="text-xs text-text-quaternary mt-0.5">{description}</p>
                                </div>
                                <div
                                    className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${form[key] ? 'bg-brand-teal border-brand-teal' : 'border-white/20'
                                        }`}
                                >
                                    {form[key] && (
                                        <svg className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-5 border-t border-white/8 flex-shrink-0">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={!isValid}>
                        {isEdit ? 'Save Changes' : 'Create Metric'}
                    </Button>
                </div>
            </div>
        </div>
    )
}