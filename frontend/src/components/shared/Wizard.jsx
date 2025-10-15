
export default function Wizard({ currentStep, totalSteps, className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map(step => (
        <div
          key={step}
          className={`h-1.5 rounded-full transition-all ${
            step === currentStep
              ? 'w-12 bg-blue-500'
              : step < currentStep
              ? 'w-8 bg-blue-500/50'
              : 'w-8 bg-white/10'
          }`}
        />
      ))}
    </div>
  )
}