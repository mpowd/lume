import { Search, X } from 'lucide-react'

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  className = ''
}) {
  const handleClear = () => {
    if (onClear) {
      onClear()
    } else {
      onChange({ target: { value: '' } })
    }
  }

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-all"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      )}
    </div>
  )
}