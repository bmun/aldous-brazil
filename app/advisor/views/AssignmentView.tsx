'use client';

import { AssignmentProps, loadAssignments, updateAssignment } from "@/app/utils/supabaseHelpers";
import { useEffect, useState } from "react";
import DelegateSubmission from "../modals/DelegateSubmission";
import PositionPaperModal from "../modals/PositionPaperModal";
import Image from 'next/image';
import { SINGLE_COMMITTEE } from "@/app/utils/generalHelper";

function AssignmentView() {
    const [assignments, setAssignments] = useState<AssignmentProps[]>([]);
    const [assignmentsUploaded, setAssignmentsUploaded] = useState(false);

    const [submittingDelegates, setSubmittingDelegates] = useState(false);

    const [assignmentId, setAssignmentId] = useState(0);
    const [delegateIds, setDelegateIds] = useState<string[]>([]);
    const [specialized, setSpecialized] = useState(false);
    const [committeeName, setCommitteeName] = useState("");
    const [countryName, setCountryName] = useState("");
    
    // Position paper modal state
    const [paperModalOpen, setPaperModalOpen] = useState(false);
    const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null);
    const [selectedCommitteeName, setSelectedCommitteeName] = useState("");
    const [selectedCountryName, setSelectedCountryName] = useState("");

    useEffect(() => {(async () => {
        const newAssignments = await loadAssignments();
        
        if (newAssignments != null && newAssignments.length > 0) {
            // Sort assignments: not fully assigned first, then fully assigned, then rejected
            const sortedAssignments = [...newAssignments].sort((a, b) => {
                // Helper function to check if assignment is fully assigned
                const isFullyAssigned = (assignment: AssignmentProps) => {
                    const maxDelegates = SINGLE_COMMITTEE.includes(assignment.committee_name) ? 1 : 2;
                    const currentCount = assignment.delegate_ids?.length || 0;
                    return currentCount >= maxDelegates;
                };

                // First, separate rejected from non-rejected (rejected goes to bottom)
                if (a.rejected && !b.rejected) return 1; // a goes to bottom
                if (!a.rejected && b.rejected) return -1; // b goes to bottom
                
                // If both are rejected or both are not rejected
                if (a.rejected && b.rejected) {
                    // Both rejected - sort alphabetically
                    return a.committee_name.localeCompare(b.committee_name);
                }
                
                // Both not rejected - check if fully assigned
                const aFullyAssigned = isFullyAssigned(a);
                const bFullyAssigned = isFullyAssigned(b);
                
                // Separate fully assigned from not fully assigned
                if (aFullyAssigned && !bFullyAssigned) return 1; // fully assigned goes after not fully assigned
                if (!aFullyAssigned && bFullyAssigned) return -1; // not fully assigned goes before fully assigned
                
                // Both in same category (both fully assigned or both not fully assigned)
                const aCount = a.delegate_ids?.length || 0;
                const bCount = b.delegate_ids?.length || 0;
                if (aCount !== bCount) {
                    return aCount - bCount; // Ascending order by count
                }
                // If same count, sort alphabetically by committee_name as tiebreaker
                return a.committee_name.localeCompare(b.committee_name);
            });
            setAssignments(sortedAssignments);
            setAssignmentsUploaded(true);
        } else {
            setAssignmentsUploaded(false);
        }
    })()}, []);

    const rejectAssignment = async (assignment: AssignmentProps) => {
        await updateAssignment(
            {...assignment, "rejected": true}
        );
    }

    const refreshAssignments = async () => {
        // Small delay to ensure database writes are committed
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reload assignments to get updated delegate_ids arrays
        const newAssignments = await loadAssignments();
        if (newAssignments != null && newAssignments.length > 0) {
            // Sort assignments: not fully assigned first, then fully assigned, then rejected
            const sortedAssignments = [...newAssignments].sort((a, b) => {
                // Helper function to check if assignment is fully assigned
                const isFullyAssigned = (assignment: AssignmentProps) => {
                    const maxDelegates = SINGLE_COMMITTEE.includes(assignment.committee_name) ? 1 : 2;
                    const currentCount = assignment.delegate_ids?.length || 0;
                    return currentCount >= maxDelegates;
                };

                // First, separate rejected from non-rejected (rejected goes to bottom)
                if (a.rejected && !b.rejected) return 1; // a goes to bottom
                if (!a.rejected && b.rejected) return -1; // b goes to bottom
                
                // If both are rejected or both are not rejected
                if (a.rejected && b.rejected) {
                    // Both rejected - sort alphabetically
                    return a.committee_name.localeCompare(b.committee_name);
                }
                
                // Both not rejected - check if fully assigned
                const aFullyAssigned = isFullyAssigned(a);
                const bFullyAssigned = isFullyAssigned(b);
                
                // Separate fully assigned from not fully assigned
                if (aFullyAssigned && !bFullyAssigned) return 1; // fully assigned goes after not fully assigned
                if (!aFullyAssigned && bFullyAssigned) return -1; // not fully assigned goes before fully assigned
                
                // Both in same category (both fully assigned or both not fully assigned)
                const aCount = a.delegate_ids?.length || 0;
                const bCount = b.delegate_ids?.length || 0;
                if (aCount !== bCount) {
                    return aCount - bCount; // Ascending order by count
                }
                // If same count, sort alphabetically by committee_name as tiebreaker
                return a.committee_name.localeCompare(b.committee_name);
            });
            setAssignments(sortedAssignments);
            // If modal is open, update the delegate_ids array
            if (assignmentId) {
                const currentAssignment = sortedAssignments.find(a => a.id === assignmentId);
                if (currentAssignment) {
                    const updatedDelegateIds = currentAssignment.delegate_ids || [];
                    setDelegateIds(updatedDelegateIds);
                } else {
                    setDelegateIds([]);
                }
            }
        }
    }

    return (
        <div className="h-full flex flex-col justify-start p-4">
            <DelegateSubmission 
                countryName={countryName} 
                committeeName={committeeName} 
                specialized={specialized} 
                assignmentId={assignmentId}
                delegateIds={delegateIds}
                submittingDelegates={submittingDelegates} 
                setSubmittingDelegates={setSubmittingDelegates}
                onDelegateCreated={refreshAssignments} />
            <PositionPaperModal
                paperId={selectedPaperId}
                committeeName={selectedCommitteeName}
                countryName={selectedCountryName}
                isOpen={paperModalOpen}
                setIsOpen={setPaperModalOpen}
            />
            <div className="flex flex-col gap-2 mb-4 h-full">
                <div className="flex flex-row gap-6 mr-2 justify-between items-end">
                    <div className="text-2xl">
                        Round 2 Assignments are <div className="badge badge-primary badge-xl text-white">Released</div><br></br>
                    </div>
                </div>
                <div className="flex flex-col gap-4">
                    {/*<CountriesPanel />
                    <CommitteesPanel />*/}
                    {!assignmentsUploaded ?
                        <div className="flex flex-col bg-black min-h-[750px] justify-center items-center text-3xl text-center p-4 gap-4 border-2 rounded-xl text-primary border-primary h-full">
                            <Image src="/BMUN Circle Logo Blue.png" alt="BMUN Logo" width={200} height={200}/>
                            No assignments have been posted. Please check back later.
                        </div>
                        :
                        <div className="overflow-scroll rounded-xl border-2 border-primary bg-base-100">
                        <table className="table table-zebra text-xl text-center">
                            <thead>
                                <tr className="text-lg font-bold">
                                    <th>Committee</th>
                                    <th>Country</th>
                                    <th>Assign Delegates</th>
                                    <th>Assigned Delegates</th>
                                    <th>Position Paper Status</th>
                                    <th>Reject Assignment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignments.map((assignment, index) => (
                                    <tr key={index} className="text-xl font-bold">
                                        <td className="text-primary">
                                            {assignment.committee_name}
                                        </td>
                                        <td>
                                            {assignment.country_name}
                                        </td>
                                        <td>
                                            {(() => {
                                                const delegateEmails = assignment.delegate_ids || [];
                                                const hasDelegates = delegateEmails.length > 0;
                                                const tooltipContent = hasDelegates 
                                                    ? delegateEmails.join('\n')
                                                    : '';
                                                
                                                const buttonElement = (
                                                    <button 
                                                        className="btn btn-primary btn-lg" 
                                                        disabled={assignment.rejected || (assignment.delegate_ids?.length || 0) >= (SINGLE_COMMITTEE.includes(assignment.committee_name) ? 1 : 2)}
                                                        onClick={async () => {
                                                            if (assignment.id) {
                                                                setAssignmentId(assignment.id);
                                                                // Pass delegate_ids array (emails) directly
                                                                setDelegateIds(assignment.delegate_ids || []);
                                                                setSpecialized(false);
                                                                setCommitteeName(assignment.committee_name);
                                                                setCountryName(assignment.country_name);
                                                                setSubmittingDelegates(true);
                                                            }
                                                        }}
                                                    >
                                                        Assign ({(assignment.delegate_ids?.length || 0)}/{SINGLE_COMMITTEE.includes(assignment.committee_name) ? "1" : "2"})
                                                    </button>
                                                );

                                                if (hasDelegates) {
                                                    return (
                                                        <div className="tooltip tooltip-top" data-tip={tooltipContent}>
                                                            {buttonElement}
                                                        </div>
                                                    );
                                                }

                                                return buttonElement;
                                            })()}
                                        </td>
                                        <td>
                                            {(() => {
                                                const delegateEmails = assignment.delegate_ids || [];
                                                if (delegateEmails.length === 0) {
                                                    return <span className="text-gray-500">—</span>;
                                                }
                                                return (
                                                    <div className="flex flex-col gap-1 items-center">
                                                        {delegateEmails.map((email, idx) => (
                                                            <div key={idx} className="text-sm">
                                                                {email}
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td>
                                            {assignment.paper_id ? (
                                                <button
                                                    className="btn btn-secondary btn-lg text-white"
                                                    onClick={() => {
                                                        setSelectedPaperId(assignment.paper_id!);
                                                        setSelectedCommitteeName(assignment.committee_name);
                                                        setSelectedCountryName(assignment.country_name);
                                                        setPaperModalOpen(true);
                                                    }}
                                                >
                                                    View Submission
                                                </button>
                                            ) : (
                                                <span className="text-secondary">No Submission</span>
                                            )}
                                        </td>
                                        <td>
                                            {assignment.rejected ? 
                                                <button className="btn btn-ghost btn-lg text-red-500" disabled>
                                                    Rejected
                                                </button>
                                            :
                                                <button 
                                                    className="btn btn-error btn-lg text-white"
                                                    onClick={async () => {
                                                        await rejectAssignment(assignment);
                                                        setAssignments(prev => {
                                                            // Update the assignment and re-sort
                                                            const updated = prev.map((a, i) =>
                                                                i === index ? { ...a, rejected: true } : a
                                                            );
                                                            return updated.sort((a, b) => {
                                                                // Helper function to check if assignment is fully assigned
                                                                const isFullyAssigned = (assignment: AssignmentProps) => {
                                                                    const maxDelegates = SINGLE_COMMITTEE.includes(assignment.committee_name) ? 1 : 2;
                                                                    const currentCount = assignment.delegate_ids?.length || 0;
                                                                    return currentCount >= maxDelegates;
                                                                };

                                                                // First, separate rejected from non-rejected (rejected goes to bottom)
                                                                if (a.rejected && !b.rejected) return 1; // a goes to bottom
                                                                if (!a.rejected && b.rejected) return -1; // b goes to bottom
                                                                
                                                                // If both are rejected or both are not rejected
                                                                if (a.rejected && b.rejected) {
                                                                    // Both rejected - sort alphabetically
                                                                    return a.committee_name.localeCompare(b.committee_name);
                                                                }
                                                                
                                                                // Both not rejected - check if fully assigned
                                                                const aFullyAssigned = isFullyAssigned(a);
                                                                const bFullyAssigned = isFullyAssigned(b);
                                                                
                                                                // Separate fully assigned from not fully assigned
                                                                if (aFullyAssigned && !bFullyAssigned) return 1; // fully assigned goes after not fully assigned
                                                                if (!aFullyAssigned && bFullyAssigned) return -1; // not fully assigned goes before fully assigned
                                                                
                                                                // Both in same category (both fully assigned or both not fully assigned)
                                                                const aCount = a.delegate_ids?.length || 0;
                                                                const bCount = b.delegate_ids?.length || 0;
                                                                if (aCount !== bCount) {
                                                                    return aCount - bCount; // Ascending order by count
                                                                }
                                                                // If same count, sort alphabetically by committee_name as tiebreaker
                                                                return a.committee_name.localeCompare(b.committee_name);
                                                            });
                                                        });
                                                    }}
                                                >
                                                    Reject
                                                </button>
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    }
                </div>
            </div>
        </div>
    )
}

export default AssignmentView;