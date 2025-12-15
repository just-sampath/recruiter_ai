import { Link } from 'react-router-dom';

const roles = [
    {
        id: 'admin',
        title: 'Admin Portal',
        description: 'Full system access and configuration',
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
        ),
        color: 'accent-blue',
        link: '/login',
    },
    {
        id: 'recruiter',
        title: 'Recruiter Portal',
        description: 'Manage jobs and candidates',
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        ),
        color: 'accent-teal',
        link: '/coming-soon?role=recruiter',
    },
    {
        id: 'candidate',
        title: 'Candidate Portal',
        description: 'Track your applications',
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
        color: 'accent-orange',
        link: '/coming-soon?role=candidate',
    },
];

export default function Home() {
    return (
        <div className="min-h-screen bg-base text-white relative overflow-hidden">
            {/* Aurora background effect */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent-blue/10 rounded-full blur-[120px]" />
                <div className="absolute top-20 left-1/3 w-[400px] h-[300px] bg-accent-teal/8 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
                {/* Logo */}
                <div className="flex items-center gap-3 mb-12 animate-fade-in">
                    <span className="text-4xl">🥕</span>
                    <h1 className="text-3xl font-semibold tracking-tight">Whitecarrot</h1>
                </div>

                {/* Welcome text */}
                <div className="text-center mb-12 animate-fade-in" style={{ animationDelay: '100ms' }}>
                    <h2 className="text-4xl font-semibold mb-3">Welcome</h2>
                    <p className="text-slate-400 text-lg">Select your portal to continue</p>
                </div>

                {/* Role cards */}
                <div className="flex flex-col md:flex-row gap-6 max-w-4xl w-full">
                    {roles.map((role, index) => (
                        <Link
                            key={role.id}
                            to={role.link}
                            className="group flex-1 bg-card border border-border rounded-2xl p-8 transition-all duration-300 hover:border-border-light hover:-translate-y-1 hover:shadow-xl animate-slide-up"
                            style={{ animationDelay: `${(index + 2) * 100}ms` }}
                        >
                            <div className={`w-14 h-14 rounded-xl bg-${role.color}/10 flex items-center justify-center text-${role.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                {role.icon}
                            </div>
                            <h3 className="text-xl font-medium mb-2">{role.title}</h3>
                            <p className="text-slate-400">{role.description}</p>
                            <div className={`mt-6 flex items-center gap-2 text-${role.color} text-sm font-medium`}>
                                Continue
                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Footer */}
                <p className="mt-16 text-slate-500 text-sm animate-fade-in" style={{ animationDelay: '500ms' }}>
                    Whitecarrot Technologies
                </p>
            </div>

            <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out backwards;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out backwards;
        }
      `}</style>
        </div>
    );
}
