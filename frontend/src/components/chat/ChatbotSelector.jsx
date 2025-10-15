import { useRef, useState } from 'react'
import { Bot, Database, Cpu, ChevronLeft, ChevronRight } from 'lucide-react'

export default function ChatbotSelector({ chatbots, onSelect }) {
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
        .chatbot-card { transition: all 0.3s ease; }
        .chatbot-card:hover { transform: translateY(-2px); }
      `}</style>

      {carouselScroll > 0 && (
        <button 
          onClick={() => scrollCarousel('left')} 
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-slate-900/90 hover:bg-slate-800 border border-white/10 rounded-2xl transition-all cursor-pointer shadow-lg"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
      )}

      <div 
        ref={carouselRef} 
        className="carousel-container flex gap-4 overflow-x-auto pb-2" 
        onScroll={(e) => setCarouselScroll(e.target.scrollLeft)}
      >
        {chatbots.map((bot) => (
          <div 
            key={bot.id} 
            onClick={() => onSelect(bot)} 
            className="chatbot-card flex-shrink-0 w-80 p-5 rounded-2xl border cursor-pointer bg-slate-900/30 border-white/10 hover:border-white/20 hover:bg-slate-900/50"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-800/50">
                  <Bot className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="font-semibold text-white text-base">{bot.name}</h3>
              </div>
            </div>

            <p className="text-sm text-slate-400 mb-4 line-clamp-2">
              {bot.workflow === 'agentic' 
                ? 'Agentic workflow with tools' 
                : `RAG chatbot with ${bot.collections?.length || 0} knowledge source${bot.collections?.length !== 1 ? 's' : ''}`
              }
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="p-1.5 bg-slate-800/50 rounded-lg">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="text-slate-400">Knowledge:</span>
                <span className="text-slate-300 font-medium">
                  {bot.collections && bot.collections.length > 0 
                    ? bot.collections.length === 1 
                      ? bot.collections[0] 
                      : `${bot.collections.length} sources` 
                    : 'None'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <div className="p-1.5 bg-slate-800/50 rounded-lg">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <span className="text-slate-400">Model:</span>
                <span className="text-slate-300 font-medium">{bot.llm || 'Not set'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {carouselRef.current && carouselScroll < (carouselRef.current.scrollWidth - carouselRef.current.clientWidth - 10) && (
        <button 
          onClick={() => scrollCarousel('right')} 
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-slate-900/90 hover:bg-slate-800 border border-white/10 rounded-2xl transition-all cursor-pointer shadow-lg"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      )}
    </div>
  )
}