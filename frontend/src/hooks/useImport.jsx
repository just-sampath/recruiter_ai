import { createContext, useContext, useState, useCallback } from 'react';
import { getApiUrl, getAuthToken } from '../utils/api';

const ImportContext = createContext(null);

export function ImportProvider({ children }) {
    // Form state
    const [file, setFile] = useState(null);
    const [shouldTruncate, setShouldTruncate] = useState(false);

    // Request state
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const executeImport = useCallback(async () => {
        if (!file) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('shouldTruncate', shouldTruncate.toString());

            const baseUrl = getApiUrl();
            const token = getAuthToken();

            const response = await fetch(`${baseUrl}/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            setResult(data);
            setFile(null);
        } catch (err) {
            setError(err.message || 'Import failed');
        } finally {
            setLoading(false);
        }
    }, [file, shouldTruncate]);

    const clearImport = useCallback(() => {
        setResult(null);
        setError('');
        setFile(null);
    }, []);

    const value = {
        // Form state
        file,
        setFile,
        shouldTruncate,
        setShouldTruncate,
        // Request state
        loading,
        result,
        error,
        setError,
        // Actions
        executeImport,
        clearImport,
    };

    return (
        <ImportContext.Provider value={value}>
            {children}
        </ImportContext.Provider>
    );
}

export function useImport() {
    const context = useContext(ImportContext);
    if (!context) {
        throw new Error('useImport must be used within ImportProvider');
    }
    return context;
}
