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
        <label className="block text-sm font-medium text-text-secondary mb-2">
          {label} {required && <span className="text-danger">*</span>}
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
        className="
          w-full px-4 py-3 
          bg-transparent border border-white/10 rounded-xl 
          text-white placeholder:text-text-quaternary 
          transition-all duration-200
          hover:border-white/20
          focus:outline-none focus:border-brand-teal/50
        "
      />
    </div>
  )
}