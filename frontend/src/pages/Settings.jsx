import { useState, useEffect } from 'react';
import { getApiUrl, setApiUrl, getAuthToken, setAuthToken } from '../utils/api';

export default function Settings() {
    const [apiUrlValue, setApiUrlValue] = useState('');
    const [tokenValue, setTokenValue] = useState('');
    const [testStatus, setTestStatus] = useState(null);
    const [testing, setTesting] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setApiUrlValue(getApiUrl());
        setTokenValue(getAuthToken() || '');
    }, []);

    const handleSave = () => {
        setApiUrl(apiUrlValue);
        if (tokenValue) {
            setAuthToken(tokenValue);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleTest = async () => {
        setTesting(true);
        setTestStatus(null);

        try {
            const response = await fetch(`${apiUrlValue}/auth/login`, {
                method: 'OPTIONS',
            });
            // If we get any response (even error), the API is reachable
            setTestStatus({ success: true, message: 'API is reachable' });
        } catch (err) {
            setTestStatus({ success: false, message: 'Cannot reach API server' });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-semibold text-white mb-2">Settings</h1>
                <p className="text-slate-400">Configure API connection and authentication</p>
            </div>

            {/* API Settings */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                {/* API URL */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        API Base URL
                    </label>
                    <input
                        type="url"
                        value={apiUrlValue}
                        onChange={(e) => setApiUrlValue(e.target.value)}
                        className="w-full px-4 py-3 bg-elevated border border-border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50 transition-all"
                        placeholder="http://localhost:3000/api"
                    />
                    <p className="mt-2 text-sm text-slate-500">
                        The base URL for all API requests
                    </p>
                </div>

                {/* JWT Token */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        JWT Token
                    </label>
                    <textarea
                        value={tokenValue}
                        onChange={(e) => setTokenValue(e.target.value)}
                        className="w-full px-4 py-3 bg-elevated border border-border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50 transition-all font-mono text-sm resize-none h-24"
                        placeholder="eyJhbGciOiJIUzI1NiIs..."
                    />
                    <p className="mt-2 text-sm text-slate-500">
                        Bearer token for authentication (from bootstrap-superadmin script)
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={handleSave}
                        className="px-6 py-3 bg-accent-blue hover:bg-accent-blue-hover text-white font-medium rounded-xl transition-all duration-200 flex items-center gap-2"
                    >
                        {saved ? (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Saved!
                            </>
                        ) : (
                            'Save Settings'
                        )}
                    </button>

                    <button
                        onClick={handleTest}
                        disabled={testing}
                        className="px-6 py-3 bg-elevated border border-border hover:bg-hover text-white font-medium rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                    >
                        {testing ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Testing...
                            </>
                        ) : (
                            'Test Connection'
                        )}
                    </button>
                </div>

                {/* Test status */}
                {testStatus && (
                    <div className={`p-4 rounded-xl ${testStatus.success
                            ? 'bg-accent-green/10 border border-accent-green/20 text-accent-green'
                            : 'bg-accent-red/10 border border-accent-red/20 text-accent-red'
                        }`}>
                        <div className="flex items-center gap-2">
                            {testStatus.success ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                            {testStatus.message}
                        </div>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="mt-8 p-4 bg-elevated/50 rounded-xl">
                <h4 className="text-sm font-medium text-white mb-2">Getting Started</h4>
                <ol className="text-sm text-slate-400 list-decimal list-inside space-y-1">
                    <li>Run the backend server: <code className="text-accent-blue">bun run dev</code></li>
                    <li>Generate a token: <code className="text-accent-blue">bun run scripts/bootstrap-superadmin.js</code></li>
                    <li>Paste the JWT token above and save</li>
                </ol>
            </div>
        </div>
    );
}
