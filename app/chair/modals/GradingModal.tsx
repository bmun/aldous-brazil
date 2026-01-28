'use client';

import { useState, useEffect } from "react";
import {
    PositionPaper,
    getPositionPaperByPaperId,
    downloadPositionPaperByPaperId,
    updatePositionPaperScores,
    uploadGradedPaper,
    downloadGradedPaper,
    Rubric,
    getRubricById,
    getCommitteeForCurrentChair,
} from "@/app/utils/supabaseHelpers";
import { supabase } from "@/supabaseClient";
import { SINGLE_COMMITTEE } from "@/app/utils/generalHelper";

interface GradingModalProps {
    paperId: number | null;
    assignmentId: number;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    onGraded: () => void;
    committeeShortName?: string;
}

function GradingModal({
    paperId,
    assignmentId,
    isOpen,
    setIsOpen,
    onGraded,
    committeeShortName,
}: GradingModalProps) {
    const isSpecialCommittee = committeeShortName ? SINGLE_COMMITTEE.includes(committeeShortName) : false;
    const [paper, setPaper] = useState<PositionPaper | null>(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState<'original' | 'graded' | null>(null);
    const [grading, setGrading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasGradedPaper, setHasGradedPaper] = useState(false);
    
    // Score states
    const [scores, setScores] = useState({
        score_1: 0,
        score_2: 0,
        score_3: 0,
        score_4: 0,
        score_5: 0,
        score_t2_1: 0,
        score_t2_2: 0,
        score_t2_3: 0,
        score_t2_4: 0,
        score_t2_5: 0,
    });
    
    const [gradedFile, setGradedFile] = useState<File | null>(null);
    const [rubric, setRubric] = useState<Rubric | null>(null);
    const [loadingRubric, setLoadingRubric] = useState(false);

    useEffect(() => {
        if (isOpen && paperId) {
            setLoading(true);
            setLoadingRubric(true);
            setError(null);
            (async () => {
                try {
                    // Load paper data
                    const paperData = await getPositionPaperByPaperId(paperId);
                    if (paperData) {
                        setPaper(paperData);
                        setScores({
                            score_1: paperData.score_1 || 0,
                            score_2: paperData.score_2 || 0,
                            score_3: paperData.score_3 || 0,
                            score_4: paperData.score_4 || 0,
                            score_5: paperData.score_5 || 0,
                            score_t2_1: paperData.score_t2_1 || 0,
                            score_t2_2: paperData.score_t2_2 || 0,
                            score_t2_3: paperData.score_t2_3 || 0,
                            score_t2_4: paperData.score_t2_4 || 0,
                            score_t2_5: paperData.score_t2_5 || 0,
                        });
                    }

                    // Load rubric
                    const committee = await getCommitteeForCurrentChair();
                    if (committee?.rubric_id) {
                        const rubricData = await getRubricById(committee.rubric_id);
                        setRubric(rubricData);
                    }
                    
                    // Check if graded paper exists by listing files
                    try {
                        const { data: files } = await supabase.storage
                            .from('position-papers')
                            .list(`${assignmentId}/graded`, { limit: 1 });
                        setHasGradedPaper(!!(files && files.length > 0));
                    } catch {
                        setHasGradedPaper(false);
                    }
                } catch (e: any) {
                    console.error('Error loading position paper:', e);
                    setError(e.message || 'Failed to load position paper');
                } finally {
                    setLoading(false);
                    setLoadingRubric(false);
                }
            })();
        } else {
            setPaper(null);
            setGradedFile(null);
            setRubric(null);
            setError(null);
        }
    }, [isOpen, paperId, assignmentId]);

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
            await downloadGradedPaper(paperId, assignmentId);
        } catch (e: any) {
            setError(e.message || 'Failed to download graded paper');
        } finally {
            setDownloading(null);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setGradedFile(file);
        setError(null);
    };

    const handleGrade = async () => {
        if (!paperId) {
            setError('Paper ID is required');
            return;
        }

        // Only require graded file if no graded paper exists yet
        if (!hasGradedPaper && !gradedFile) {
            setError('Please upload a graded paper before submitting');
            return;
        }

        setGrading(true);
        setError(null);

        try {
            // Upload graded paper only if a new file is provided
            if (gradedFile) {
                const uploadSuccess = await uploadGradedPaper(paperId, assignmentId, gradedFile);
                if (!uploadSuccess) {
                    throw new Error('Failed to upload graded paper');
                }
            }

            // Prepare scores - if special committee, set topic 2 scores to 0
            const scoresToUpdate = isSpecialCommittee
                ? {
                      ...scores,
                      score_t2_1: 0,
                      score_t2_2: 0,
                      score_t2_3: 0,
                      score_t2_4: 0,
                      score_t2_5: 0,
                  }
                : scores;

            // Update scores
            const updateSuccess = await updatePositionPaperScores(paperId, scoresToUpdate);
            if (!updateSuccess) {
                throw new Error('Failed to update scores');
            }

            // Success - close modal and refresh
            onGraded();
            setIsOpen(false);
        } catch (e: any) {
            setError(e.message || 'Failed to grade paper');
        } finally {
            setGrading(false);
        }
    };

    if (!isOpen || !paperId) {
        return null;
    }

    return (
        <div className="fixed z-50 inset-0 w-full h-full flex flex-row items-center justify-center">
            <div
                className="absolute z-10 w-full h-full bg-black"
                style={{
                    animation: 'fadeIn 0.3s ease-out forwards',
                }}
                onClick={() => setIsOpen(false)}
            />
            <div 
                className="z-20 bg-base-100 border-2 border-primary rounded-lg w-full max-w-4xl overflow-hidden p-6 transition-all ease-out"
                style={{
                    animation: 'modalSlideIn 0.3s ease-out forwards',
                    maxHeight: loading ? '250px' : '90vh',
                    transitionDuration: '1000ms',
                    transitionProperty: 'max-height',
                }}
            >
                <div 
                    className="overflow-scroll"
                    style={{
                        maxHeight: 'calc(90vh - 3rem)',
                    }}
                >
                    <p className="text-3xl font-bold mb-4">Grade Position Paper</p>

                    {loading ? (
                        <div className="flex items-center justify-center py-8" style={{ minHeight: '150px' }}>
                            <span className="loading loading-spinner loading-lg" />
                        </div>
                    ) : error && !paper ? (
                        <div className="alert alert-error">
                            <span>{error}</span>
                        </div>
                    ) : paper ? (
                        <div className="space-y-6">
                        {/* Download buttons */}
                        <div className="flex flex-row gap-4">
                            <button
                                className="btn btn-secondary btn-lg flex-1"
                                onClick={handleDownloadOriginal}
                                disabled={downloading !== null}
                            >
                                {downloading === 'original' ? (
                                    <>
                                        <span className="loading loading-spinner" />
                                        Downloading...
                                    </>
                                ) : (
                                    'Download Original Paper'
                                )}
                            </button>
                            <button
                                className={`btn btn-lg flex-1 ${hasGradedPaper ? 'btn-success' : 'btn-disabled'}`}
                                onClick={handleDownloadGraded}
                                disabled={downloading !== null || !hasGradedPaper}
                            >
                                {downloading === 'graded' ? (
                                    <>
                                        <span className="loading loading-spinner" />
                                        Downloading...
                                    </>
                                ) : (
                                    'Download Graded Paper'
                                )}
                            </button>
                        </div>

                        {/* Upload graded paper */}
                        <div className="space-y-4">
                            <p className="text-xl font-semibold">
                                Upload Annotated Paper
                                {hasGradedPaper && (
                                    <span className="text-sm font-normal text-base-content/70 ml-2">
                                        (Optional - graded paper already exists)
                                    </span>
                                )}
                            </p>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Annotated Paper File</span>
                                </label>
                                <div className="mt-2">
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        className="file-input file-input-bordered file-input-lg w-full"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Score inputs */}
                        {loadingRubric ? (
                            <div className="flex items-center justify-center py-4">
                                <span className="loading loading-spinner loading-sm" />
                                <span className="ml-2">Loading rubric...</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-6">
                                {/* Topic 1 Scores */}
                                <div className="space-y-4">
                                    <p className="text-xl font-semibold">Topic 1 Scores</p>
                                    {[1, 2, 3, 4, 5].map((num) => {
                                        const rubricItem = rubric?.topic_one[num - 1];
                                        const maxValue = rubricItem?.value || 0;
                                        const sectionName = rubricItem?.name || `Score ${num}`;
                                        const isDisabled = maxValue === 0 || !rubricItem?.name || rubricItem.name.trim() === "";
                                        const displayMax = maxValue === 0 ? "-" : maxValue;
                                        
                                        return (
                                            <div key={num} className="form-control">
                                                <label className="label">
                                                    <span className="label-text">{sectionName} ({displayMax})</span>
                                                </label>
                                                <div className="mt-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={maxValue}
                                                        className={`input input-lg input-bordered ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        value={scores[`score_${num}` as keyof typeof scores]}
                                                        onChange={(e) => {
                                                            if (!isDisabled) {
                                                                const value = Math.max(0, Math.min(maxValue, parseInt(e.target.value) || 0));
                                                                setScores({
                                                                    ...scores,
                                                                    [`score_${num}`]: value,
                                                                });
                                                            }
                                                        }}
                                                        disabled={isDisabled}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Topic 2 Scores */}
                                <div className={`space-y-4 ${!rubric?.use_topic_2 || isSpecialCommittee ? 'opacity-50' : ''}`}>
                                    <p className="text-xl font-semibold">Topic 2 Scores</p>
                                    {[1, 2, 3, 4, 5].map((num) => {
                                        const rubricItem = rubric?.topic_two[num - 1];
                                        const maxValue = rubricItem?.value || 0;
                                        const sectionName = rubricItem?.name || `Score ${num}`;
                                        const isDisabled = isSpecialCommittee || !rubric?.use_topic_2 || maxValue === 0 || !rubricItem?.name || rubricItem.name.trim() === "";
                                        const displayMax = maxValue === 0 ? "-" : maxValue;
                                        
                                        return (
                                            <div key={num} className="form-control">
                                                <label className="label">
                                                    <span className="label-text">{sectionName} ({displayMax})</span>
                                                </label>
                                                <div className="mt-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={maxValue}
                                                        className={`input input-lg input-bordered ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        value={scores[`score_t2_${num}` as keyof typeof scores]}
                                                        onChange={(e) => {
                                                            if (!isDisabled) {
                                                                const value = Math.max(0, Math.min(maxValue, parseInt(e.target.value) || 0));
                                                                setScores({
                                                                    ...scores,
                                                                    [`score_t2_${num}`]: value,
                                                                });
                                                            }
                                                        }}
                                                        disabled={isDisabled}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="alert alert-error">
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-row gap-4">
                            <button
                                className="btn btn-ghost btn-lg flex-1"
                                onClick={() => setIsOpen(false)}
                                disabled={grading}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary btn-lg flex-1"
                                onClick={handleGrade}
                                disabled={grading || (!hasGradedPaper && !gradedFile)}
                            >
                                {grading ? (
                                    <>
                                        <span className="loading loading-spinner" />
                                        Grading...
                                    </>
                                ) : (
                                    'Grade'
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="alert alert-warning">
                        <span>No position paper found</span>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}

export default GradingModal;

