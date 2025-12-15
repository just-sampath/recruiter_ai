import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSearch } from '../../hooks/useSearch';
import { useImport } from '../../hooks/useImport';
const navItems = [
    {
        path: '/admin',
        label: 'Dashboard',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
        end: true,
    },
    {
        path: '/admin/search',
        label: 'Search',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
    },
    {
        path: '/admin/import',
        label: 'Import',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
        ),
    },
    {
        path: '/admin/settings',
        label: 'Settings',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
];

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const { loading: searchLoading } = useSearch();
    const { loading: importLoading } = useImport();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-base flex">
            {/* Sidebar */}
            <aside className="w-64 bg-card border-r border-border flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-border">
                    <a href="/" className="flex items-center gap-3">
                        <span className="text-2xl">🥕</span>
                        <span className="text-xl font-semibold text-white">Whitecarrot</span>
                    </a>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4">
                    <ul className="space-y-1">
                        {navItems.map((item) => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    end={item.end}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                            ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                                            : 'text-slate-400 hover:text-white hover:bg-elevated'
                                        }`
                                    }
                                >
                                    {item.icon}
                                    <span className="font-medium">{item.label}</span>
                                    {/* Show loading indicators */}
                                    {item.path === '/admin/search' && searchLoading && (
                                        <div className="ml-auto w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                                    )}
                                    {item.path === '/admin/import' && importLoading && (
                                        <div className="ml-auto w-4 h-4 border-2 border-accent-orange border-t-transparent rounded-full animate-spin" />
                                    )}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-elevated">
                        <div className="w-9 h-9 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue font-medium">
                            {user?.email?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-slate-400 hover:text-white hover:bg-hover rounded-lg transition-colors"
                            title="Logout"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>

            {/* Global loading toasts */}
            <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
                {searchLoading && (
                    <div className="bg-card border border-border rounded-xl p-4 shadow-lg flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-white">Search in progress...</span>
                        <NavLink
                            to="/admin/search"
                            className="text-sm text-accent-blue hover:underline"
                        >
                            View
                        </NavLink>
                    </div>
                )}
                {importLoading && (
                    <div className="bg-card border border-border rounded-xl p-4 shadow-lg flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-accent-orange border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-white">Import in progress...</span>
                        <NavLink
                            to="/admin/import"
                            className="text-sm text-accent-orange hover:underline"
                        >
                            View
                        </NavLink>
                    </div>
                )}
            </div>
        </div>
    );
}
