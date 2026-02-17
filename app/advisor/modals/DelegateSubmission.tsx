'use client';

import {
    signUpDelegate,
    getDelegatesByEmails,
    removeDelegateFromAssignment,
    updateDelegateName,
    linkDelegateToAssignment,
    getDelegateByEmail,
    getUnassignedDelegatesForAdvisor,
} from "@/app/utils/supabaseHelpers";
import { useEffect, useState } from "react";
import { SINGLE_COMMITTEE } from "@/app/utils/generalHelper";

interface DelegateSubmissionProps {
    countryName: string,
    committeeName: string,
    specialized: boolean,
    assignmentId: number,
    delegateIds: string[],
    submittingDelegates: boolean,
    setSubmittingDelegates: Function,
    onDelegateCreated?: Function
}

interface DelegateDetail {
    email: string;
    first_name: string | null;
    last_name: string | null;
}

function DelegateSubmission({countryName, 
        committeeName,
        specialized: _specialized,
        assignmentId,
        delegateIds,
        submittingDelegates, 
        setSubmittingDelegates,
        onDelegateCreated} : DelegateSubmissionProps
) {
    const isSingleDelegate = SINGLE_COMMITTEE.includes(committeeName);
    const maxDelegates = isSingleDelegate ? 1 : 2;
    const currentCount = delegateIds?.length || 0;
    const remainingCount = maxDelegates - currentCount;
   
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [emailValid, setEmailValid] = useState(false);
    const [loading, setLoading] = useState(false);

    const [delegateDetails, setDelegateDetails] = useState<DelegateDetail[]>([]);
    const [editingEmail, setEditingEmail] = useState<string | null>(null);
    const [editFirstName, setEditFirstName] = useState("");
    const [editLastName, setEditLastName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editEmailValid, setEditEmailValid] = useState(false);
    const [editLoading, setEditLoading] = useState(false);

    useEffect(() => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (email.length > 0) {
            setEmailValid(emailRegex.test(email));
        } else {
            setEmailValid(false);
        }
    }, [email]);

    useEffect(() => {
        if (editingEmail) {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            setEditEmailValid(emailRegex.test(editEmail));
        }
    }, [editEmail, editingEmail]);

    useEffect(() => {
        if (delegateIds?.length > 0 && submittingDelegates) {
            getDelegatesByEmails(delegateIds).then((list) => {
                setDelegateDetails(list.map((d) => ({
                    email: d.email,
                    first_name: d.first_name,
                    last_name: d.last_name,
                })));
            });
        } else {
            setDelegateDetails([]);
        }
    }, [delegateIds, submittingDelegates]);

    useEffect(() => {
        if (submittingDelegates) {
            setFirstName("");
            setLastName("");
            setEmail("");
            setEditingEmail(null);
        }
    }, [assignmentId, submittingDelegates]);

    const [unassignedDelegates, setUnassignedDelegates] = useState<DelegateDetail[]>([]);
    const [assigningExisting, setAssigningExisting] = useState(false);

    useEffect(() => {
        if (submittingDelegates && remainingCount > 0) {
            getUnassignedDelegatesForAdvisor().then((list) => {
                setUnassignedDelegates(list.map((d) => ({
                    email: d.email,
                    first_name: d.first_name,
                    last_name: d.last_name,
                })));
            });
        } else {
            setUnassignedDelegates([]);
        }
    }, [submittingDelegates, remainingCount]);

    const refresh = async () => {
        await new Promise((r) => setTimeout(r, 300));
        if (onDelegateCreated) await onDelegateCreated();
    };

    const handleRemove = async (delegateEmail: string) => {
        if (!confirm(`Remove ${delegateEmail} from this assignment? Their account will show no assignment.`)) return;
        setLoading(true);
        try {
            const result = await removeDelegateFromAssignment(assignmentId, delegateEmail);
            if (result.success) {
                await refresh();
                window.alert("Delegate removed from assignment.");
            } else {
                window.alert(`Failed to remove: ${result.error}`);
            }
        } catch (e: any) {
            window.alert(e?.message || "Failed to remove delegate.");
        }
        setLoading(false);
    };

    const startEdit = (d: DelegateDetail) => {
        setEditingEmail(d.email);
        setEditFirstName(d.first_name ?? "");
        setEditLastName(d.last_name ?? "");
        setEditEmail(d.email);
    };

    const handleEditSave = async () => {
        if (!editingEmail) return;
        const newEmail = editEmail.trim();
        const newFirst = editFirstName.trim();
        const newLast = editLastName.trim();
        if (!newFirst || !newLast) {
            window.alert("First and last name are required.");
            return;
        }
        const emailChanged = newEmail.toLowerCase() !== editingEmail.toLowerCase();
        if (!emailChanged && newEmail === editingEmail) {
            setEditLoading(true);
            try {
                const result = await updateDelegateName(editingEmail, newFirst, newLast);
                if (result.success) {
                    setEditingEmail(null);
                    await refresh();
                    window.alert("Delegate name updated.");
                } else {
                    window.alert(`Update failed: ${result.error}`);
                }
            } catch (e: any) {
                window.alert(e?.message || "Update failed.");
            }
            setEditLoading(false);
            return;
        }
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(newEmail)) {
            window.alert("Please enter a valid email address.");
            return;
        }
        setEditLoading(true);
        try {
            const removeResult = await removeDelegateFromAssignment(assignmentId, editingEmail);
            if (!removeResult.success) {
                window.alert(`Could not update: ${removeResult.error}`);
                setEditLoading(false);
                return;
            }
            const existing = await getDelegateByEmail(newEmail);
            if (existing) {
                const linkResult = await linkDelegateToAssignment(newEmail, assignmentId);
                if (!linkResult.success) {
                    window.alert(`Assignment updated but could not link new delegate: ${linkResult.error}`);
                    await refresh();
                    setEditLoading(false);
                    return;
                }
                await updateDelegateName(newEmail, newFirst, newLast);
                setEditingEmail(null);
                await refresh();
                window.alert("Assignment updated to the new delegate; name updated.");
            } else {
                const signUpResult = await signUpDelegate(newFirst, newLast, newEmail, assignmentId);
                if (signUpResult.success) {
                    setEditingEmail(null);
                    await refresh();
                    window.alert(`New delegate ${newFirst} ${newLast} has been created and assigned. A password reset email has been sent to ${newEmail}.`);
                } else {
                    window.alert(`Could not create new delegate: ${signUpResult.error}. The previous delegate was removed from this assignment.`);
                    await refresh();
                }
            }
        } catch (e: any) {
            window.alert(e?.message || "Update failed.");
            await refresh();
        }
        setEditLoading(false);
    };

    const handleSubmission = async () => {
        setLoading(true);
        const delegateFirstName = firstName;
        const delegateLastName = lastName;
        const delegateEmail = email;
        
        try {
            const result = await signUpDelegate(
                firstName,
                lastName,
                email,
                assignmentId
            );
            if (result.success) {
                setFirstName("");
                setLastName("");
                setEmail("");
                await refresh();
                window.alert(`Delegate ${delegateFirstName} ${delegateLastName} has been created successfully! A password reset email has been sent to ${delegateEmail}.`);
            } else {
                window.alert(`Failed to create delegate: ${result.error || 'Unknown error'}`);
            }
        } catch (e: any) {
            console.error(e);
            window.alert(`Failed to submit delegate: ${e?.message || 'Please try again later.'}`);
        }
        setLoading(false);
    }

    const handleAssignExisting = async (delegateEmail: string) => {
        setAssigningExisting(true);
        try {
            const result = await linkDelegateToAssignment(delegateEmail, assignmentId);
            if (result.success) {
                await refresh();
                window.alert("Delegate assigned to this slot.");
            } else {
                window.alert(`Failed to assign: ${result.error}`);
            }
        } catch (e: any) {
            window.alert(e?.message || "Failed to assign delegate.");
        }
        setAssigningExisting(false);
    };

    if (!submittingDelegates) {
        return (
            <div></div>
        )
    }

    const allSpotsFilled = currentCount >= maxDelegates;

    return (
        <div className="fixed z-50 inset-0 w-full h-full flex flex-row items-center justify-center">
            <div className="absolute z-10 w-full h-full bg-black opacity-50" onClick={() => setSubmittingDelegates(false)}></div>
            <fieldset className="fieldset z-20 bg-black border-2 border-primary w-[28rem] max-h-[90vh] overflow-y-auto rounded-box p-4 opacity-100">
                <div>
                    <h5 className="text-5xl mb-2">
                        <span className="text-primary">{committeeName}</span> <span className="text-nowrap">{countryName}</span>
                    </h5>
                    <h3 className="text-3xl">
                        {allSpotsFilled
                            ? "Manage delegates (edit, remove, or swap)"
                            : <>Delegate Info: <span className="text-primary">{remainingCount}</span> Remaining</>}
                    </h3>
                </div>

                {delegateDetails.length > 0 && (
                    <div className="mb-4">
                        <label className="label text-lg font-semibold">Assigned delegates (edit or remove)</label>
                        <ul className="space-y-2">
                            {delegateDetails.map((d) => (
                                <li key={d.email} className="flex flex-wrap items-center gap-2 rounded-lg bg-base-300 p-2">
                                    {editingEmail === d.email ? (
                                        <div className="w-full space-y-2">
                                            <input
                                                type="text"
                                                className="input input-sm w-full"
                                                placeholder="First name"
                                                value={editFirstName}
                                                onChange={(e) => setEditFirstName(e.target.value)}
                                                disabled={editLoading}
                                            />
                                            <input
                                                type="text"
                                                className="input input-sm w-full"
                                                placeholder="Last name"
                                                value={editLastName}
                                                onChange={(e) => setEditLastName(e.target.value)}
                                                disabled={editLoading}
                                            />
                                            <input
                                                type="text"
                                                className="input input-sm w-full"
                                                placeholder="Email"
                                                value={editEmail}
                                                onChange={(e) => setEditEmail(e.target.value)}
                                                disabled={editLoading}
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    disabled={editLoading || !editFirstName.trim() || !editLastName.trim() || !editEmailValid}
                                                    onClick={handleEditSave}
                                                >
                                                    {editLoading ? <span className="loading loading-spinner loading-sm" /> : "Save"}
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    disabled={editLoading}
                                                    onClick={() => setEditingEmail(null)}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-sm">
                                                {[d.first_name, d.last_name].filter(Boolean).join(" ") || d.email}
                                                <span className="text-base-content/70 ml-1">({d.email})</span>
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => startEdit(d)}
                                                disabled={loading}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-error btn-sm"
                                                onClick={() => handleRemove(d.email)}
                                                disabled={loading}
                                            >
                                                Remove
                                            </button>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {!allSpotsFilled && (
                    <>
                        {unassignedDelegates.length > 0 && (
                            <div className="mb-4">
                                <label className="label text-lg font-semibold">Or assign an existing delegate (no assignment)</label>
                                <ul className="space-y-1 max-h-32 overflow-y-auto rounded-lg bg-base-300 p-2">
                                    {unassignedDelegates.map((d) => (
                                        <li key={d.email} className="flex items-center justify-between gap-2 rounded p-1 hover:bg-base-200">
                                            <span className="text-sm truncate">
                                                {[d.first_name, d.last_name].filter(Boolean).join(" ") || d.email}
                                                <span className="text-base-content/70 ml-1">({d.email})</span>
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-sm flex-shrink-0"
                                                disabled={assigningExisting || loading}
                                                onClick={() => handleAssignExisting(d.email)}
                                            >
                                                {assigningExisting ? <span className="loading loading-spinner loading-sm" /> : "Assign here"}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div>
                            <label className="label text-xl">Add new delegate</label>
                            <label className="label text-base text-base-content/70">First Name</label>
                            <input 
                                type="text" 
                                className="input input-lg w-full"
                                value={firstName}
                                disabled={loading}
                                onChange={(event) => setFirstName(event.target.value)}/>
                            <label className="label text-base text-base-content/70">Last Name</label>
                            <input 
                                type="text" 
                                className="input input-lg w-full"
                                value={lastName}
                                disabled={loading}
                                onChange={(event) => setLastName(event.target.value)}/>
                            <label className="label text-base text-base-content/70">Email</label>
                            <input 
                                type="text" 
                                className="input input-lg w-full"
                                value={email}
                                disabled={loading}
                                onChange={(event) => setEmail(event.target.value)}/>
                            <button 
                                className="btn btn-primary btn-lg w-full mt-4"
                                disabled={loading ||
                                    firstName.length == 0 ||
                                    lastName.length == 0 ||
                                    !emailValid}
                                onClick={async () => await handleSubmission()}
                            >
                                {loading ? <span className="loading loading-spinner"></span> : <></>}
                                Submit new delegate
                            </button>
                        </div>
                    </>
                )}
            </fieldset>
        </div>
    )
}

export default DelegateSubmission;