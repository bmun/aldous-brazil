import { PositionPaper, uploadPositionPaper, getPositionPaperForCurrentDelegate, downloadPositionPaper, getAssignmentForCurrentDelegate, downloadGradedPaper } from "@/app/utils/supabaseHelpers";
import { useEffect, useState } from "react";

/*interface ProfileTabProps {
    delegate: DelegateUser,
    assignment: DelegateAssignmentInfo
}*/

function PositionPaperTab() {
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [paper, setPaper] = useState<PositionPaper | null>(null)
    const [paperLoading, setPaperLoading] = useState(false)
    const [downloading, setDownloading] = useState<'original' | 'graded' | null>(null)
    const [assignment, setAssignment] = useState<{ id: number } | null>(null)

    useEffect(() => {
        (async () => {
            setPaperLoading(true)
            try {
                const newPaper = await getPositionPaperForCurrentDelegate()
                setPaper(newPaper)
                
                // Get assignment to access assignment ID
                const assignmentData = await getAssignmentForCurrentDelegate()
                if (assignmentData?.id) {
                    setAssignment({ id: assignmentData.id })
                }
            } catch (e) {
                console.error('Error loading position paper:', e)
            }
            setPaperLoading(false)
        })()
    }, [success]) // Reload paper after successful upload

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0] ?? null
        setError(null)
        setSuccess(false)

        if (!selected) return

        // Optional early validation
        if (selected.size > 10 * 1024 * 1024) {
            setError('File must be under 10MB')
            return
        }

        setFile(selected)
    }

    async function handleSubmit() {
        if (!file) {
            setError('Please select a file first')
            return
        }

        setUploading(true)
        setError(null)
        setSuccess(false)

        try {
            await uploadPositionPaper(file)
            setSuccess(true)
            setFile(null)
            // Reload paper after successful upload
            const newPaper = await getPositionPaperForCurrentDelegate()
            setPaper(newPaper)
        } catch (err: any) {
            setError(err.message ?? 'Upload failed')
        } finally {
            setUploading(false)
        }
    }

    async function handleDownload() {
        setDownloading('original')
        setError(null)
        try {
            await downloadPositionPaper()
        } catch (err: any) {
            setError(err.message ?? 'Download failed')
        } finally {
            setDownloading(null)
        }
    }

    async function handleDownloadGraded() {
        if (!paper?.id || !assignment?.id) return
        setDownloading('graded')
        setError(null)
        try {
            await downloadGradedPaper(paper.id, assignment.id)
        } catch (err: any) {
            setError(err.message ?? 'Failed to download graded paper')
        } finally {
            setDownloading(null)
        }
    }

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="card bg-base-100 shadow-xl border border-base-300">
                <div className="card-body space-y-3">
                    <h2
                        className="card-title text-3xl md:text-4xl"
                        style={{ fontFamily: "var(--font-roboto)" }}
                    >
                        Position Paper Submission
                    </h2>
                    <ul className="list-disc list-outside ml-6 text-md md:text-lg opacity-90 space-y-1">
                        <li>
                            Choose a file then hit submit to turn in your paper
                        </li>
                        <li>
                            Accepted file types: .pdf, .doc, .docx. Other file types will not be graded
                        </li>
                        <li>
                            For double delegations, either delegate can upload the paper
                        </li>
                        <li>
                            You can only submit <b>one</b> file for your delegation. This should contain your position paper for all topics
                        </li>
                        <li>
                            All submission times are in <b>Pacific Standard Time</b>
                        </li>
                        <li>
                            The large influx of submissions near the deadline can slow the system, and result in your paper&apos;s timestamp being later
                            than you expect it to be. <b>THIS IS YOUR RESPONSIBILITY TO AVOID.</b> If you want to be safe, submit your paper at least
                            thirty minutes before the deadline to account for unforeseen difficulties.
                        </li>
                        <li>
                            Any submission with a timestamp later than the deadline will be considered late
                        </li>
                        <li>
                            When considering time of submission, chairs will only look at the timestamp of the most recent upload.
                        </li>
                        <li>
                            If either delegate (assuming a double delegation) submits a paper, it will entirely overwrite any previous submission made by either delegate.
                        </li>
                        <li>
                            After uploading, the green download button should appear/ Click this to see the file you have uploaded.
                        </li>
                        <li>
                            Once your paper has been graded you will be unable to resubmit. You may resubmit until then.
                        </li>
                        <li>
                            After your paper has been graded, you should be able to download the file and see comments left by your chairs
                        </li>
                    </ul>
                    <p className="text-md md:text-lg opacity-90">
                        <b>
                            Refresh the page and try to download your paper after you submit; if the file you see is not what you expect
                            you should re-upload the paper. If you do not see a download button, then your submission did not go through and you should 
                            re-upload the paper.
                        </b>
                    </p>
                </div>
            </div>

            {/* Upload controls (disabled for now) */}
            <div className="">
                <div className="grid grid-cols-2 gap-10">
                    <div className="card bg-base-100 shadow-md border border-base-300">
                        <div className="card-body space-y-3 w-full">
                            <h3
                            className="card-title text-xl md:text-2xl"
                            style={{ fontFamily: 'var(--font-roboto)' }}
                            >
                            Position Paper
                            </h3>

                            <div className="flex flex-row gap-10 items-start">
                            <fieldset className="fieldset">
                                <input
                                type="file"
                                className="file-input file-input-primary"
                                accept=".pdf,.doc,.docx"
                                onChange={handleFileChange}
                                disabled={uploading}
                                />
                                <label className="label">Max size 10MB</label>
                            </fieldset>

                            <fieldset>
                                <button
                                className="btn btn-primary btn-active mt-1"
                                onClick={handleSubmit}
                                disabled={uploading || !file}
                                >
                                {uploading ? 'Uploading…' : 'Submit'}
                                </button>
                            </fieldset>
                            </div>

                            {/* Feedback */}
                            {error && <p className="text-error text-sm">{error}</p>}
                        </div>
                    </div>
                    <div className="card bg-base-100 shadow-md border border-base-300">
                        <div className="card-body space-y-3">
                            <h3 className="card-title text-xl md:text-2xl" style={{ fontFamily: "var(--font-roboto)" }}>
                                Uploaded Paper
                            </h3>
                            {paperLoading ? (
                                <div className="flex flex-row gap-10 items-start mt-1">
                                    <div className="h-12 bg-base-300 rounded w-40 animate-pulse"></div>
                                    <div className="h-12 bg-base-300 rounded w-40 animate-pulse"></div>
                                    <div className="h-12 bg-base-300 rounded w-32 animate-pulse"></div>
                                </div>
                            ) : <div className="flex flex-row gap-10 items-start mt-1">
                                    <fieldset>
                                        <button 
                                            className="btn btn-secondary btn-active mt-1"
                                            onClick={handleDownload}
                                            disabled={downloading !== null || paper == null}
                                        >
                                            {downloading === 'original' ? 'Downloading…' : 'Download Original'}
                                        </button>
                                    </fieldset>
                                    <fieldset>
                                        <button 
                                            className="btn btn-success btn-active mt-1"
                                            onClick={handleDownloadGraded}
                                            disabled={downloading !== null || !paper?.graded || !paper?.id || !assignment?.id || true}
                                        >
                                            {downloading === 'graded' ? 'Downloading…' : 'Download Graded'}
                                        </button>
                                    </fieldset>
                                    <fieldset>
                                        <button 
                                            className="btn btn-info btn-active mt-1"
                                            disabled={!paper?.graded || true}
                                        >
                                            View Grade
                                        </button>
                                    </fieldset>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PositionPaperTab