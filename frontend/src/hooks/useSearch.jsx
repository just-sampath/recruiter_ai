import { createContext, useContext, useState, useCallback } from 'react';
import { apiJson } from '../utils/api';

const SearchContext = createContext(null);

export function SearchProvider({ children }) {
    // Form state
    const [query, setQuery] = useState('');
    const [topK, setTopK] = useState(10);
    const [jobId, setJobId] = useState('');
    const [mode, setMode] = useState('balanced');

    // Request state
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState(null);
    const [error, setError] = useState('');

    const executeSearch = useCallback(async () => {
        if (!query.trim()) return;

        setLoading(true);
        setError('');
        setResponse(null);

        try {
            const payload = {
                query: query.trim(),
                top_k: topK,
                mode,
            };
            if (jobId) {
                payload.job_id = Number(jobId);
            }
            const data = await apiJson('/search', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            setResponse(data);
        } catch (err) {
            setError(err.message || 'Search failed');
        } finally {
            setLoading(false);
        }
    }, [query, topK, jobId, mode]);

    const clearSearch = useCallback(() => {
        setResponse(null);
        setError('');
    }, []);

    const value = {
        // Form state
        query,
        setQuery,
        topK,
        setTopK,
        jobId,
        setJobId,
        mode,
        setMode,
        // Request state
        loading,
        response,
        error,
        // Actions
        executeSearch,
        clearSearch,
    };

    return (
        <SearchContext.Provider value={value}>
            {children}
        </SearchContext.Provider>
    );
}

export function useSearch() {
    const context = useContext(SearchContext);
    if (!context) {
        throw new Error('useSearch must be used within SearchProvider');
    }
    return context;
}
