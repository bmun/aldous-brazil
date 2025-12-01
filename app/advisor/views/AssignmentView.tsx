'use client';

import { AssignmentProps, DelegateProps, getDelegatesAsAdvisor, loadAssignments, updateAssignment } from "@/app/utils/supabaseHelpers";
import { useEffect, useState } from "react";
import DelegateSubmission from "../modals/DelegateSubmission";
import Image from 'next/image';
import CountriesPanel from "../panels/CountriesPanel";
import CommitteesPanel from "../panels/CommittessPanel";
import { SINGLE_COMMITTEE } from "@/app/utils/generalHelper";

function AssignmentView() {
    const [assignments, setAssignments] = useState<AssignmentProps[]>([]);
    const [delegates, setDelegates] = useState<DelegateProps[]>([]);
    const [assignmentsUploaded, setAssignmentsUploaded] = useState(false);

    const [submittingDelegates, setSubmittingDelegates] = useState(false);

    const [assignmentId, setAssignmentId] = useState(0);
    const [assignmentDelegates, setAssignmentDelegates] = useState<DelegateProps[]>([]);
    const [specialized, setSpecialized] = useState(false);
    const [committeeName, setCommitteeName] = useState("");
    const [countryName, setCountryName] = useState("");

    useEffect(() => {(async () => {
        const newAssignments = await loadAssignments();
        const newDelegates = await getDelegatesAsAdvisor();
        if (newAssignments != null && newAssignments.length > 0) {
            setAssignments(newAssignments);
            setAssignmentsUploaded(true);
        } else {
            setAssignmentsUploaded(false);
        }
        if (newDelegates != null) {
            setDelegates(newDelegates);
        }
    })()}, []);

    const rejectAssignment = async (assignment: AssignmentProps) => {
        await updateAssignment(
            {...assignment, "rejected": true}
        );
    }

    return (
        <div className="h-full flex flex-col justify-start p-4">
            <DelegateSubmission 
                countryName={countryName} 
                committeeName={committeeName} 
                specialized={specialized} 
                assignmentId={assignmentId}
                assignmentDelegates={assignmentDelegates}
                submittingDelegates={submittingDelegates} 
                setSubmittingDelegates={setSubmittingDelegates} />
            <div className="flex flex-col gap-2 mb-4 h-full">
                <div className="flex flex-row gap-6 mr-2 justify-between items-end">
                    <div className="text-2xl">
                        Round 2 Assignments are <div className="badge badge-primary badge-xl text-white">Released</div><br></br>
                    </div>
                </div>
                <div className="flex flex-col gap-4">
                    <CountriesPanel />
                    <CommitteesPanel />
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
                                    <th>Delegate Assigned</th>
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
                                            <button 
                                                className="btn btn-primary btn-lg" 
                                                disabled={assignment.rejected || delegates.filter(delegate => delegate.assignment_id === assignment.id).length == (SINGLE_COMMITTEE.includes(assignment.committee_name) ? 1 : 2)}
                                                onClick={() => {
                                                    if (assignment.id) {
                                                        setAssignmentId(assignment.id);
                                                        setAssignmentDelegates(delegates.filter(delegate => delegate.assignment_id === assignment.id));
                                                        setSpecialized(false);
                                                        setCommitteeName(assignment.committee_name);
                                                        setCountryName(assignment.country_name);
                                                        setSubmittingDelegates(true);
                                                    }
                                                }}
                                            >
                                                Assign ({delegates.filter(delegate => delegate.assignment_id === assignment.id).length}/{SINGLE_COMMITTEE.includes(assignment.committee_name) ? "1" : "2"})
                                            </button>
                                        </td>
                                        <td className="text-secondary">
                                            No Submission
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
                                                        setAssignments(prev =>
                                                            prev.map((a, i) =>
                                                                i === index ? { ...a, rejected: true } : a
                                                            )
                                                        );
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