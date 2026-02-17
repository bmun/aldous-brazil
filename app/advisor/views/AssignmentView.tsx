'use client';

import {
    AssignmentProps,
    loadAssignments,
    updateAssignment,
    getDelegatesAsAdvisor,
    linkDelegateToAssignment,
    removeDelegateFromAssignment,
    MAX_DELEGATES_PER_SCHOOL,
} from "@/app/utils/supabaseHelpers";
import { useEffect, useMemo, useState } from "react";
import PositionPaperModal from "../modals/PositionPaperModal";
import DelegateAccountsTab from "./DelegateAccountsTab";
import Image from "next/image";
import { SINGLE_COMMITTEE } from "@/app/utils/generalHelper";

type DelegateOption = { email: string; first_name: string | null; last_name: string | null };

type SortBy = "committee" | "country" | "delegates" | "positionPaper" | "reject" | null;

function sortAssignments(
    assignments: AssignmentProps[],
    sortBy: SortBy,
    sortDir: "asc" | "desc"
): AssignmentProps[] {
    if (!sortBy) return assignments;
    const _maxDelegates = (a: AssignmentProps) => (SINGLE_COMMITTEE.includes(a.committee_name) ? 1 : 2);
    const delegateCount = (a: AssignmentProps) => a.delegate_ids?.length ?? 0;
    const mult = sortDir === "asc" ? 1 : -1;

    return [...assignments].sort((a, b) => {
        let cmp = 0;
        switch (sortBy) {
            case "committee":
                cmp = a.committee_name.localeCompare(b.committee_name);
                break;
            case "country":
                cmp = a.country_name.localeCompare(b.country_name);
                break;
            case "delegates": {
                const aCount = delegateCount(a);
                const bCount = delegateCount(b);
                cmp = aCount !== bCount ? aCount - bCount : a.committee_name.localeCompare(b.committee_name);
                break;
            }
            case "positionPaper": {
                const aHas = a.paper_id != null ? 1 : 0;
                const bHas = b.paper_id != null ? 1 : 0;
                cmp = aHas !== bHas ? aHas - bHas : a.committee_name.localeCompare(b.committee_name);
                break;
            }
            case "reject": {
                if (a.rejected && !b.rejected) cmp = 1;
                else if (!a.rejected && b.rejected) cmp = -1;
                else cmp = a.committee_name.localeCompare(b.committee_name);
                break;
            }
            default:
                cmp = a.committee_name.localeCompare(b.committee_name);
        }
        return mult * cmp;
    });
}

interface AssignmentViewProps {
    /** When set, only this view is shown and the internal tab bar is hidden (for nav bar tabs). */
    forceTab?: "assignments" | "delegates";
}

