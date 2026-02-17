'use client';

import { getDelegatesAsAdvisor, loadAssignments, MAX_DELEGATES_PER_SCHOOL, updateDelegateName, sendMagicLinkToEmail } from "@/app/utils/supabaseHelpers";
import { useEffect, useState } from "react";
import CreateDelegateModal from "../modals/CreateDelegateModal";
import { AssignmentProps } from "@/app/utils/supabaseHelpers";

type DelegateRow = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    assignment_id: number | null;
};

interface DelegateAccountsTabProps {
    modalOpen?: boolean;
    setModalOpen?: (open: boolean) => void;
    onCreated?: () => void;
    currentCount?: number;
    hideHeader?: boolean;
    /** When this changes, delegate list and assignments are reloaded (e.g. after assign/remove elsewhere). */
    refreshKey?: number;
}

export default function DelegateAccountsTab(props: DelegateAccountsTabProps = {}) {
    const {
        modalOpen: propsModalOpen,
        setModalOpen: propsSetModalOpen,
        onCreated,
        currentCount: propsCurrentCount,
        hideHeader = false,
        refreshKey,
    } = props;
    const [internalModalOpen, setInternalModalOpen] = useState(false);
    const modalOpen = propsModalOpen ?? internalModalOpen;
    const setModalOpen = propsSetModalOpen ?? setInternalModalOpen;
    const [delegates, setDelegates] = useState<DelegateRow[]>([]);
    const [assignments, setAssignments] = useState<AssignmentProps[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingEmail, setEditingEmail] = useState<string | null>(null);
    const [editFirst, setEditFirst] = useState("");
    const [editLast, setEditLast] = useState("");
    const [editSaving, setEditSaving] = useState(false);
    const [sendingLinkEmail, setSendingLinkEmail] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        const [delList, assignList] = await Promise.all([
            getDelegatesAsAdvisor(),
            loadAssignments(),
        ]);
        setDelegates(
            (delList || []).map((d: any) => ({
                id: d.id,
                first_name: d.first_name ?? null,
                last_name: d.last_name ?? null,
                email: d.email,
                assignment_id: d.assignment_id ?? null,
            }))
        );
        setAssignments(assignList || []);
        setLoading(false);
    };

    const refreshDeps = refreshKey ?? 0;
    useEffect(() => {
        load();
    }, [refreshDeps]);

    const assignmentLabel = (assignmentId: number | null) => {
        if (assignmentId == null || !assignments?.length) return "—";
        const a = assignments.find((x) => x.id === assignmentId);
        return a ? `${a.committee_name} — ${a.country_name}` : "—";
    };

    const atLimit = delegates.length >= MAX_DELEGATES_PER_SCHOOL;
    const currentCount = propsCurrentCount ?? delegates.length;

    const startEdit = (d: DelegateRow) => {
        setEditingEmail(d.email);
        setEditFirst(d.first_name ?? "");
        setEditLast(d.last_name ?? "");
    };

    const cancelEdit = () => {
        setEditingEmail(null);
    };

    const saveEdit = async () => {
        if (!editingEmail) return;
        const first = editFirst.trim();
        const last = editLast.trim();
        if (!first || !last) {
            window.alert("First and last name are required.");
            return;
        }
        setEditSaving(true);
        try {
            const result = await updateDelegateName(editingEmail, first, last);
            if (result.success) {
                setEditingEmail(null);
                await load();
            } else {
                window.alert(result.error ?? "Failed to update name.");
            }
        } catch (e: any) {
            window.alert(e?.message ?? "Failed to update.");
        }
        setEditSaving(false);
    };

    const handleSendMagicLink = async (delegateEmail: string) => {
        setSendingLinkEmail(delegateEmail);
        try {
            const result = await sendMagicLinkToEmail(delegateEmail);
            if (result.success) {
                window.alert(`Account recovery link sent to ${delegateEmail}. They can click the link to sign in.`);
            } else {
                window.alert(result.error ?? "Failed to send account recovery link.");
            }
        } catch (e: any) {
            window.alert(e?.message ?? "Failed to send account recovery link.");
        }
        setSendingLinkEmail(null);
    };

    return (
        <div className="flex flex-col">
            {!hideHeader && (
                <>
                    <div className="flex flex-row items-center justify-center gap-2 px-4 py-3 bg-base-200 border-b border-base-300">
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={atLimit}
                            onClick={() => setModalOpen(true)}
                        >
                            Create delegate
                        </button>
                        <span className="tooltip tooltip-bottom" data-tip={`${delegates.length}/${MAX_DELEGATES_PER_SCHOOL} delegates`}>
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-base-300 text-base-content/70 hover:bg-base-content/20" aria-label="Delegate count">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a5.484 5.484 0 0 1 7.082 7.082l-.02.041m-94.41 5.482a5.484 5.484 0 0 1-7.082-7.082l.02-.041m94.41-5.482a5.484 5.484 0 0 1 7.082 7.082l-.02.041" />
                                </svg>
                            </span>
                        </span>
                    </div>
                    {atLimit && (
                        <p className="text-warning text-sm px-4 py-1 bg-base-200 border-b border-base-300">
                            Maximum delegates per school reached. Remove a delegate before adding another.
                        </p>
                    )}
                </>
            )}
            {loading ? (
                <div className="flex justify-center p-8">
                    <span className="loading loading-spinner loading-lg" />
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table table-zebra text-base">
                        <thead>
                            <tr className="text-base">
                                <th>First name</th>
                                <th>Last name</th>
                                <th>Email</th>
                                <th>Assignment</th>
                                <th>Edit</th>
                                <th>Account Recovery</th>
                            </tr>
                        </thead>
                        <tbody>
                            {delegates.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center text-base-content/70">
                                        No delegate accounts yet. Create one above.
                                    </td>
                                </tr>
                            ) : (
                                delegates.map((d) => (
                                    <tr key={d.id}>
                                        <td>
                                            {editingEmail === d.email ? (
                                                <input
                                                    type="text"
                                                    className="input input-bordered input-sm w-full max-w-[10rem]"
                                                    placeholder="First name"
                                                    value={editFirst}
                                                    onChange={(e) => setEditFirst(e.target.value)}
                                                    disabled={editSaving}
                                                />
                                            ) : (
                                                d.first_name ?? "—"
                                            )}
                                        </td>
                                        <td>
                                            {editingEmail === d.email ? (
                                                <input
                                                    type="text"
                                                    className="input input-bordered input-sm w-full max-w-[10rem]"
                                                    placeholder="Last name"
                                                    value={editLast}
                                                    onChange={(e) => setEditLast(e.target.value)}
                                                    disabled={editSaving}
                                                />
                                            ) : (
                                                d.last_name ?? "—"
                                            )}
                                        </td>
                                        <td>{d.email}</td>
                                        <td className="max-w-xs truncate" title={assignmentLabel(d.assignment_id)}>
                                            {assignmentLabel(d.assignment_id)}
                                        </td>
                                        <td>
                                            {editingEmail === d.email ? (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-md"
                                                        disabled={editSaving || !editFirst.trim() || !editLast.trim()}
                                                        onClick={saveEdit}
                                                    >
                                                        {editSaving ? <span className="loading loading-spinner loading-sm" /> : "Save"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-md"
                                                        disabled={editSaving}
                                                        onClick={cancelEdit}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-md"
                                                    onClick={() => startEdit(d)}
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </td>
                                        <td>
                                            {editingEmail === d.email ? null : (
                                                <button
                                                    type="button"
                                                    className="btn btn-success btn-md text-white bg-green-600 hover:bg-green-700 border-0"
                                                    disabled={sendingLinkEmail !== null}
                                                    onClick={() => handleSendMagicLink(d.email)}
                                                    title="Send account recovery link to sign in"
                                                >
                                                    {sendingLinkEmail === d.email ? (
                                                        <span className="loading loading-spinner loading-sm" />
                                                    ) : (
                                                        "Account Recovery"
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            <CreateDelegateModal
                isOpen={modalOpen}
                setIsOpen={setModalOpen}
                currentCount={currentCount}
                onCreated={async () => { if (onCreated) await onCreated(); await load(); }}
            />
        </div>
    );
}
