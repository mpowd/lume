export default function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  required = false,
  className = ''
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-2">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="
          w-full px-4 py-3 
          bg-transparent border border-white/10 rounded-xl 
          text-white placeholder:text-text-quaternary 
          transition-all duration-200
          hover:border-white/20
          focus:outline-none focus:border-brand-teal/50
          resize-none
        "
      />
    </div>
  )
}