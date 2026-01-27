import { useEffect, useState } from "react";
import { 
    getPositionPapersByIds, 
    AssignmentProps, 
    DelegateProps, 
    PositionPaperWithId,
    ChairCommitteeInfo,
    Rubric,
    getRubricById,
} from "@/app/utils/supabaseHelpers";
import GradingModal from "../modals/GradingModal";
import { SINGLE_COMMITTEE } from "@/app/utils/generalHelper";

interface PapersTabProps {
    committeeName?: string;
    committeeShortName?: string;
    delegates: DelegateProps[];
    assignments: AssignmentProps[];
    committee?: ChairCommitteeInfo | null;
}

interface PaperRow {
    id: string;
    paperId: number;
    country_name: string;
    delegate_name: string;
    email: string;
    submitted_at: string;
    graded: boolean;
    paper: PositionPaperWithId | null;
}

type SortField = 'country' | 'delegate' | 'email' | null;
type SortDirection = 'asc' | 'desc';

function PapersTab({ committeeName, committeeShortName, delegates, assignments, committee }: PapersTabProps) {
    const isSpecialCommittee = committeeShortName ? SINGLE_COMMITTEE.includes(committeeShortName) : false;
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<PaperRow[]>([]);
    const [sortField, setSortField] = useState<SortField>('country');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [gradingModalOpen, setGradingModalOpen] = useState(false);
    const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
    const [rubric, setRubric] = useState<Rubric | null>(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                if (!assignments || assignments.length === 0) {
                    setRows([]);
                    setLoading(false);
                    return;
                }

                const assignmentsWithPaper = assignments.filter(a => a.paper_id);
                if (assignmentsWithPaper.length === 0) {
                    setRows([]);
                    setLoading(false);
                    return;
                }

                const paperIds = Array.from(
                    new Set(
                        assignmentsWithPaper
                            .map(a => a.paper_id)
                            .filter((id): id is number => typeof id === "number")
                    )
                );

                const papers: PositionPaperWithId[] = await getPositionPapersByIds(paperIds);

                const assignmentById = new Map<number, AssignmentProps>();
                assignmentsWithPaper.forEach(a => {
                    if (a.id != null) assignmentById.set(a.id, a);
                });

                const paperById = new Map<number, PositionPaperWithId>();
                papers.forEach((p: PositionPaperWithId) => {
                    paperById.set(p.id, p);
                });

                const builtRows: PaperRow[] = [];

                delegates.forEach(d => {
                    if (!d.assignment_id || !assignmentById.has(d.assignment_id)) return;
                    const assignment = assignmentById.get(d.assignment_id)!;
                    if (!assignment.paper_id) return;

                    const paper = paperById.get(assignment.paper_id);
                    if (!paper) return;

                    const submittedAt = paper.submission_date
                        ? new Date(paper.submission_date).toLocaleString()
                        : "N/A";

                    builtRows.push({
                        id: `${d.email}-${assignment.id}`,
                        paperId: paper.id!,
                        country_name: assignment.country_name,
                        delegate_name: `${d.first_name || ""} ${d.last_name || ""}`.trim() || "Delegate",
                        email: d.email,
                        submitted_at: submittedAt,
                        graded: paper.graded,
                        paper: paper,
                    });
                });

                setRows(builtRows);
            } catch (e) {
                console.error("Error loading position paper data for chair:", e);
                setRows([]);
            }
            setLoading(false);
        })();
    }, [delegates, assignments]);

    // Load rubric when committee changes
    useEffect(() => {
        (async () => {
            if (committee?.rubric_id) {
                const rubricData = await getRubricById(committee.rubric_id);
                setRubric(rubricData);
            } else {
                setRubric(null);
            }
        })();
    }, [committee?.rubric_id]);

    // Calculate total score for a paper
    const calculateTotalScore = (paper: PositionPaperWithId | null): number | null => {
        if (!paper?.graded || !rubric) return null;

        let total = 0;

        // Sum Topic 1 scores for valid sections
        rubric.topic_one.forEach((item, index) => {
            const maxValue = item?.value || 0;
            const hasName = item?.name && item.name.trim() !== "";
            if (hasName && maxValue > 0) {
                const scoreKey = `score_${index + 1}` as keyof PositionPaperWithId;
                const score = paper[scoreKey];
                if (typeof score === 'number') {
                    total += score;
                }
            }
        });

        // Sum Topic 2 scores for valid sections (only if use_topic_2 is true and not special committee)
        if (rubric.use_topic_2 && !isSpecialCommittee) {
            rubric.topic_two.forEach((item, index) => {
                const maxValue = item?.value || 0;
                const hasName = item?.name && item.name.trim() !== "";
                if (hasName && maxValue > 0) {
                    const scoreKey = `score_t2_${index + 1}` as keyof PositionPaperWithId;
                    const score = paper[scoreKey];
                    if (typeof score === 'number') {
                        total += score;
                    }
                }
            });
        }

        return total;
    };

    // Sort rows based on current sort field and direction
    const sortedRows = [...rows].sort((a, b) => {
        if (!sortField) return 0;
        
        let comparison = 0;
        switch (sortField) {
            case 'country':
                comparison = a.country_name.localeCompare(b.country_name);
                break;
            case 'delegate':
                comparison = a.delegate_name.toLowerCase().localeCompare(b.delegate_name.toLowerCase());
                break;
            case 'email':
                comparison = a.email.toLowerCase().localeCompare(b.email.toLowerCase());
                break;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    function handleSort(field: SortField) {
        if (sortField === field) {
            // Toggle direction if clicking the same field
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new field with ascending direction
            setSortField(field);
            setSortDirection('asc');
        }
    }

    function getSortIcon(field: SortField) {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? '↑' : '↓';
    }

    function handleOpenGradingModal(paperId: number, assignmentId: number) {
        setSelectedPaperId(paperId);
        setSelectedAssignmentId(assignmentId);
        setGradingModalOpen(true);
    }

    function handleGraded() {
        // Reload papers after grading
        setLoading(true);
        // The useEffect will reload the data
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }

    return (
        <div className="flex flex-col gap-6 w-full">
            <GradingModal
                paperId={selectedPaperId}
                assignmentId={selectedAssignmentId || 0}
                isOpen={gradingModalOpen}
                setIsOpen={setGradingModalOpen}
                onGraded={handleGraded}
                committeeShortName={committeeShortName}
            />
            {/*<div className="card bg-base-100 shadow-xl border border-base-300">
                <div className="card-body">
                    <h2
                        className="card-title text-3xl md:text-4xl"
                        style={{ fontFamily: "var(--font-roboto)" }}
                    >
                        Position Papers
                    </h2>
                    {committeeName && (
                        <p className="mt-2 text-lg md:text-xl">
                            View and grade position papers for{" "}
                            <span className="font-semibold text-primary">{committeeName}</span>.
                        </p>
                    )}
                </div>
            </div>*/}

            <div className="overflow-scroll rounded-xl border-2 border-primary bg-base-100">
                <table className="table table-zebra text-base md:text-lg text-center">
                    <thead>
                        <tr className="text-sm md:text-base font-bold">
                            <th 
                                className="px-4 py-2 cursor-pointer hover:bg-base-200 select-none"
                                onClick={() => handleSort('country')}
                            >
                                Country {getSortIcon('country')}
                            </th>
                            <th 
                                className="px-4 py-2 cursor-pointer hover:bg-base-200 select-none"
                                onClick={() => handleSort('delegate')}
                            >
                                Delegate {getSortIcon('delegate')}
                            </th>
                            <th 
                                className="px-4 py-2 cursor-pointer hover:bg-base-200 select-none"
                                onClick={() => handleSort('email')}
                            >
                                Email {getSortIcon('email')}
                            </th>
                            <th className="px-4 py-2">Submitted At</th>
                            <th className="px-4 py-2">Graded</th>
                            <th className="px-4 py-2">Total Score</th>
                            <th className="px-4 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7}>
                                    <div className="flex items-center justify-center py-8">
                                        <span className="loading loading-spinner loading-lg" />
                                    </div>
                                </td>
                            </tr>
                        ) : sortedRows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-6 text-center text-sm opacity-70">
                                    No position papers submitted yet for this committee.
                                </td>
                            </tr>
                        ) : (
                            sortedRows.map(row => {
                                // Find assignment_id for this row
                                const assignment = assignments.find(a => a.paper_id === row.paperId);
                                const assignmentId = assignment?.id || null;
                                
                                return (
                                    <tr key={row.id} className="text-sm md:text-base">
                                        <td className="px-4 py-2 text-primary font-semibold whitespace-nowrap">
                                            {row.country_name}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            {row.delegate_name}
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className="text-sm md:text-base break-all">{row.email}</span>
                                        </td>
                                        <td className="px-4 py-2">
                                            {row.submitted_at}
                                        </td>
                                        <td className="px-4 py-2">
                                            {row.graded ? (
                                                <span className="badge badge-success">Graded</span>
                                            ) : (
                                                <span className="badge badge-warning">Not graded</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 font-semibold">
                                            {(() => {
                                                const total = calculateTotalScore(row.paper);
                                                return total !== null ? total : "-";
                                            })()}
                                        </td>
                                        <td className="px-4 py-2">
                                            {assignmentId ? (
                                                <button
                                                    className="btn btn-primary btn-md"
                                                    onClick={() => handleOpenGradingModal(row.paperId, assignmentId)}
                                                >
                                                    Grade
                                                </button>
                                            ) : (
                                                <span className="text-sm opacity-50">No assignment</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default PapersTab;

