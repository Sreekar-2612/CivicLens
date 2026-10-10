import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles, Send, Bot, User, ArrowRight, CornerDownLeft,
  ExternalLink, Layers, AlertTriangle, Building2, CheckCircle2
} from 'lucide-react'
import { dataRepository } from '../services/dataRepository'
import type { Project, Department, CoordinationAlert, Report } from '../types'

interface Message {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
  actionLinks?: { label: string; to: string }[]
}

const INITIAL_SUGGESTIONS = [
  "Which department has the most project delays?",
  "What excavations are active on Indiranagar 100ft Road?",
  "Show me the worst repeat-digging conflicts detected",
  "How many citizen grievances are currently unresolved?",
  "Who is the lowest rated contractor?",
]

export function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I can help you find projects, reports, and coordination alerts in CivicLens. Ask about road works, departments, delays, or grievances.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [alerts, setAlerts] = useState<CoordinationAlert[]>([])
  const [reports, setReports] = useState<Report[]>([])

  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const [p, d, a, r] = await Promise.all([
        dataRepository.getProjects(),
        dataRepository.getDepartments(),
        dataRepository.getAlerts(),
        dataRepository.getReports(),
      ])
      setProjects(p)
      setDepartments(d)
      setAlerts(a)
      setReports(r)
    }
    load()
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = (queryText?: string) => {
    const text = queryText || inputValue.trim()
    if (!text) return

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsTyping(true)

    setTimeout(() => {
      generateResponse(text)
      setIsTyping(false)
    }, 700)
  }

  const generateResponse = (prompt: string) => {
    const q = prompt.toLowerCase()
    let replyText = ""
    let links: { label: string; to: string }[] = []

    if (q.includes('delay') || q.includes('most delay') || q.includes('behind')) {
      const delayed = projects.filter(p => p.status === 'delayed' || p.confidenceIndicator === 'delayed')
      replyText = `There are **${delayed.length} projects** marked delayed in the available records.\n\nExamples:\n${delayed.slice(0, 3).map(p => `• **${p.title}** on ${p.road} (${p.ward})`).join('\n') || 'No delayed projects found.'}`
      links = [
        { label: 'View Department Scorecards', to: '/scorecard' },
        { label: 'Explore All Delayed Projects', to: '/projects?status=delayed' }
      ]
    } else if (q.includes('indiranagar') || q.includes('100ft') || q.includes('road')) {
      const roadMatch = projects.filter(p => p.road.toLowerCase().includes('indiranagar') || p.road.toLowerCase().includes('100ft') || p.road.toLowerCase().includes('jm road'))
      replyText = `Found **${roadMatch.length} registered public works** along this corridor.\n\nUpcoming and active works:\n${roadMatch.map(p => `• **${p.title}** (${p.category.replace('_', ' ')}) — Status: ${p.status}, Progress: ${p.progressPercent}%`).join('\n')}`
      links = [
        { label: 'View Corridor Digging Timeline', to: `/roads/${encodeURIComponent(roadMatch[0]?.road || 'Indiranagar 100ft Road')}` }
      ]
    } else if (q.includes('conflict') || q.includes('repeat') || q.includes('clash')) {
      const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high')
      replyText = `The available records contain **${alerts.length} coordination alerts** (${criticalAlerts.length} high or critical severity). Review each alert's linked projects and dates before making a scheduling decision.`
      links = [
        { label: 'Inspect Coordination Hub', to: '/officer/coordination' },
        { label: 'Review Agency Scorecards', to: '/scorecard' }
      ]
    } else if (q.includes('report') || q.includes('grievance') || q.includes('citizen')) {
      const pending = reports.filter(r => r.status === 'submitted' || r.status === 'acknowledged')
      replyText = `The available records contain **${reports.length} citizen reports**, with **${pending.length} submitted or acknowledged**.`
      links = [
        { label: 'Lodge New Ground Report', to: '/report' },
        { label: 'Track Existing Grievance', to: '/reports/track' }
      ]
    } else if (q.includes('contractor') || q.includes('rating')) {
      replyText = `Contractor ratings are not available in this assistant. The scorecard shows the project and contractor information currently recorded.`
      links = [
        { label: 'View Contractor Transparency Table', to: '/scorecard' }
      ]
    } else {
      replyText = `I found ${projects.length} projects, ${departments.length} departments, and ${reports.length} reports in the available records. Try a road name or ask about delays, alerts, or reports.`
      links = [
        { label: 'Browse Project Explorer', to: '/projects' },
        { label: 'View Department Scorecards', to: '/scorecard' }
      ]
    }

    const aiMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      text: replyText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionLinks: links,
    }

    setMessages(prev => [...prev, aiMsg])
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-5rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              CivicLens Data Guide
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Recorded Data
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Natural language intelligence for citizens, journalists, and municipal engineers.
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.map(m => (
          <div
            key={m.id}
            className={`flex gap-3 max-w-3xl ${
              m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs ${
                m.sender === 'user' ? 'bg-indigo-600' : 'bg-gradient-to-tr from-teal-600 to-indigo-600'
              }`}
            >
              {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`rounded-2xl p-4 text-xs sm:text-sm space-y-2 shadow-sm ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-50 dark:bg-gray-900/60 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="leading-relaxed whitespace-pre-wrap font-sans">
                {m.text}
              </div>

              {m.actionLinks && m.actionLinks.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-2 border-t border-gray-200 dark:border-gray-700/60">
                  {m.actionLinks.map((link, idx) => (
                    <Link
                      key={idx}
                      to={link.to}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 text-xs font-semibold hover:shadow transition-shadow"
                    >
                      <span>{link.label}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  ))}
                </div>
              )}

              <span className={`text-[10px] block text-right ${m.sender === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                {m.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3 max-w-lg">
            <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-900 text-gray-500 text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]" />
              <span className="ml-1 text-[11px]">Querying CivicLens Data Repository...</span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Suggested Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-gray-400 font-semibold shrink-0">Try asking:</span>
        {INITIAL_SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(s)}
            className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 text-gray-600 dark:text-gray-300 whitespace-nowrap transition-colors border border-gray-200 dark:border-gray-700"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a question about projects, contractors, road digging, or civic delays..."
          className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow transition-colors flex items-center gap-1.5 disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      </form>
    </div>
  )
}
