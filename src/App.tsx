import { Routes, Route, Navigate } from 'react-router-dom'
import TabBar from './components/Layout/TabBar'
import CalendarPage from './pages/Calendar'
import TopicPage from './pages/Topic'
import TopicDetailPage from './pages/Topic/TopicDetail'
import ProfilePage from './pages/Profile'

export default function App() {
  return (
    <div className="flex flex-col min-h-dvh bg-bg">
      <main className="flex-1 overflow-y-auto pb-20">
        <Routes>
          <Route path="/" element={<CalendarPage />} />
          <Route path="/topic" element={<TopicPage />} />
          <Route path="/topic/:id" element={<TopicDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  )
}
