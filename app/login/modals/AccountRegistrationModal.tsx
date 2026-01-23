'use client';

import { useState } from "react";
import AccountForm from "../forms/AccountForm";
import SchoolForm from "../forms/SchoolForm";
import { createSchool, linkSchool, SchoolProps, signUpAdvisor } from "@/app/utils/supabaseHelpers";
import { isValidAccountInfo, isValidSchoolInfo } from "@/app/utils/generalHelper";

interface AccountRegistrationProps {
    registering: boolean,
    setRegistering: Function
}

export interface AccountProps {
    email: string,
    firstName: string,
    lastName: string,
    password: string
}

function AccountRegistrationModal({registering, setRegistering}: AccountRegistrationProps) {
    // Account Info
    const [accountInfo, setAccountInfo] = useState<AccountProps>({
        email: "",
        firstName: "",
        lastName: "",
        password: ""
    });
    const [confPassword, setConfPassword] = useState("");
    const [accountError, setAccountError] = useState("");
    // School and Advisor Info
    const [school, setSchool] = useState<SchoolProps>({
        id: 0,
        name: "",
        address: "",
        city: "",
        state: "",
        zip_code: "",
        country: "Brasil",
        primary_name: "",
        primary_email: "",
        primary_phone: "",
        times_attended: 0,
        international: true,
        secondary_name: "",
        secondary_email: "",
        secondary_phone: "",
        primary_student: false,
        secondary_student: false,
        delegation_type: "Delegation Type"
    });
    const [schoolError, setSchoolError] = useState("");
    // Both
    const [submissionError, setSubmissionError] = useState(false);
    const [loading, setLoading] = useState(false);

    const signUpUser = async () => {
        const newAccountError = isValidAccountInfo(accountInfo, confPassword);
        const newSchoolError = isValidSchoolInfo(school);
        if (newAccountError.length > 0 || newSchoolError.length > 0) {
            setAccountError(newAccountError);
            setSchoolError(newSchoolError);
            setSubmissionError(true);
            return;
        } else {
            setAccountError("");
            setSchoolError("");
        }
        setLoading(true);
        try {
            // Create Account
            console.log("Creating Account");
            const accountResult = await signUpAdvisor(
                accountInfo.firstName,
                accountInfo.lastName,
                accountInfo.email,
                accountInfo.password
            );
            if (!accountResult || typeof(accountResult) != "string") {
                throw accountResult;
            }
            // Create School
            console.log("Creating School");
            const schoolResult = await createSchool(school);
            if (!schoolResult || typeof(schoolResult) != "number") {
                throw schoolResult;
            }
            // Link School
            console.log("Linking School");
            const linkResult = await linkSchool(accountResult, schoolResult);
            if (!linkResult) {
                throw linkResult;
            }
            // Reload Page
            window.location.reload();
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }

    if (!registering) {
        return <></>
    }

    return (
        <div className="w-screen h-screen flex flex-row items-center justify-center">
            <div className="w-screen h-screen bg-black opacity-50 z-20 absolute" onClick={() => setRegistering(false)}></div>
            <div className="rounded-md flex flex-col gap-4 z-30 bg-base-300 opacity-100 p-4 overflow-scroll max-h-11/12">
                {/* Account Set Up */}
                <div className="flex flex-row items-center justify-center">
                    <AccountForm 
                        accountInfo={accountInfo}
                        setAccountInfo={setAccountInfo}
                        confPassword={confPassword}
                        setConfPassword={setConfPassword}
                        submissionError={submissionError} />
                </div>
                <div className="divider" />
                {/* School Set Up */}
                <div className="flex flex-row items-center justify-center">
                    <SchoolForm
                        school={school}
                        setSchool={setSchool}
                        submissionError={submissionError} />
                </div>
                <div className="divider" />
                {/* The Buttons */}
                <div className="flex flex-col pb-4">
                    <button 
                        className="btn btn-lg btn-primary w-full" 
                        onClick={async () => await signUpUser()}
                        disabled={loading}>
                        {loading ? <span className="loading loading-spinner"></span> : <></>}
                        Sign Up
                    </button>
                    <div className="text-red-500">
                        {accountError.length > 0 && schoolError.length > 0 ?
                        `${accountError} & ${schoolError}` :
                        accountError || schoolError
                        } 
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AccountRegistrationModal;