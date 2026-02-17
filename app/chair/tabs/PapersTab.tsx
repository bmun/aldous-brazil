import { useEffect, useState } from "react";
import { 
    getPositionPapersByIds, 
    AssignmentProps, 
    DelegateProps, 
    PositionPaperWithId,
    ChairCommitteeInfo,
    Rubric,
    getRubricById,
    assignPaperToChair,
    ChairInfo,
    getCommitteeForCurrentChair,
} from "@/app/utils/supabaseHelpers";
import GradingModal from "../modals/GradingModal";

interface PapersTabProps {
    committeeName?: string;
    committeeShortName?: string;
    delegates: DelegateProps[];
    assignments: AssignmentProps[];
    committee: ChairCommitteeInfo | null;
}

interface PaperRow {
    id: string;
    paperId: number;
    country_name: string;
    delegate_name: string;
    email: string;
    submitted_at: string;
    submitted_at_date: Date | null; // For sorting
    graded: boolean;
    paper: PositionPaperWithId | null;
    assignedChairIndex: number | null; // Index of chair in committee.chair_info array
}

type SortField = 'country' | 'delegate' | 'email' | 'submitted_at' | 'graded' | 'total_score' | 'chair' | null;
type SortDirection = 'asc' | 'desc';
type FilterType = number | 'unassigned' | 'none' | null;

