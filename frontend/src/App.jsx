// src/App.jsx
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ChatPage from './pages/ChatPage'
import ChatbotsPage from './pages/ChatbotsPage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import EvaluationPage from './pages/EvaluationPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/chatbots" element={<ChatbotsPage />} />
        <Route path="/knowledge_base" element={<KnowledgeBasePage />} />
        <Route path="/evaluation" element={<EvaluationPage />} />
      </Routes>
    </Layout>
  )
}

export default App