import { Link } from 'react-router-dom';

const stats = [
    { label: 'Candidates', value: '—', color: 'accent-blue' },
    { label: 'Jobs', value: '—', color: 'accent-teal' },
    { label: 'Applications', value: '—', color: 'accent-orange' },
];

const actions = [
    {
        title: 'Search Candidates',
        description: 'Find candidates using natural language queries',
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
        link: '/admin/search',
        color: 'accent-blue',
    },
    {
        title: 'Import Data',
        description: 'Upload XLSX files to import candidates and jobs',
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
        ),
        link: '/admin/import',
        color: 'accent-orange',
    },
];

export default function Dashboard() {
    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-semibold text-white mb-2">Dashboard</h1>
                <p className="text-slate-400">Welcome to the Whitecarrot ATS admin panel</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {stats.map((stat, index) => (
                    <div
                        key={stat.label}
                        className="bg-card border border-border rounded-2xl p-6 animate-slide-up"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <p className="text-slate-400 text-sm mb-1">{stat.label}</p>
                        <p className={`text-3xl font-semibold text-${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Quick actions */}
            <div className="mb-6">
                <h2 className="text-lg font-medium text-white mb-4">Quick Actions</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {actions.map((action, index) => (
                    <Link
                        key={action.title}
                        to={action.link}
                        className="group bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:border-border-light hover:-translate-y-1 hover:shadow-xl animate-slide-up"
                        style={{ animationDelay: `${(index + 3) * 100}ms` }}
                    >
                        <div className={`w-14 h-14 rounded-xl bg-${action.color}/10 flex items-center justify-center text-${action.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                            {action.icon}
                        </div>
                        <h3 className="text-xl font-medium text-white mb-2">{action.title}</h3>
                        <p className="text-slate-400">{action.description}</p>
                        <div className={`mt-4 flex items-center gap-2 text-${action.color} text-sm font-medium`}>
                            Open
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </Link>
                ))}
            </div>

            <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out backwards;
        }
      `}</style>
        </div>
    );
}
