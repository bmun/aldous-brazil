'use client';

import { PositionPaper, getPositionPaperByPaperId, downloadPositionPaperByPaperId } from "@/app/utils/supabaseHelpers";
import { useEffect, useState } from "react";

interface PositionPaperModalProps {
    paperId: number | null,
    committeeName: string,
    countryName: string,
    isOpen: boolean,
    setIsOpen: (open: boolean) => void
}

function PositionPaperModal({
    paperId,
    committeeName,
    countryName,
    isOpen,
    setIsOpen
}: PositionPaperModalProps) {
    const [paper, setPaper] = useState<PositionPaper | null>(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState<'original' | 'graded' | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && paperId) {
            setLoading(true);
            setError(null);
            (async () => {
                try {
                    const paperData = await getPositionPaperByPaperId(paperId);
                    setPaper(paperData);
                } catch (e: any) {
                    console.error('Error loading position paper:', e);
                    setError(e.message || 'Failed to load position paper');
                } finally {
                    setLoading(false);
                }
            })();
        } else {
            setPaper(null);
        }
    }, [isOpen, paperId]);

    const handleDownloadOriginal = async () => {
        if (!paperId) return;
        setDownloading('original');
        setError(null);
        try {
            await downloadPositionPaperByPaperId(paperId);
        } catch (e: any) {
            setError(e.message || 'Failed to download original paper');
        } finally {
            setDownloading(null);
        }
    };

    const handleDownloadGraded = async () => {
        if (!paperId) return;
        setDownloading('graded');
        setError(null);
        try {
            // For now, download from the same URL. This can be updated if there's a separate graded paper URL
            await downloadPositionPaperByPaperId(paperId);
        } catch (e: any) {
            setError(e.message || 'Failed to download graded paper');
        } finally {
            setDownloading(null);
        }
    };

    const calculateTotalScore = () => {
        if (!paper) return 0;
        return paper.score_1 + paper.score_2 + paper.score_3 + paper.score_4 + paper.score_5 +
               paper.score_t2_1 + paper.score_t2_2 + paper.score_t2_3 + paper.score_t2_4 + paper.score_t2_5;
    };

    if (!isOpen || !paperId) {
        return <div></div>;
    }

    return (
        <div className="fixed z-50 inset-0 w-full h-full flex flex-row items-center justify-center" style={{ animation: 'fadeIn 0.3s ease-out forwards' }}>
            <div className="absolute z-10 w-full h-full bg-black" style={{ animation: 'fadeInBackdrop 0.3s ease-out forwards', opacity: 0 }} onClick={() => setIsOpen(false)}></div>
            <fieldset className="fieldset z-20 bg-black border-2 border-primary w-full max-w-2xl max-h-[90vh] overflow-scroll rounded-box p-6 opacity-100" style={{ animation: 'fadeInScale 0.3s ease-out forwards' }}>
                <div className="mb-4">
                    <h5 className="text-4xl mb-2">
                        <span className="text-primary">{committeeName}</span> - <span className="text-nowrap">{countryName}</span>
                    </h5>
                    <h3 className="text-2xl text-primary">Position Paper</h3>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                ) : error ? (
                    <div className="alert alert-error">
                        <span>{error}</span>
                    </div>
                ) : paper ? (
                    <div className="flex flex-row gap-6">
                        {/* Left side: Info Card with Date and Status */}
                        <div className="flex-1 h-[168px]">
                            <div className="card bg-base-200 p-4 h-[168px]">
                                <div className="flex flex-col justify-around h-full">
                                    <div>
                                        <p className="text-sm opacity-70 mb-1">Submission Date</p>
                                        <p className="text-lg">
                                            {new Date(paper.submission_date).toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm opacity-70 mb-1">Status</p>
                                        <p className="text-lg">
                                            {paper.graded ? (
                                                <span className="badge badge-success">Graded</span>
                                            ) : (
                                                <span className="badge badge-warning">Submitted</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right side: Action Buttons */}
                        <div className="flex-1 h-[168px] flex flex-col gap-3">
                            <button
                                className="btn btn-secondary btn-lg w-full"
                                onClick={handleDownloadOriginal}
                                disabled={downloading !== null}
                            >
                                {downloading === 'original' ? (
                                    <>
                                        <span className="loading loading-spinner"></span>
                                        Downloading...
                                    </>
                                ) : (
                                    'Download Original'
                                )}
                            </button>
                            <button
                                className={`btn btn-lg w-full ${paper.graded ? 'btn-success' : 'btn-disabled'}`}
                                onClick={handleDownloadGraded}
                                disabled={downloading !== null || !paper.graded}
                            >
                                {downloading === 'graded' ? (
                                    <>
                                        <span className="loading loading-spinner"></span>
                                        Downloading...
                                    </>
                                ) : (
                                    'Download Graded'
                                )}
                            </button>
                            <button
                                className={`btn btn-lg w-full ${paper.graded ? 'btn-primary' : 'btn-disabled'}`}
                                disabled={!paper.graded}
                            >
                                View Final Score
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="alert alert-warning">
                        <span>No position paper found</span>
                    </div>
                )}

                {/* Close Button */}
                <div className="mt-6">
                    <button
                        className="btn btn-ghost btn-lg w-full"
                        onClick={() => setIsOpen(false)}
                    >
                        Close
                    </button>
                </div>
            </fieldset>
        </div>
    );
}

export default PositionPaperModal;

