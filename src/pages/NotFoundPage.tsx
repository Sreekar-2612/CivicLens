import { Link } from 'react-router-dom'
import { ArrowLeft, Home, Search, MapPin } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <MapPin className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Error 404
          </span>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Corridor Not Found
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            The civic page or road project you are looking for has been relocated or does not exist in our public registry.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-4 h-4" /> Return to Home
          </Link>
          <Link
            to="/projects"
            className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Search className="w-4 h-4" /> Explore Public Works
          </Link>
        </div>
      </div>
    </div>
  )
}
