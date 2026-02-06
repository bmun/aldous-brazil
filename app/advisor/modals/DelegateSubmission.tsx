'use client';

import { signUpDelegate } from "@/app/utils/supabaseHelpers";
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
    
    // DEBUG: Log delegate IDs to track updates
    /*
    useEffect(() => {
        console.log(`Modal - delegateIds updated:`, {
            assignmentId,
            committeeName,
            delegateCount: currentCount,
            remainingCount: remainingCount,
            maxDelegates: maxDelegates,
            delegateIds: delegateIds
        });
    }, [delegateIds, assignmentId, committeeName, currentCount, remainingCount, maxDelegates]);
    */
   
    // Form fields for the next delegate to create
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [emailValid, setEmailValid] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (email.length > 0) {
            setEmailValid(emailRegex.test(email));
        } else {
            setEmailValid(false);
        }
    }, [email]);

    // Reset form when modal opens or assignment changes
    useEffect(() => {
        if (submittingDelegates) {
            setFirstName("");
            setLastName("");
            setEmail("");
        }
    }, [assignmentId, submittingDelegates]);

    // Auto-close modal if max delegates reached
    useEffect(() => {
        if (currentCount >= maxDelegates && submittingDelegates) {
            setSubmittingDelegates(false);
        }
    }, [currentCount, maxDelegates, submittingDelegates, setSubmittingDelegates]);

    const handleSubmission = async () => {
        setLoading(true);
        // Store values before clearing for success message
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
                // Clear form for next delegate
                setFirstName("");
                setLastName("");
                setEmail("");
                
                // Small delay to ensure database update is committed
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Refresh assignments (which will update delegate_ids and fetch delegates)
                if (onDelegateCreated) {
                    await onDelegateCreated();
                }
                
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

    if (!submittingDelegates || currentCount >= maxDelegates) {
        return (
            <div></div>
        )
    }

    return (
        <div className="fixed z-50 inset-0 w-full h-full flex flex-row items-center justify-center">
            <div className="absolute z-10 w-full h-full bg-black opacity-50" onClick={() => setSubmittingDelegates(false)}></div>
            <fieldset className="fieldset z-20 bg-black border-2 border-primary w-96 max-h-8/12 overflow-scroll rounded-box p-4 opacity-100">
                <div>
                    <h5 className="text-5xl mb-2">
                        <span className="text-primary">{committeeName}</span> <span className="text-nowrap">{countryName}</span>
                    </h5>
                    <h3 className="text-3xl">
                        Delegate Info: <span className="text-primary">{remainingCount}</span> Remaining
                    </h3>
                </div>
                
                {/* Form to create next delegate */}
                <div>
                    <label className="label text-xl">First Name</label>
                    <input 
                        type="text" 
                        className="input input-lg w-full"
                        value={firstName}
                        disabled={loading}
                        onChange={(event) => setFirstName(event.target.value)}/>
                    <label className="label text-xl">Last Name</label>
                    <input 
                        type="text" 
                        className="input input-lg w-full"
                        value={lastName}
                        disabled={loading}
                        onChange={(event) => setLastName(event.target.value)}/>
                    <label className="label text-xl">Email</label>
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
                        Submit Delegate
                    </button>
                </div>
            </fieldset>
        </div>
    )
}

export default DelegateSubmission;