
export default function FormInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  min,
  max,
  step,
  className = ''
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
        className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:border-white/20"
      />
    </div>
  )
}