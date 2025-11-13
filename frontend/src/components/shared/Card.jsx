export default function Card({ 
  children, 
  onClick, 
  hover = true,
  className = '' 
}) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-transparent border border-white/10 rounded-2xl
        ${hover ? 'hover:border-white/20' : ''}
        ${onClick ? 'cursor-pointer hover:bg-white/[0.02]' : ''}
        transition-all duration-200
        ${className}
      `}
    >
      {children}
    </div>
  )
}