function AssignmentView({ forceTab }: AssignmentViewProps = {}) {
    const [activeTab, setActiveTab] = useState<"assignments" | "delegates">(forceTab ?? "assignments");
    const currentView = forceTab ?? activeTab;
    const [assignments, setAssignments] = useState<AssignmentProps[]>([]);
    const [delegates, setDelegates] = useState<DelegateOption[]>([]);
    const [assignmentsUploaded, setAssignmentsUploaded] = useState(false);
    const [sortBy, setSortBy] = useState<SortBy>("committee");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    const handleSort = (col: SortBy) => {
        if (sortBy === col) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(col);
            setSortDir("asc");
        }
    };

    const SortableTh = ({
        label,
        column,
    }: {
        label: string;
        column: SortBy;
    }) => (
        <th
            className="cursor-pointer hover:underline select-none text-base font-bold"
            onClick={() => handleSort(column)}
        >
            {label}
            <span className="inline-block w-4 ml-1 text-center opacity-70" aria-hidden>
                {sortBy === column ? (sortDir === "asc" ? "↑" : "↓") : "\u00A0"}
            </span>
        </th>
    );
    const [selectedForAssign, setSelectedForAssign] = useState<Record<number, string>>({});
    const [assigningId, setAssigningId] = useState<number | null>(null);
    const [removingAssignmentId, setRemovingAssignmentId] = useState<number | null>(null);

    const [delegateAccountsRefreshKey, setDelegateAccountsRefreshKey] = useState(0);
    const [delegateModalOpen, setDelegateModalOpen] = useState(false);
    const [paperModalOpen, setPaperModalOpen] = useState(false);
    const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
    const [selectedCommitteeName, setSelectedCommitteeName] = useState("");
    const [selectedCountryName, setSelectedCountryName] = useState("");

    const load = async () => {
        const [assignList, delList] = await Promise.all([
            loadAssignments(),
            getDelegatesAsAdvisor(),
        ]);
        if (assignList != null && assignList.length > 0) {
            setAssignments(assignList);
            setAssignmentsUploaded(true);
        } else {
            setAssignmentsUploaded(false);
        }
        setDelegates(
            (delList || []).map((d: any) => ({
                email: d.email,
                first_name: d.first_name ?? null,
                last_name: d.last_name ?? null,
            }))
        );
    };

    useEffect(() => {
        load();
    }, []);

    const refreshAssignments = async () => {
        await new Promise((r) => setTimeout(r, 500));
        const newAssignments = await loadAssignments();
        if (newAssignments != null && newAssignments.length > 0) {
            setAssignments(newAssignments);
        }
        const delList = await getDelegatesAsAdvisor();
        setDelegates(
            (delList || []).map((d: any) => ({
                email: d.email,
                first_name: d.first_name ?? null,
                last_name: d.last_name ?? null,
            }))
        );
    };

    const rejectAssignment = async (assignment: AssignmentProps) => {
        await updateAssignment({ ...assignment, rejected: true });
        await refreshAssignments();
    };

    const handleAssignWithEmail = async (assignmentId: number, email: string) => {
        if (!email) return;
        setAssigningId(assignmentId);
        try {
            const result = await linkDelegateToAssignment(email, assignmentId);
            if (result.success) {
                setSelectedForAssign((prev) => ({ ...prev, [assignmentId]: "" }));
                await refreshAssignments();
                setDelegateAccountsRefreshKey((k) => k + 1);
            } else {
                window.alert(result.error || "Failed to assign");
            }
        } catch (e: any) {
            window.alert(e?.message || "Failed to assign");
        }
        setAssigningId(null);
    };

    const handleRemove = async (assignmentId: number, delegateEmail: string) => {
        setRemovingAssignmentId(assignmentId);
        try {
            const result = await removeDelegateFromAssignment(assignmentId, delegateEmail);
            if (result.success) {
                await refreshAssignments();
                setDelegateAccountsRefreshKey((k) => k + 1);
            } else window.alert(result.error || "Failed to remove");
        } catch (e: any) {
            window.alert(e?.message || "Failed to remove");
        }
        setRemovingAssignmentId(null);
    };

    const sortedAssignments = useMemo(
        () => sortAssignments(assignments, sortBy, sortDir),
        [assignments, sortBy, sortDir]
    );

    return (
        <div className="h-full flex flex-col justify-start p-4">
            <PositionPaperModal
                paperId={selectedPaperId}
                committeeName={selectedCommitteeName}
                countryName={selectedCountryName}
                isOpen={paperModalOpen}
                setIsOpen={setPaperModalOpen}
                assignmentId={selectedAssignmentId}
            />
            <div className="flex flex-col gap-2 mb-4 h-full">
                {currentView === "assignments" && (
                    <div className="flex flex-row gap-6 mr-2 justify-between items-end">
                        <div className="text-2xl">
                            Round 2 Assignments are{" "}
                            <span className="badge badge-primary badge-xl text-white">Released</span>
                        </div>
                    </div>
                )}
                {currentView === "delegates" && (
                    <div className="flex flex-row gap-6 mr-2 justify-between items-end">
                        <div className="text-2xl">
                            Delegate accounts{" "}
                            <span className="badge badge-primary badge-xl text-white">
                                {delegates.length}/{MAX_DELEGATES_PER_SCHOOL}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={delegates.length >= MAX_DELEGATES_PER_SCHOOL}
                            onClick={() => setDelegateModalOpen(true)}
                        >
                            Create delegate
                        </button>
                    </div>
                )}

                <div className="rounded-xl border-2 border-primary overflow-hidden bg-base-100 flex flex-col">
                    {!forceTab && (
                        <div role="tablist" className="tabs tabs-boxed flex w-full bg-base-200 border-b border-base-300 p-0 [&>.tab]:flex-1 [&>.tab]:rounded-none [&>.tab]:text-lg [&>.tab]:font-semibold">
                            <button
                                role="tab"
                                className={`tab ${activeTab === "assignments" ? "tab-active" : ""}`}
                                onClick={() => setActiveTab("assignments")}
                            >
                                Assignments
                            </button>
                            <button
                                role="tab"
                                className={`tab ${activeTab === "delegates" ? "tab-active" : ""}`}
                                onClick={() => setActiveTab("delegates")}
                            >
                                Delegate accounts
                            </button>
                        </div>
                    )}

                    {currentView === "delegates" && (
                        <DelegateAccountsTab
                            modalOpen={delegateModalOpen}
                            setModalOpen={setDelegateModalOpen}
                            onCreated={refreshAssignments}
                            currentCount={delegates.length}
                            hideHeader
                            refreshKey={delegateAccountsRefreshKey}
                        />
                    )}

                    {currentView === "assignments" && (
                        <>
                            {!assignmentsUploaded ? (
                                <div className="flex flex-col bg-black min-h-[750px] justify-center items-center text-3xl text-center p-4 gap-4 text-primary h-full">
                                    <Image
                                        src="/BMUN Circle Logo Blue.png"
                                        alt="BMUN Logo"
                                        width={200}
                                        height={200}
                                    />
                                    No assignments have been posted. Please check back later.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="table table-zebra text-sm text-center">
                                    <thead>
                                        <tr>
                                            <SortableTh label="Committee" column="committee" />
                                            <SortableTh label="Country" column="country" />
                                            <SortableTh label="Assign delegates" column="delegates" />
                                            <SortableTh label="Assigned delegates" column="delegates" />
                                            <SortableTh label="Position Paper Status" column="positionPaper" />
                                            <SortableTh label="Reject Assignment" column="reject" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedAssignments.map((assignment, index) => {
                                            const maxD = SINGLE_COMMITTEE.includes(assignment.committee_name)
                                                ? 1
                                                : 2;
                                            const currentEmails = assignment.delegate_ids || [];
                                            const full = currentEmails.length >= maxD;
                                            const selectedEmail = selectedForAssign[assignment.id ?? 0] ?? "";
                                            const isAssigning = assigningId === assignment.id;
                                            return (
                                                <tr key={assignment.id ?? index}>
                                                    <td className="text-primary font-medium">{assignment.committee_name}</td>
                                                    <td className="font-medium">{assignment.country_name}</td>
                                                    <td>
                                                        <div className="flex flex-row flex-wrap items-center gap-2 justify-center">
                                                            <select
                                                                className="select select-bordered select-sm min-w-0 flex-1 max-w-[12rem] focus:outline focus:outline-2 focus:outline-blue-500 focus:border-blue-500"
                                                                value={selectedEmail}
                                                                disabled={assignment.rejected || full || isAssigning}
                                                                onChange={(e) => {
                                                                    const email = e.target.value;
                                                                    if (email && assignment.id) {
                                                                        handleAssignWithEmail(assignment.id, email);
                                                                    }
                                                                }}
                                                            >
                                                                <option value="">Select delegate</option>
                                                                {delegates.map((d) => (
                                                                    <option key={d.email} value={d.email}>
                                                                        {[d.first_name, d.last_name].filter(Boolean).join(" ") || d.email} ({d.email})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <span className="text-base-content/70 whitespace-nowrap flex-shrink-0">
                                                                ({currentEmails.length}/{maxD})
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {currentEmails.length === 0 ? (
                                                            <span className="text-gray-500">—</span>
                                                        ) : (
                                                            <div className="flex flex-col gap-1 items-center">
                                                                {currentEmails.map((email) => {
                                                                    const isRemoving =
                                                                        removingAssignmentId === assignment.id;
                                                                    return (
                                                                        <div
                                                                            key={email}
                                                                            className="flex items-center gap-1"
                                                                        >
                                                                            <span className="text-sm">
                                                                                {email}
                                                                            </span>
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-error btn-xs btn-circle btn-ghost text-error hover:bg-error/20"
                                                                                disabled={
                                                                                    assignment.rejected || isRemoving
                                                                                }
                                                                                onClick={() =>
                                                                                    handleRemove(assignment.id!, email)
                                                                                }
                                                                                aria-label="Remove delegate"
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {assignment.paper_id ? (
                                                            <button
                                                                className="btn btn-secondary btn-sm text-white"
                                                                onClick={() => {
                                                                    setSelectedPaperId(assignment.paper_id!);
                                                                    setSelectedAssignmentId(
                                                                        assignment.id ?? null
                                                                    );
                                                                    setSelectedCommitteeName(
                                                                        assignment.committee_name
                                                                    );
                                                                    setSelectedCountryName(
                                                                        assignment.country_name
                                                                    );
                                                                    setPaperModalOpen(true);
                                                                }}
                                                            >
                                                                View Submission
                                                            </button>
                                                        ) : (
                                                            <span className="text-secondary">
                                                                No Submission
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {assignment.rejected ? (
                                                            <button
                                                                className="btn btn-ghost btn-sm text-red-500"
                                                                disabled
                                                            >
                                                                Rejected
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="btn btn-error btn-sm text-white"
                                                                onClick={async () => {
                                                                    await rejectAssignment(assignment);
                                                                }}
                                                            >
                                                                Reject
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AssignmentView;
