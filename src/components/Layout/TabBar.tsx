import { NavLink, useLocation } from 'react-router-dom'

const tabs = [
  { to: '/', label: '日历', color: 'text-coral', icon: CalendarIcon },
  { to: '/topic', label: '专题', color: 'text-ocean', icon: TopicIcon },
  { to: '/profile', label: '我的', color: 'text-sage', icon: ProfileIcon },
]

export default function TabBar() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-surface/80 backdrop-blur-xl border-t border-border/60 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to)
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className="flex flex-col items-center gap-1 px-5 py-1 transition-colors"
            >
              <div className={`transition-colors duration-200 ${isActive ? tab.color : 'text-text-secondary'}`}>
                <tab.icon filled={isActive} />
              </div>
              <span className={`text-xs font-medium transition-colors duration-200 ${isActive ? tab.color : 'text-text-secondary'}`}>
                {tab.label}
              </span>
              {/* Active indicator dot */}
              {isActive && (
                <span className={`w-1 h-1 rounded-full -mt-1 ${
                  tab.to === '/' ? 'bg-coral' :
                  tab.to === '/topic' ? 'bg-ocean' : 'bg-sage'
                }`} />
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

function CalendarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.1 : 0} />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" />
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" />
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" />
    </svg>
  )
}

function TopicIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.15 : 0} />
      <circle cx="5" cy="6" r="2" fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.1 : 0} />
      <circle cx="19" cy="6" r="2" fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.1 : 0} />
      <circle cx="5" cy="18" r="2" fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.1 : 0} />
      <circle cx="19" cy="18" r="2" fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.1 : 0} />
      <line x1="9.5" y1="10" x2="6.5" y2="7.5" />
      <line x1="14.5" y1="10" x2="17.5" y2="7.5" />
      <line x1="9.5" y1="14" x2="6.5" y2="16.5" />
      <line x1="14.5" y1="14" x2="17.5" y2="16.5" />
    </svg>
  )
}

function ProfileIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.15 : 0} />
    </svg>
  )
}
