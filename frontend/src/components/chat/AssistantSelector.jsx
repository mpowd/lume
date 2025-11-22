import { useRef, useState } from 'react'
import { Bot, Database, Cpu, ChevronLeft, ChevronRight } from 'lucide-react'

export default function AssistantSelector({ assistants, onSelect }) {
  const carouselRef = useRef(null)
  const [carouselScroll, setCarouselScroll] = useState(0)

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 320
      const newScroll = direction === 'left' 
        ? Math.max(0, carouselScroll - scrollAmount)
        : Math.min(carouselRef.current.scrollWidth - carouselRef.current.clientWidth, carouselScroll + scrollAmount)
      
      carouselRef.current.scrollTo({ left: newScroll, behavior: 'smooth' })
      setCarouselScroll(newScroll)
    }
  }

  return (
    <div className="relative">
      <style>{`
        .carousel-container { scrollbar-width: none; -ms-overflow-style: none; }
        .carousel-container::-webkit-scrollbar { display: none; }
        .assistant-card { transition: all 0.3s ease; }
        .assistant-card:hover { transform: translateY(-2px); }
      `}</style>

      {carouselScroll > 0 && (
        <button 
          onClick={() => scrollCarousel('left')} 
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-background-elevated/90 hover:bg-white/5 border border-white/10 rounded-2xl transition-all shadow-lg"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
      )}

      <div 
        ref={carouselRef} 
        className="carousel-container flex gap-4 overflow-x-auto pb-2" 
        onScroll={(e) => setCarouselScroll(e.target.scrollLeft)}
      >
        {assistants.map((bot) => (
          <div 
            key={bot.id} 
            onClick={() => onSelect(bot)} 
            className="assistant-card flex-shrink-0 w-80 p-5 rounded-2xl border cursor-pointer bg-transparent border-white/10 hover:border-brand-teal/30 hover:bg-white/[0.02]"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-transparent border border-white/10">
                  <Bot className="w-5 h-5 text-brand-teal" />
                </div>
                <h3 className="font-semibold text-white text-base">{bot.name}</h3>
              </div>
            </div>

            <p className="text-sm text-text-tertiary mb-4 line-clamp-2">
              {bot.workflow === 'agentic' 
                ? 'Agentic workflow with tools' 
                : `Assistant with ${bot.collections?.length || 0} knowledge source${bot.collections?.length !== 1 ? 's' : ''}`
              }
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="p-1.5 bg-transparent border border-white/10 rounded-lg">
                  <Database className="w-3.5 h-3.5 text-brand-teal" />
                </div>
                <span className="text-text-tertiary">Knowledge:</span>
                <span className="text-text-secondary font-medium">
                  {bot.collections && bot.collections.length > 0 
                    ? bot.collections.length === 1 
                      ? bot.collections[0] 
                      : `${bot.collections.length} sources` 
                    : 'None'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <div className="p-1.5 bg-transparent border border-white/10 rounded-lg">
                  <Cpu className="w-3.5 h-3.5 text-brand-teal" />
                </div>
                <span className="text-text-tertiary">Model:</span>
                <span className="text-text-secondary font-medium">{bot.llm || 'Not set'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {carouselRef.current && carouselScroll < (carouselRef.current.scrollWidth - carouselRef.current.clientWidth - 10) && (
        <button 
          onClick={() => scrollCarousel('right')} 
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-background-elevated/90 hover:bg-white/5 border border-white/10 rounded-2xl transition-all shadow-lg"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      )}
    </div>
  )
}