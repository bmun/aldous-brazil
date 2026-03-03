'use client'

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { resetPassword, sendPasswordResetEmail, getUser } from "../utils/supabaseHelpers";
import { autoRedirect } from "../utils/generalHelper";
import { isValidEmail } from "../utils/generalHelper";

function ResetPassword() {
    const [loading, setLoading] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [checkPassword, setCheckPassword] = useState("");
    const [newError, setNewError] = useState(false);
    const [checkError, setCheckError] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const router = useRouter();
   
    useEffect(() => {
        (async () => {
            const user = await getUser();
            setIsLoggedIn(user !== null);
        })();
    }, []);

    useEffect(() => {
        setNewError(newPassword.length > 0 && newPassword.length < 8);
        setCheckError(newPassword != checkPassword && checkPassword.length != 0);
    }, [newPassword, checkPassword]);

    useEffect(() => {
        setEmailError(email.length > 0 && !isValidEmail(email));
    }, [email]);
    
    const handleEmailSubmission = async () => {
        if (!isValidEmail(email)) {
            setEmailError(true);
            return;
        }

        setLoading(true);
        try {
            const result = await sendPasswordResetEmail(email);
            if (!result.success) {
                window.alert(result.error || "Something went wrong, try again later");
            } else {
                setEmailSent(true);
            }
        } catch (e) {
            console.error(e);
            window.alert("Something went wrong, try again later");
        }
        setLoading(false);
    }

    const handlePasswordSubmission = async () => {
        setLoading(true);
        try {
            const result = await resetPassword(newPassword);
            if (!result) {
                window.alert("Something went wrong, try again later");
            } else {
                autoRedirect(router);
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }

    // Show loading state while checking auth
    if (isLoggedIn === null) {
        return (
            <div className="w-screen h-screen flex flex-row justify-center items-center">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    // Show email form if not logged in
    if (!isLoggedIn) {
        return (
            <div className="w-screen h-screen flex flex-row justify-center items-center">
                <div>
                    <fieldset className="fieldset bg-base-100 border-base-300 rounded-box w-xs border p-4">
                        <h1 className="text-5xl">Reset Password</h1>
                        {emailSent ? (
                            <>
                                <p className="mt-4 text-center text-lg">
                                    Password reset link has been sent to <strong>{email}</strong>.
                                    Please check your email and click the link to reset your password.
                                </p>
                            </>
                        ) : (
                            <>
                                <label className="label">Email Address</label>
                                <div>
                                    <input 
                                        type="email" 
                                        className={`input input-lg ${emailError ? 'input-error' : ''}`} 
                                        placeholder="Email" 
                                        value={email} 
                                        onChange={(event) => setEmail(event.target.value)} />
                                </div>
                                {emailError && (
                                    <p className="text-error text-sm mt-1">Please enter a valid email address</p>
                                )}
                                <button 
                                    className="btn btn-lg mt-2 btn-secondary w-full"
                                    disabled={!isValidEmail(email) || email.length == 0 || loading}
                                    onClick={handleEmailSubmission}>
                                        {loading ? <span className="loading loading-spinner"></span> : <></>}
                                        Send Reset Link
                                </button>
                            </>
                        )}
                    </fieldset>
                </div>
            </div>
        );
    }

    // Show password reset form if logged in
    return (
        <div className="w-screen h-screen flex flex-row justify-center items-center">
            <div>
                <fieldset className="fieldset bg-base-100 border-base-300 rounded-box w-xs border p-4">
                    <h1 className="text-5xl">Reset Password</h1>
                    <label className="label">Password (Must be 8+ Characters)</label>
                    <div>
                        <input 
                            type="password" 
                            className={`input input-lg ${newError ? 'input-error' : ''}`} 
                            placeholder="Password" 
                            value={newPassword} 
                            onChange={(event) => setNewPassword(event.target.value)} />
                    </div>
                    <label className="label">Password (Confirm)</label>
                    <div>
                        <input 
                            type="password" 
                            className={`input input-lg ${checkError ? 'input-error' : ''}`} 
                            placeholder="Password" 
                            value={checkPassword} 
                            onChange={(event) => setCheckPassword(event.target.value)} />
                    </div>
                    <button 
                        className="btn btn-lg mt-2 btn-secondary w-full"
                        disabled={newPassword != checkPassword || newPassword.length == 0 || loading}
                        onClick={handlePasswordSubmission}>
                            {loading ? <span className="loading loading-spinner"></span> : <></>}
                            Reset Password
                    </button>
                </fieldset>
            </div>
        </div>
    )
}

export default ResetPassword;