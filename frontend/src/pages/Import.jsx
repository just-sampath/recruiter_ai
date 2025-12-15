import { useCallback } from 'react';
import { useImport } from '../hooks/useImport';

export default function Import() {
    const {
        file,
        setFile,
        shouldTruncate,
        setShouldTruncate,
        loading,
        result,
        error,
        setError,
        executeImport,
    } = useImport();

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        const droppedFile = e.dataTransfer?.files?.[0];
        if (droppedFile && droppedFile.name.endsWith('.xlsx')) {
            setFile(droppedFile);
            setError('');
        } else {
            setError('Please upload an XLSX file');
        }
    }, [setFile, setError]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError('');
        }
    };

    const handleUpload = async () => {
        executeImport();
    };

    return (
        <div className="p-8 max-w-4xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-semibold text-white mb-2">Import Data</h1>
                <p className="text-slate-400">Upload XLSX files to import candidates, jobs, and more</p>
            </div>

            {/* Upload zone */}
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className="relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 border-border hover:border-border-light"
                >
                    <input
                        type="file"
                        accept=".xlsx"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-elevated text-slate-400">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        </div>

                        <p className="text-lg font-medium text-white mb-2">
                            Drag & drop your XLSX file
                        </p>
                        <p className="text-slate-400 text-sm">or click to browse</p>
                    </div>
                </div>

                {/* Selected file */}
                {file && (
                    <div className="mt-4 flex items-center justify-between p-4 bg-elevated rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-accent-green/10 flex items-center justify-center text-accent-green">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium text-white">{file.name}</p>
                                <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setFile(null)}
                            className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Options */}
                {file && (
                    <div className="mt-4 p-4 bg-elevated rounded-xl">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={shouldTruncate}
                                onChange={(e) => setShouldTruncate(e.target.checked)}
                                className="w-5 h-5 rounded border-border bg-base text-accent-blue focus:ring-accent-blue focus:ring-offset-0"
                            />
                            <div>
                                <span className="text-white font-medium">Truncate existing data</span>
                                <p className="text-sm text-slate-400">
                                    Clear all existing data before importing. Use with caution!
                                </p>
                            </div>
                        </label>

                        {shouldTruncate && (
                            <div className="mt-3 p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg">
                                <p className="text-sm text-accent-red flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    This will delete ALL existing data in the database!
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Upload button */}
                {file && (
                    <button
                        onClick={handleUpload}
                        disabled={loading}
                        className={`mt-4 w-full py-3 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${shouldTruncate
                                ? 'bg-accent-red hover:bg-accent-red/80 text-white'
                                : 'bg-accent-blue hover:bg-accent-blue-hover text-white'
                            }`}
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                {shouldTruncate ? 'Truncate & Import' : 'Upload & Import'}
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red/20 rounded-xl text-accent-red">
                    {error}
                </div>
            )}

            {/* Result */}
            {result && (
                <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-accent-green/10 flex items-center justify-center text-accent-green">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-white">Import Complete</h3>
                    </div>

                    {result.stats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(result.stats).map(([key, value]) => (
                                <div key={key} className="p-4 bg-elevated rounded-xl">
                                    <p className="text-sm text-slate-400 capitalize">{key.replace(/_/g, ' ')}</p>
                                    <p className="text-2xl font-semibold text-white">{value}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {result.message && (
                        <p className="mt-4 text-slate-300">{result.message}</p>
                    )}
                </div>
            )}

            {/* Info */}
            <div className="mt-8 p-4 bg-elevated/50 rounded-xl">
                <h4 className="text-sm font-medium text-white mb-2">Supported Sheets</h4>
                <p className="text-sm text-slate-400">
                    jobs, candidates, candidate_resumes, skills, candidate_skills, job_applications,
                    screening_questions, screening_answers, one_way_interviews, one_way_transcripts,
                    recruiter_comments, interviews, interview_transcripts, interview_scorecards
                </p>
            </div>
        </div>
    );
}