function PapersTab({ committeeName: _committeeName, committeeShortName, delegates, assignments, committee: committeeProp }: PapersTabProps) {
    const [_loading, setLoading] = useState(true);
    const [rows, setRows] = useState<PaperRow[]>([]);
    const [sortField, setSortField] = useState<SortField>('country');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [gradingModalOpen, setGradingModalOpen] = useState(false);
    const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
    const [rubric, setRubric] = useState<Rubric | null>(null);
    const [selectedFilter, setSelectedFilter] = useState<FilterType>('none');
    const [committee, setCommittee] = useState<ChairCommitteeInfo | null>(committeeProp || null);
    const [isUpdatingChair, setIsUpdatingChair] = useState(false);

    useEffect(() => {
        // Skip loading if we're just updating chair assignments
        if (isUpdatingChair) {
            return;
        }
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
                    
                    const submittedAtDate = paper.submission_date
                        ? new Date(paper.submission_date)
                        : null;

                    // Find which chair (if any) has this paper_id in their assignment_ids
                    let assignedChairIndex: number | null = null;
                    if (committee?.chair_info && Array.isArray(committee.chair_info)) {
                        committee.chair_info.forEach((chair: ChairInfo, index: number) => {
                            if (chair.assignment_ids && chair.assignment_ids.includes(paper.id!)) {
                                assignedChairIndex = index;
                            }
                        });
                    }

                    builtRows.push({
                        id: `${d.email}-${assignment.id}`,
                        paperId: paper.id!,
                        country_name: assignment.country_name,
                        delegate_name: `${d.first_name || ""} ${d.last_name || ""}`.trim() || "Delegate",
                        email: d.email,
                        submitted_at: submittedAt,
                        submitted_at_date: submittedAtDate,
                        graded: paper.graded,
                        paper: paper,
                        assignedChairIndex: assignedChairIndex,
                    });
                });

                setRows(builtRows);
            } catch (e) {
                console.error("Error loading position paper data for chair:", e);
                setRows([]);
            }
            setLoading(false);
        })();
    }, [delegates, assignments, committee, isUpdatingChair]);

    // Update local committee state when prop changes
    useEffect(() => {
        if (committeeProp) {
            setCommittee(committeeProp);
        }
    }, [committeeProp]);

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

        // Sum Topic 2 scores for valid sections (only if use_topic_2 is true)
        if (rubric.use_topic_2) {
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
            case 'submitted_at':
                // Sort by date, with null dates at the end
                if (!a.submitted_at_date && !b.submitted_at_date) comparison = 0;
                else if (!a.submitted_at_date) comparison = 1;
                else if (!b.submitted_at_date) comparison = -1;
                else comparison = a.submitted_at_date.getTime() - b.submitted_at_date.getTime();
                break;
            case 'graded':
                // Sort by graded status (true first when ascending)
                if (a.graded === b.graded) comparison = 0;
                else comparison = a.graded ? 1 : -1;
                break;
            case 'total_score':
                // Sort by total score, with null scores at the end
                const scoreA = calculateTotalScore(a.paper);
                const scoreB = calculateTotalScore(b.paper);
                if (scoreA === null && scoreB === null) comparison = 0;
                else if (scoreA === null) comparison = 1;
                else if (scoreB === null) comparison = -1;
                else comparison = scoreA - scoreB;
                break;
            case 'chair':
                // Sort by chair name, with unassigned at the end
                const chairA = a.assignedChairIndex !== null && committee?.chair_info?.[a.assignedChairIndex]
                    ? committee.chair_info[a.assignedChairIndex].name
                    : '';
                const chairB = b.assignedChairIndex !== null && committee?.chair_info?.[b.assignedChairIndex]
                    ? committee.chair_info[b.assignedChairIndex].name
                    : '';
                if (!chairA && !chairB) comparison = 0;
                else if (!chairA) comparison = 1;
                else if (!chairB) comparison = -1;
                else comparison = chairA.localeCompare(chairB);
                break;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    // Filter rows based on selected filter
    const filteredRows = sortedRows.filter(row => {
        if (selectedFilter === 'none') return true;
        if (selectedFilter === 'unassigned') return row.assignedChairIndex === null;
        if (typeof selectedFilter === 'number') return row.assignedChairIndex === selectedFilter;
        return true;
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

    async function handleChairAssignment(paperId: number, chairIndex: number | null) {
        // Set flag to prevent loading state
        setIsUpdatingChair(true);
        
        // Optimistically update the UI first
        setRows(prevRows => prevRows.map(row => {
            if (row.paperId === paperId) {
                return {
                    ...row,
                    assignedChairIndex: chairIndex,
                };
            }
            return row;
        }));

        const success = await assignPaperToChair(paperId, chairIndex);
        if (success) {
            // Reload committee data to reflect the change
            const updatedCommittee = await getCommitteeForCurrentChair();
            if (updatedCommittee) {
                // Update local committee state
                setCommittee(updatedCommittee);
                
                // Verify and update rows to match server state (only if needed)
                setRows(prevRows => prevRows.map(row => {
                    if (row.paperId === paperId) {
                        // Verify this specific row's assignment matches
                        let newAssignedChairIndex: number | null = null;
                        if (updatedCommittee.chair_info && Array.isArray(updatedCommittee.chair_info)) {
                            updatedCommittee.chair_info.forEach((chair: ChairInfo, index: number) => {
                                if (chair.assignment_ids && chair.assignment_ids.includes(row.paperId)) {
                                    newAssignedChairIndex = index;
                                }
                            });
                        }
                        return {
                            ...row,
                            assignedChairIndex: newAssignedChairIndex,
                        };
                    }
                    return row;
                }));
            }
        } else {
            console.error("Failed to assign paper to chair");
            // Revert optimistic update on failure
            setRows(prevRows => prevRows.map(row => {
                if (row.paperId === paperId) {
                    // Revert to previous state - find the actual assignment from committee
                    let actualChairIndex: number | null = null;
                    if (committee?.chair_info && Array.isArray(committee.chair_info)) {
                        committee.chair_info.forEach((chair: ChairInfo, index: number) => {
                            if (chair.assignment_ids && chair.assignment_ids.includes(row.paperId)) {
                                actualChairIndex = index;
                            }
                        });
                    }
                    return {
                        ...row,
                        assignedChairIndex: actualChairIndex,
                    };
                }
                return row;
            }));
            alert("Failed to assign paper to chair. Please try again.");
        }
        
        // Reset flag after update completes
        setIsUpdatingChair(false);
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

            {/* Filter Chips */}
            <div className="flex flex-wrap gap-2 items-center">
                <button
                    className={`badge badge-lg p-4 cursor-pointer transition-all ${
                        selectedFilter === 'none'
                            ? 'badge-primary'
                            : 'badge-outline hover:badge-primary'
                    }`}
                    onClick={() => setSelectedFilter('none')}
                >
                    None
                </button>
                <button
                    className={`badge badge-lg p-4 cursor-pointer transition-all ${
                        selectedFilter === 'unassigned'
                            ? 'bg-gray-500 text-white'
                            : 'badge-outline border-gray-500 text-gray-500 hover:bg-gray-500 hover:text-white'
                    }`}
                    onClick={() => setSelectedFilter('unassigned')}
                >
                    Unassigned
                </button>
                {committee?.chair_info && Array.isArray(committee.chair_info) && committee.chair_info.map((chair: ChairInfo, index: number) => (
                    <button
                        key={index}
                        className={`badge badge-lg p-4 cursor-pointer transition-all ${
                            selectedFilter === index
                                ? ''
                                : 'badge-outline'
                        }`}
                        style={{
                            backgroundColor: selectedFilter === index ? chair.color : undefined,
                            borderColor: chair.color,
                            color: selectedFilter === index ? (chair.color ? '#fff' : undefined) : chair.color,
                        }}
                        onClick={() => setSelectedFilter(index)}
                    >
                        {chair.name}
                    </button>
                ))}
            </div>

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
                            <th 
                                className="px-4 py-2 cursor-pointer hover:bg-base-200 select-none"
                                onClick={() => handleSort('submitted_at')}
                            >
                                Submitted At {getSortIcon('submitted_at')}
                            </th>
                            <th 
                                className="px-4 py-2 cursor-pointer hover:bg-base-200 select-none"
                                onClick={() => handleSort('graded')}
                            >
                                Graded {getSortIcon('graded')}
                            </th>
                            <th 
                                className="px-4 py-2 cursor-pointer hover:bg-base-200 select-none"
                                onClick={() => handleSort('chair')}
                            >
                                Chair {getSortIcon('chair')}
                            </th>
                            <th className="px-4 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-6 text-center text-sm opacity-70">
                                    {selectedFilter === 'none' 
                                        ? "No position papers submitted yet for this committee."
                                        : "No papers match the selected filter."}
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map(row => {
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
                                                (() => {
                                                    const total = calculateTotalScore(row.paper);
                                                    return total !== null ? (
                                                        <span className="badge badge-success badge-lg">
                                                            {total}
                                                        </span>
                                                    ) : (
                                                        <span className="badge badge-success">Graded</span>
                                                    );
                                                })()
                                            ) : (
                                                <span className="badge badge-warning">Not graded</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="w-full max-w-xs">
                                                <select
                                                    className="select select-bordered w-full text-sm font-semibold py-2"
                                                    style={{
                                                        borderColor: row.assignedChairIndex !== null && committee?.chair_info?.[row.assignedChairIndex]
                                                            ? committee.chair_info[row.assignedChairIndex].color
                                                            : '#9ca3af',
                                                        backgroundColor: row.assignedChairIndex !== null && committee?.chair_info?.[row.assignedChairIndex]
                                                            ? committee.chair_info[row.assignedChairIndex].color
                                                            : '#9ca3af',
                                                        color: '#fff',
                                                        textOverflow: 'ellipsis',
                                                        overflow: 'hidden',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                    title={row.assignedChairIndex !== null && committee?.chair_info?.[row.assignedChairIndex]
                                                        ? committee.chair_info[row.assignedChairIndex].name
                                                        : 'Unassigned'}
                                                    value={row.assignedChairIndex !== null ? row.assignedChairIndex : ""}
                                                    onChange={(e) => {
                                                        const newChairIndex = e.target.value === "" ? null : parseInt(e.target.value);
                                                        handleChairAssignment(row.paperId, newChairIndex);
                                                    }}
                                                >
                                                    <option value="" style={{ backgroundColor: '#9ca3af', color: '#fff' }}>Unassigned</option>
                                                    {committee?.chair_info && Array.isArray(committee.chair_info) && committee.chair_info.map((chair: ChairInfo, index: number) => (
                                                        <option 
                                                            key={index} 
                                                            value={index}
                                                            style={{ backgroundColor: chair.color, color: '#fff' }}
                                                        >
                                                            {chair.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
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
