import { useSearch } from '../hooks/useSearch';

export default function Search() {
    const {
        query,
        setQuery,
        topK,
        setTopK,
        jobId,
        setJobId,
        mode,
        setMode,
        loading,
        response,
        error,
        executeSearch,
    } = useSearch();

    const handleSearch = async (e) => {
        e.preventDefault();
        executeSearch();
    };

    return (
        <div className="p-8 max-w-6xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-semibold text-white mb-2">Search Candidates</h1>
                <p className="text-slate-400">Use natural language to find the perfect candidates</p>
            </div>

            {/* Search form */}
            <form onSubmit={handleSearch} className="mb-8">
                <div className="bg-card border border-border rounded-2xl p-6">
                    {/* Query input */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Search Query
                        </label>
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., Senior backend engineers in Bangalore with Kubernetes experience who can join immediately"
                            className="w-full px-4 py-3 bg-elevated border border-border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50 transition-all resize-none h-24"
                        />
                    </div>

                    {/* Options */}
                    <div className="flex flex-wrap gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Results Count
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={50}
                                value={topK}
                                onChange={(e) => setTopK(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                                className="w-24 px-4 py-2 bg-elevated border border-border rounded-xl text-white focus:outline-none focus:border-accent-blue"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Job ID <span className="text-slate-500">(optional)</span>
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={jobId}
                                onChange={(e) => setJobId(e.target.value)}
                                placeholder="e.g., 42"
                                className="w-32 px-4 py-2 bg-elevated border border-border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent-blue"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Mode (thinking)
                            </label>
                            <select
                                value={mode}
                                onChange={(e) => setMode(e.target.value)}
                                className="px-4 py-2 bg-elevated border border-border rounded-xl text-white focus:outline-none focus:border-accent-blue"
                            >
                                <option value="fast">Fast</option>
                                <option value="balanced">Balanced</option>
                                <option value="accurate">Accurate</option>
                            </select>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="px-6 py-3 bg-accent-blue hover:bg-accent-blue-hover text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Searching...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Search
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red/20 rounded-xl text-accent-red">
                    {error}
                </div>
            )}

            {/* Results */}
            {response && (
                <div className="space-y-6">
                    {/* Response header */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h2 className="text-lg font-medium text-white">
                            Results ({response.results?.length || 0} candidates)
                        </h2>
                        {response.search_strategy && (
                            <span className="px-3 py-1 bg-accent-blue/10 text-accent-blue text-sm font-medium rounded-lg">
                                Strategy: {response.search_strategy}
                            </span>
                        )}
                    </div>

                    {/* Extracted filters */}
                    {response.extracted_filters && (
                        <div className="bg-card border border-border rounded-xl p-4">
                            <h3 className="text-sm font-medium text-slate-300 mb-3">Extracted Filters</h3>
                            <div className="flex flex-wrap gap-2">
                                {response.extracted_filters.locations?.length > 0 && (
                                    <span className="px-3 py-1 bg-accent-teal/10 text-accent-teal text-sm rounded-lg">
                                        📍 {response.extracted_filters.locations.join(', ')}
                                    </span>
                                )}
                                {response.extracted_filters.skills?.length > 0 && (
                                    <span className="px-3 py-1 bg-accent-orange/10 text-accent-orange text-sm rounded-lg">
                                        🛠️ {response.extracted_filters.skills.join(', ')}
                                    </span>
                                )}
                                {response.extracted_filters.can_join_immediately && (
                                    <span className="px-3 py-1 bg-accent-green/10 text-accent-green text-sm rounded-lg">
                                        ⚡ Immediate Joiner
                                    </span>
                                )}
                                {response.extracted_filters.experience_min !== undefined && (
                                    <span className="px-3 py-1 bg-elevated text-slate-300 text-sm rounded-lg">
                                        📊 {response.extracted_filters.experience_min}+ years
                                    </span>
                                )}
                                {response.extracted_filters.notice_period_max !== undefined && (
                                    <span className="px-3 py-1 bg-elevated text-slate-300 text-sm rounded-lg">
                                        ⏱️ ≤{response.extracted_filters.notice_period_max} days notice
                                    </span>
                                )}
                            </div>
                            {response.strategy_explanation && (
                                <p className="mt-3 text-sm text-slate-400">{response.strategy_explanation}</p>
                            )}
                        </div>
                    )}

                    {/* Results table */}
                    {response.results?.length > 0 && (
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border bg-elevated">
                                        <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Candidate ID</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Match Score</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Matched On</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Explanation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {response.results.map((result, index) => (
                                        <tr
                                            key={result.candidate_id || index}
                                            className="border-b border-border last:border-b-0 hover:bg-elevated/50 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-white">#{result.candidate_id}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-1 rounded-md text-sm font-medium ${result.match_score >= 70
                                                        ? 'bg-accent-green/10 text-accent-green'
                                                        : result.match_score >= 50
                                                            ? 'bg-accent-orange/10 text-accent-orange'
                                                            : 'bg-slate-500/10 text-slate-400'
                                                    }`}>
                                                    {result.match_score}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-300">{result.matched_on}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-slate-400 max-w-md">{result.explanation}</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {response.results?.length === 0 && (
                        <div className="text-center py-12 text-slate-400 bg-card border border-border rounded-xl">
                            No candidates found matching your query
                        </div>
                    )}
                </div>
            )}

            {/* Loading indicator visible from other pages */}
            {loading && (
                <div className="fixed bottom-6 right-6 bg-card border border-border rounded-xl p-4 shadow-lg flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-white">Search in progress...</span>
                </div>
            )}
        </div>
    );
}
