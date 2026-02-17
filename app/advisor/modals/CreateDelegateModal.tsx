'use client';

import { createDelegateAccount, MAX_DELEGATES_PER_SCHOOL } from "@/app/utils/supabaseHelpers";
import { useEffect, useState } from "react";

interface CreateDelegateModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    currentCount: number;
    onCreated?: () => void;
}

export default function CreateDelegateModal({
    isOpen,
    setIsOpen,
    currentCount,
    onCreated,
}: CreateDelegateModalProps) {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [emailValid, setEmailValid] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        setEmailValid(re.test(email));
    }, [email]);

    useEffect(() => {
        if (isOpen) {
            setFirstName("");
            setLastName("");
            setEmail("");
        }
    }, [isOpen]);

    const atLimit = currentCount >= MAX_DELEGATES_PER_SCHOOL;

    const handleSubmit = async () => {
        if (atLimit) return;
        const first = firstName.trim();
        const last = lastName.trim();
        const em = email.trim();
        if (!first || !last || !emailValid) return;
        setLoading(true);
        try {
            const result = await createDelegateAccount(first, last, em);
            if (result.success) {
                if (onCreated) await onCreated();
                setIsOpen(false);
                window.alert(
                    result.error
                        ? `Delegate created. ${result.error}`
                        : "Delegate account created. A password reset email has been sent."
                );
            } else {
                window.alert(`Failed: ${result.error}`);
            }
        } catch (e: any) {
            window.alert(e?.message || "Failed to create delegate.");
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed z-50 inset-0 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/50"
                onClick={() => !loading && setIsOpen(false)}
            />
            <div className="relative z-10 bg-base-100 border-2 border-primary rounded-box p-6 w-full max-w-md shadow-xl">
                <h3 className="text-2xl font-bold text-primary mb-2">Create delegate account</h3>
                <p className="text-sm text-base-content/70 mb-4">
                    {currentCount} / {MAX_DELEGATES_PER_SCHOOL} delegates
                </p>
                <div className="space-y-3">
                    <div>
                        <label className="label">First name</label>
                        <input
                            type="text"
                            className="input input-bordered w-full"
                            value={firstName}
                            disabled={loading || atLimit}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label">Last name</label>
                        <input
                            type="text"
                            className="input input-bordered w-full"
                            value={lastName}
                            disabled={loading || atLimit}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label">Email</label>
                        <input
                            type="email"
                            className="input input-bordered w-full"
                            value={email}
                            disabled={loading || atLimit}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex gap-2 mt-6">
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={loading || atLimit || !firstName.trim() || !lastName.trim() || !emailValid}
                        onClick={handleSubmit}
                    >
                        {loading ? <span className="loading loading-spinner loading-sm" /> : "Create"}
                    </button>
                    <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={loading}
                        onClick={() => setIsOpen(false)}
                    >
                        Cancel
                    </button>
                </div>
                {atLimit && (
                    <p className="text-sm text-warning mt-2">Maximum delegates per school reached.</p>
                )}
            </div>
        </div>
    );
}
