import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield, Database, Download, RefreshCw, CheckCircle2,
  AlertTriangle, Users, HardDrive, Key, FileCheck, Layers,
  Terminal, Server, Copy, Check
} from 'lucide-react'
import { dataRepository } from '../services/dataRepository'
import { checkSupabaseConnection } from '../services/supabaseClient'
import type { Project, Department, Report, CoordinationAlert, SummaryStats } from '../types'

export function AdminPage() {
  const [stats, setStats] = useState<SummaryStats | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [alerts, setAlerts] = useState<CoordinationAlert[]>([])
  const [exporting, setExporting] = useState(false)
  const [exportedSuccess, setExportedSuccess] = useState(false)
  const [dbStatus, setDbStatus] = useState<{ configured: boolean; connected: boolean; errorMessage?: string } | null>(null)
  const [checkingDb, setCheckingDb] = useState(false)
  const [copiedSnippet, setCopiedSnippet] = useState(false)

  const checkDb = async () => {
    setCheckingDb(true)
    const status = await checkSupabaseConnection()
    setDbStatus(status)
    setCheckingDb(false)
  }

  useEffect(() => {
    async function load() {
      const [s, p, r, d, a] = await Promise.all([
        dataRepository.getSummaryStats(),
        dataRepository.getProjects(),
        dataRepository.getReports(),
        dataRepository.getDepartments(),
        dataRepository.getAlerts(),
      ])
      setStats(s)
      setProjects(p)
      setReports(r)
      setDepartments(d)
      setAlerts(a)
    }
    load()
    checkDb()
  }, [])

  const handleExportJSON = () => {
    setExporting(true)
    const exportData = {
      exportedAt: new Date().toISOString(),
      system: 'SpadeWork Transparency Core',
      stats,
      departments,
      projects,
      coordinationAlerts: alerts,
      reports,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spadework-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
    setExportedSuccess(true)
    setTimeout(() => setExportedSuccess(false), 3000)
  }

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(`VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-key`)
    setCopiedSnippet(true)
    setTimeout(() => setCopiedSnippet(false), 2000)
  }

  const storageInfo = dataRepository.getDataSourceMode()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
              System Governance
            </span>
            <span className="text-xs text-gray-500">• Municipal Data Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">
            SpadeWork Admin &amp; Database Engine
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Database connection diagnostic, automated migration guides, audit trails, and live dataset exports.
          </p>
        </div>

        <button
          onClick={handleExportJSON}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs sm:text-sm shadow transition-colors flex items-center gap-2 self-start sm:self-center"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting...' : 'Export Complete Dataset JSON'}
        </button>
      </div>

      {exportedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Complete civic repository exported successfully to your downloads folder.</span>
        </div>
      )}

      {/* Database Diagnostic Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700/60 pb-3">
          <div className="flex items-center gap-2.5">
            <Server className={`w-5 h-5 ${storageInfo.isSupabase ? 'text-emerald-500' : 'text-amber-500'}`} />
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                PostgreSQL / Supabase Integration Status
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Storage Engine: <strong>{storageInfo.label}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={checkDb}
            disabled={checkingDb}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold hover:bg-gray-50 text-gray-700 dark:text-gray-300 flex items-center gap-1.5 self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingDb ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>
        </div>

        {dbStatus && (
          <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${
            dbStatus.connected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300'
          }`}>
            <div className="font-bold flex items-center gap-1.5">
              {dbStatus.connected ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
              <span>{dbStatus.connected ? 'Active Live Connection to Supabase PostgreSQL' : 'Supabase Credentials Not Yet Configured in .env.local'}</span>
            </div>
            <p className="leading-relaxed">
              {dbStatus.errorMessage || 'Connected successfully. All queries and project mutations are executing directly against the remote Supabase database.'}
            </p>
          </div>
        )}

        {/* Step-by-step connection guide */}
        <div className="space-y-3 pt-2 text-xs">
          <span className="font-bold uppercase tracking-wider text-gray-500">
            How to Connect Your Supabase PostgreSQL Project:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 space-y-2">
              <span className="font-bold text-gray-900 dark:text-white block">
                Step 1: Execute Schema Migration
              </span>
              <p className="text-gray-600 dark:text-gray-400">
                Run the version-controlled SQL migration in your Supabase SQL Editor:
              </p>
              <div className="font-mono text-[11px] bg-slate-900 text-slate-200 p-2 rounded-lg">
                supabase/migrations/20261010000000_create_core_schema.sql
              </div>
              <p className="text-[11px] text-gray-500">
                Then run <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">supabase/seed.sql</code> to load reproducible demo data.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 dark:text-white">
                  Step 2: Add Keys to .env.local
                </span>
                <button
                  type="button"
                  onClick={handleCopyEnv}
                  className="text-[11px] text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                >
                  {copiedSnippet ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSnippet ? 'Copied' : 'Copy Template'}</span>
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Create a file named <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded font-bold">.env.local</code> in project root:
              </p>
              <pre className="font-mono text-[11px] bg-slate-900 text-slate-200 p-2 rounded-lg overflow-x-auto">
{`VITE_SUPABASE_URL=https://[YOUR_PROJECT].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Database Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>Capital Projects</span>
            <Database className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-2">{projects.length}</div>
          <span className="text-[11px] text-gray-400">Published work orders</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>Citizen Grievances</span>
            <FileCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-2">{reports.length}</div>
          <span className="text-[11px] text-gray-400">Ground-truth reports</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>Coordination Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-2">{alerts.length}</div>
          <span className="text-[11px] text-gray-400">Spatial-temporal clashes</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>Civic Agencies</span>
            <Shield className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-2">{departments.length}</div>
          <span className="text-[11px] text-gray-400">Integrated departments</span>
        </div>
      </div>

      {/* Departments Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white">Registered Civic Agencies</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">Dept ID</th>
                <th className="px-4 py-3">Agency Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Projects</th>
                <th className="px-6 py-3">Official Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {departments.map(d => {
                const count = projects.filter(p => p.departmentId === d.id).length
                return (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-6 py-3 font-mono font-semibold text-gray-500">{d.id}</td>
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">{d.shortName}</td>
                    <td className="px-4 py-3 font-bold">{count} work orders</td>
                    <td className="px-6 py-3 text-gray-500">{d.contactEmail || 'contact@civiclens.gov.in'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
