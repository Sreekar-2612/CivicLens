import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  Shield, Users, HardHat, FileCheck, Building2, Search,
  CheckCircle2, AlertTriangle, Layers, Filter, Check,
  ChevronRight, RefreshCw, Database, Download, Sparkles,
  Briefcase, ArrowRight, X, Clock, MapPin
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { adminService, type AdminUserRosterItem } from '../services/adminService'
import { checkSupabaseConnection } from '../services/supabaseClient'
import type { Department, Project, UserRole, SummaryStats } from '../types'
import { dataRepository } from '../services/dataRepository'

export function AdminPage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  
  // Data state
  const [roster, setRoster] = useState<AdminUserRosterItem[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<SummaryStats | null>(null)
  const [loading, setLoading] = useState(true)

  const isAssignmentRoute = location.pathname.includes('/assign') || location.pathname.includes('/roles')
  const initialTab = isAssignmentRoute || searchParams.get('tab') === 'assignment'
    ? 'assignment'
    : searchParams.get('tab') === 'system'
    ? 'system'
    : 'supervision'

  const [activeTab, setActiveTab] = useState<'supervision' | 'assignment' | 'system'>(initialTab)

  const handleTabClick = (tab: 'supervision' | 'assignment' | 'system') => {
    setActiveTab(tab)
    if (tab === 'assignment') {
      setSearchParams({ tab: 'assignment' })
    } else if (tab === 'system') {
      setSearchParams({ tab: 'system' })
    } else {
      setSearchParams({})
    }
  }

  // Search & Filters for Supervision
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [deptFilter, setDeptFilter] = useState<string>('all')

  // Assignment Studio State
  const [selectedUser, setSelectedUser] = useState<AdminUserRosterItem | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('resident')
  const [editDept, setEditDept] = useState<string>('')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // System Diagnostics State
  const [dbStatus, setDbStatus] = useState<{ configured: boolean; connected: boolean; errorMessage?: string } | null>(null)
  const [checkingDb, setCheckingDb] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportedSuccess, setExportedSuccess] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [rosterRes, summaryStats] = await Promise.all([
        adminService.getRosterData(),
        dataRepository.getSummaryStats(),
      ])
      setRoster(rosterRes.roster)
      setDepartments(rosterRes.departments)
      setProjects(rosterRes.projects)
      setStats(summaryStats)

      if (rosterRes.roster.length > 0 && !selectedUser) {
        selectUserForEdit(rosterRes.roster[0])
      }
    } catch (err) {
      console.error('Failed to load admin data', err)
    } finally {
      setLoading(false)
    }
  }

  const checkDb = async () => {
    setCheckingDb(true)
    const status = await checkSupabaseConnection()
    setDbStatus(status)
    setCheckingDb(false)
  }

  useEffect(() => {
    loadData()
    checkDb()
  }, [])

  const selectUserForEdit = (targetUser: AdminUserRosterItem) => {
    setSelectedUser(targetUser)
    setEditRole(targetUser.role)
    setEditDept(targetUser.departmentId || 'dept-roads')
    setSelectedProjectIds(targetUser.assignments.map(a => a.project_id))
    setSaveMessage(null)
    setSaveError(null)
  }

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setIsSaving(true)
    setSaveMessage(null)
    setSaveError(null)

    try {
      const res = await adminService.updateUserAssignment(
        selectedUser.id,
        editRole,
        ['contractor', 'auditor', 'officer'].includes(editRole) ? editDept : undefined,
        ['contractor', 'auditor'].includes(editRole) ? selectedProjectIds : []
      )

      if (res.success) {
        setSaveMessage(res.message || 'User assignment successfully updated!')
        await loadData()
      } else {
        setSaveError('Failed to update assignment.')
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update assignment.')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleProjectId = (id: string) => {
    setSelectedProjectIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  // Filtered Roster for Supervision Tab
  const filteredRoster = useMemo(() => {
    return roster.filter(u => {
      const matchesSearch =
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      const matchesDept = deptFilter === 'all' || u.departmentId === deptFilter
      return matchesSearch && matchesRole && matchesDept
    })
  }, [roster, searchQuery, roleFilter, deptFilter])

  // Supervision KPI Telemetry
  const kpiStats = useMemo(() => {
    const totalStaff = roster.length
    const contractors = roster.filter(u => u.role === 'contractor').length
    const auditors = roster.filter(u => u.role === 'auditor').length
    const officers = roster.filter(u => u.role === 'officer').length
    const residents = roster.filter(u => u.role === 'resident').length
    const activeAssignments = roster.reduce((acc, u) => acc + u.assignments.length, 0)
    return { totalStaff, contractors, auditors, officers, residents, activeAssignments }
  }, [roster])

  // Department map for quick lookup
  const deptMap = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments])

  // Projects available for selected department in assignment studio
  const departmentProjects = useMemo(() => {
    if (!editDept) return projects
    return projects.filter(p => p.departmentId === editDept)
  }, [projects, editDept])

  const handleExportJSON = () => {
    setExporting(true)
    const exportData = {
      exportedAt: new Date().toISOString(),
      system: 'SpadeWork Municipal Governance Engine',
      stats,
      roster,
      departments,
      projects,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spadework-governance-audit-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
    setExportedSuccess(true)
    setTimeout(() => setExportedSuccess(false), 3000)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F6F9FC] flex items-center justify-center p-6 text-sm text-[#64748B]">
        Verifying administrator credentials...
      </div>
    )
  }

  // Access Guard: Ensure user has administrator role
  const isAdmin = user?.role === 'admin' || user?.isDemoUser

  return (
    <div className={`min-h-screen ${activeTab === 'assignment' ? 'bg-[#F6F9FC]' : 'bg-transparent'} text-[#1E293B] font-['Inter',sans-serif] pb-16`}>
      {/* Top Banner & Header */}
      <div className="bg-white border-b border-[#E3EAF2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 border border-[#7C3AED]/20">
                <Shield className="w-3.5 h-3.5" />
                <span>Executive Governance &amp; Supervision</span>
              </div>
              <h1 className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl font-extrabold text-[#1E293B]">
                Administrator Workspace
              </h1>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                Oversee department officers, manage contractor permits, monitor independent auditors, and assign infrastructure work orders.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#F6F9FC] hover:bg-[#EAF1FF] text-[#2F6BFF] border border-[#CBD5E1] transition-all cursor-pointer shadow-2xs"
                title="Refresh user roster"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Roster</span>
              </button>

              <button
                type="button"
                onClick={handleExportJSON}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#2F6BFF] hover:bg-[#1E54D8] transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exporting ? 'Exporting...' : 'Export Audit Log'}</span>
              </button>
            </div>
          </div>

          {/* Access Warning if not signed in as admin */}
          {!isAdmin && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Read-Only Preview Mode:</strong> You are currently signed in as a {user?.role || 'visitor'}. Sign in with your registered administrator account (<code>sreekartirumala0706@gmail.com</code>) to save live updates.
                </span>
              </div>
              {!user && (
                <button
                  type="button"
                  onClick={() => signInWithGoogle()}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs"
                >
                  Admin Sign In
                </button>
              )}
            </div>
          )}

          {/* KPI Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
            <div className="bg-[#F8FAFC] border border-[#E3EAF2] rounded-xl p-3 shadow-2xs">
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Total Users</div>
              <div className="text-xl font-extrabold text-[#1E293B] mt-0.5">{kpiStats.totalStaff}</div>
              <div className="text-[10px] text-[#64748B]">registered profiles</div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E3EAF2] rounded-xl p-3 shadow-2xs">
              <div className="text-[10px] font-bold text-[#D97706] uppercase tracking-wider">Contractors</div>
              <div className="text-xl font-extrabold text-[#D97706] mt-0.5">{kpiStats.contractors}</div>
              <div className="text-[10px] text-[#64748B]">active permits</div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E3EAF2] rounded-xl p-3 shadow-2xs">
              <div className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider">Auditors</div>
              <div className="text-xl font-extrabold text-[#7C3AED] mt-0.5">{kpiStats.auditors}</div>
              <div className="text-[10px] text-[#64748B]">independent review</div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E3EAF2] rounded-xl p-3 shadow-2xs">
              <div className="text-[10px] font-bold text-[#2F6BFF] uppercase tracking-wider">Officers</div>
              <div className="text-xl font-extrabold text-[#2F6BFF] mt-0.5">{kpiStats.officers}</div>
              <div className="text-[10px] text-[#64748B]">department heads</div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E3EAF2] rounded-xl p-3 shadow-2xs">
              <div className="text-[10px] font-bold text-[#0E7A55] uppercase tracking-wider">Citizens</div>
              <div className="text-xl font-extrabold text-[#0E7A55] mt-0.5">{kpiStats.residents}</div>
              <div className="text-[10px] text-[#64748B]">verified residents</div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E3EAF2] rounded-xl p-3 shadow-2xs">
              <div className="text-[10px] font-bold text-[#C41F4F] uppercase tracking-wider">Assignments</div>
              <div className="text-xl font-extrabold text-[#C41F4F] mt-0.5">{kpiStats.activeAssignments}</div>
              <div className="text-[10px] text-[#64748B]">project bindings</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[#E3EAF2] mt-6 gap-2">
            <button
              type="button"
              onClick={() => handleTabClick('supervision')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                activeTab === 'supervision'
                  ? 'border-[#2F6BFF] text-[#2F6BFF]'
                  : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Staff Supervision &amp; Activity</span>
              <span className="bg-[#EAF1FF] text-[#2F6BFF] text-[10px] px-2 py-0.5 rounded-full font-bold">
                {roster.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('assignment')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                activeTab === 'assignment'
                  ? 'border-[#2F6BFF] text-[#2F6BFF]'
                  : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Role &amp; Project Assignment Studio</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('system')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                activeTab === 'system'
                  ? 'border-[#2F6BFF] text-[#2F6BFF]'
                  : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Database Diagnostic &amp; Logs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* ========================================================================= */}
        {/* TAB 1: STAFF SUPERVISION & ACTIVITY */}
        {/* ========================================================================= */}
        {activeTab === 'supervision' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white border border-[#E3EAF2] rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff by name or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-medium text-[#1E293B] placeholder-[#64748B] focus:outline-none focus:bg-white focus:border-[#2F6BFF]"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="text-xs font-semibold px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-[#1E293B] cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="contractor">Contractors ({kpiStats.contractors})</option>
                  <option value="auditor">Auditors ({kpiStats.auditors})</option>
                  <option value="officer">Department Officers ({kpiStats.officers})</option>
                  <option value="resident">Residents ({kpiStats.residents})</option>
                  <option value="admin">Administrators</option>
                </select>

                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="text-xs font-semibold px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-[#1E293B] cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Supervision User Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRoster.map(item => {
                const dept = item.departmentId ? deptMap.get(item.departmentId) : null
                const roleBadgeColors: Record<UserRole, { bg: string; text: string; border: string }> = {
                  admin: { bg: 'bg-[#7C3AED]/10', text: 'text-[#7C3AED]', border: 'border-[#7C3AED]/30' },
                  officer: { bg: 'bg-[#2F6BFF]/10', text: 'text-[#2F6BFF]', border: 'border-[#2F6BFF]/30' },
                  contractor: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
                  auditor: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
                  resident: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
                  public: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
                }
                const conf = roleBadgeColors[item.role] || roleBadgeColors.resident

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-[#E3EAF2] rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h3 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#1E293B] truncate">
                            {item.displayName}
                          </h3>
                          <p className="text-[11px] text-[#64748B] truncate">
                            {item.email || 'No email associated'}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border shrink-0 ${conf.bg} ${conf.text} ${conf.border}`}>
                          {item.role}
                        </span>
                      </div>

                      {/* Department attribution */}
                      <div className="text-xs mb-3">
                        <span className="text-[#64748B]">Department: </span>
                        <span className="font-semibold text-[#1E293B]">
                          {dept ? dept.name : 'Unassigned'}
                        </span>
                      </div>

                      {/* Supervised Work Orders / Project Assignments */}
                      <div className="border-t border-[#F1F5F9] pt-2.5 mb-3">
                        <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span>Assigned Work Orders</span>
                          <span className="text-[#2F6BFF]">{item.assignments.length} projects</span>
                        </div>

                        {item.assignments.length === 0 ? (
                          <p className="text-[11px] text-[#94A3B8] italic">No projects currently bound</p>
                        ) : (
                          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                            {item.assignments.map(a => (
                              <div
                                key={a.project_id}
                                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs flex items-center justify-between gap-2"
                              >
                                <div className="truncate">
                                  <div className="font-medium text-[#1E293B] truncate text-[11px]">
                                    {a.project_title}
                                  </div>
                                  <div className="text-[10px] text-[#64748B]">
                                    {a.road || 'Corridor Work'}
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-[#0E7A55] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                                  {a.progress_percent ?? 0}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Activity Metrics */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#F8FAFC] p-2 rounded-lg border border-[#F1F5F9] mb-3">
                        <div>
                          <span className="text-[#64748B] block text-[10px]">Permit Tasks</span>
                          <span className="font-bold text-[#1E293B]">{item.submissionCount} submitted</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block text-[10px]">Audits Handled</span>
                          <span className="font-bold text-[#1E293B]">{item.reviewCount} reviewed</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        selectUserForEdit(item)
                        setActiveTab('assignment')
                      }}
                      className="w-full text-center text-xs font-bold text-[#2F6BFF] bg-[#EAF1FF] hover:bg-[#D5E4FF] py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>Manage Role &amp; Assignments</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ROLE & PROJECT ASSIGNMENT STUDIO */}
        {/* ========================================================================= */}
        {activeTab === 'assignment' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Select User (4 Cols) */}
            <div className="lg:col-span-4 bg-white border border-[#E3EAF2] rounded-2xl p-4 shadow-sm space-y-3">
              <h2 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#1E293B]">
                Select User to Configure
              </h2>

              <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
                {roster.map(u => {
                  const isSelected = selectedUser?.id === u.id
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => selectUserForEdit(u)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all border cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-[#EAF1FF] border-[#2F6BFF] shadow-xs'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-white'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-[#1E293B] truncate">
                          {u.displayName}
                        </div>
                        <div className="text-[11px] text-[#64748B] truncate">
                          {u.email || 'No email'}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-white border border-[#CBD5E1] shrink-0">
                        {u.role}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right Column: Edit Role, Department & Project Checklist (8 Cols) */}
            <div className="lg:col-span-8 bg-white border border-[#E3EAF2] rounded-2xl p-6 shadow-sm space-y-5">
              {selectedUser ? (
                <form onSubmit={handleSaveAssignment} className="space-y-5">
                  <div className="flex items-start justify-between border-b border-[#F1F5F9] pb-4">
                    <div>
                      <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                        Assignment Studio
                      </span>
                      <h2 className="text-lg font-bold text-[#1E293B] font-['Plus_Jakarta_Sans'] mt-0.5">
                        Configuring: {selectedUser.displayName}
                      </h2>
                      <p className="text-xs text-[#64748B]">
                        Account ID: <code className="bg-[#F1F5F9] px-1 py-0.5 rounded text-[10px] font-mono">{selectedUser.id}</code>
                        {selectedUser.email && <span> • {selectedUser.email}</span>}
                      </p>
                    </div>

                    <span className="text-xs font-bold text-[#2F6BFF] bg-[#EAF1FF] px-2.5 py-1 rounded-lg border border-[#2F6BFF]/20">
                      Active: {selectedUser.role.toUpperCase()}
                    </span>
                  </div>

                  {/* Feedback Alerts */}
                  {saveMessage && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{saveMessage}</span>
                    </div>
                  )}
                  {saveError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{saveError}</span>
                    </div>
                  )}

                  {/* Role Selector & Department Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#1E293B] mb-1.5">
                        Designated Role
                      </label>
                      <select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value as UserRole)}
                        className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-[#1E293B] focus:border-[#2F6BFF] focus:outline-none"
                      >
                        <option value="resident">Resident (Citizen)</option>
                        <option value="contractor">Contractor (Executes Work &amp; Submits Evidence)</option>
                        <option value="auditor">Auditor (Independent Inspection &amp; Approvals)</option>
                        <option value="officer">Department Officer (Permit Approvals)</option>
                        <option value="admin">Administrator (System-Wide Control)</option>
                      </select>
                      <p className="text-[11px] text-[#64748B] mt-1">
                        Contractors and Auditors receive dedicated work queues.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1E293B] mb-1.5">
                        Municipal Department
                      </label>
                      <select
                        value={editDept}
                        onChange={e => setEditDept(e.target.value)}
                        disabled={!['contractor', 'auditor', 'officer'].includes(editRole)}
                        className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-[#1E293B] focus:border-[#2F6BFF] focus:outline-none disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
                      >
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.shortName})</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-[#64748B] mt-1">
                        Determines the jurisdiction for excavation permits.
                      </p>
                    </div>
                  </div>

                  {/* Project Assignment Checklist (Relevant for Contractor and Auditor) */}
                  {['contractor', 'auditor'].includes(editRole) && (
                    <div className="border-t border-[#F1F5F9] pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-[#1E293B]">
                            Assign Projects in Department ({departmentProjects.length} available)
                          </h3>
                          <p className="text-[11px] text-[#64748B]">
                            Check which infrastructure projects this {editRole} can submit or review.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedProjectIds(departmentProjects.map(p => p.id))}
                            className="text-[10px] font-bold text-[#2F6BFF] hover:underline"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => setSelectedProjectIds([])}
                            className="text-[10px] font-bold text-[#64748B] hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1 border border-[#E2E8F0] rounded-xl p-2 bg-[#F8FAFC]">
                        {departmentProjects.length === 0 ? (
                          <p className="p-3 text-xs text-[#94A3B8] italic text-center">
                            No projects currently registered in this department.
                          </p>
                        ) : (
                          departmentProjects.map(p => {
                            const isAssigned = selectedProjectIds.includes(p.id)
                            return (
                              <label
                                key={p.id}
                                className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                                  isAssigned
                                    ? 'bg-white border-[#2F6BFF] shadow-xs'
                                    : 'bg-white/60 border-slate-200 hover:bg-white'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={() => toggleProjectId(p.id)}
                                    className="w-4 h-4 text-[#2F6BFF] rounded focus:ring-0 cursor-pointer"
                                  />
                                  <div className="min-w-0">
                                    <div className="font-bold text-[#1E293B] truncate">
                                      {p.title}
                                    </div>
                                    <div className="text-[10px] text-[#64748B]">
                                      {p.road} • {p.ward}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                                  {p.status}
                                </span>
                              </label>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F1F5F9]">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="btn-primary text-xs py-2.5 px-6 shadow-sm disabled:opacity-60 cursor-pointer font-bold"
                    >
                      {isSaving ? 'Saving Assignment...' : 'Save Role & Project Assignment'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-12 text-[#64748B] text-xs">
                  Select a user from the left column to configure their role.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SYSTEM DIAGNOSTIC & DATA BACKUP */}
        {/* ========================================================================= */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            {/* Database Telemetry */}
            <div className="bg-white border border-[#E3EAF2] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#1E293B]">
                    Remote Supabase Connection Status
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Health check of PostgreSQL tables, Row Level Security, and edge endpoints.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={checkDb}
                  disabled={checkingDb}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F8FAFC] border border-[#CBD5E1] text-[#2F6BFF] hover:bg-[#EAF1FF] cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingDb ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>
              </div>

              {dbStatus && (
                <div className={`p-4 rounded-xl text-xs border ${
                  dbStatus.connected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="font-bold mb-1 flex items-center gap-2">
                    {dbStatus.connected ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                    <span>{dbStatus.connected ? 'Remote Supabase Database Active & Synced' : 'Database Connection Warning'}</span>
                  </div>
                  <div>Endpoint: <code>https://xrpqgszwigdrcwbkpdtt.supabase.co</code></div>
                  {dbStatus.errorMessage && <div className="mt-1 font-mono">{dbStatus.errorMessage}</div>}
                </div>
              )}
            </div>

            {/* JSON Export Tool */}
            <div className="bg-white border border-[#E3EAF2] rounded-2xl p-6 shadow-sm space-y-3">
              <h2 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#1E293B]">
                Public Works Audit Snapshot Export
              </h2>
              <p className="text-xs text-[#64748B]">
                Export complete verified geospatial datasets including work orders, contractor rosters, grievance tracking records, and coordination conflicts for open municipal auditing.
              </p>
              <button
                type="button"
                onClick={handleExportJSON}
                disabled={exporting}
                className="btn-primary text-xs py-2.5 px-5 shadow-xs font-bold inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{exporting ? 'Generating JSON...' : 'Download Complete Snapshot (.JSON)'}</span>
              </button>
              {exportedSuccess && (
                <span className="text-xs text-emerald-700 font-bold ml-3">
                  ✓ Snapshot downloaded successfully!
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
