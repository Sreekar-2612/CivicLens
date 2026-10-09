import { Search, AlertCircle, Loader2, Construction } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  icon: Icon = Search,
  title,
  description,
  action,
}: {
  icon?: React.ElementType
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[var(--neutral-100)] flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-[var(--neutral-400)]" />
      </div>
      <h3 className="text-base font-semibold text-[var(--navy-700)] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--neutral-500)] max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Loader2 className="w-8 h-8 text-[var(--teal-500)] animate-spin mb-3" />
      <p className="text-sm text-[var(--neutral-500)]">{message}</p>
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again later.',
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-red-400" />
      </div>
      <h3 className="text-base font-semibold text-[var(--navy-700)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--neutral-500)] max-w-sm">{description}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-secondary btn-sm mt-4">
          Try Again
        </button>
      )}
    </div>
  )
}

export function PageShell({
  title,
  description,
  icon: Icon = Construction,
}: {
  title: string
  description: string
  icon?: React.ElementType
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-5">
          <Icon className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--navy-900)] mb-2">{title}</h1>
        <p className="text-[var(--neutral-500)] max-w-md leading-relaxed">{description}</p>
        <div className="demo-badge mt-4">
          Stage 1+ — Not Yet Implemented
        </div>
      </div>
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color = 'teal',
  subtitle,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color?: 'teal' | 'amber' | 'red' | 'indigo' | 'slate'
  subtitle?: string
}) {
  const colorMap = {
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', icon: 'text-teal-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-500' },
    red: { bg: 'bg-red-50', text: 'text-red-600', icon: 'text-red-500' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: 'text-indigo-500' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-600', icon: 'text-slate-500' },
  }
  const c = colorMap[color]

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--neutral-500)] uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${c.text}`}>{value}</p>
          {subtitle && <p className="text-xs text-[var(--neutral-400)] mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
      </div>
    </div>
  )
}
