'use client';

import { useState } from "react";
import { loginUser } from "../../utils/supabaseHelpers";
import { useRouter } from 'next/navigation';
import { autoRedirect } from "../../utils/generalHelper";
import Image from 'next/image';

interface LoginProps {
    setRegistering: Function,
}

function LoginForm({setRegistering}: LoginProps) {
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loginError, setLoginError] = useState(false);
    const [signMessage, _] = useState('Sign Up')
    const router = useRouter();

    async function handleLogin() {
        setLoading(true);
        setLoginError(false);
        setEmailError(email.length == 0);
        setPasswordError(password.length == 0);
        if (email.length == 0 || password.length == 0) {
            setLoading(false);
            return;
        }
        
        try {
            const user = await loginUser(email, password);
            if (user == null) {
                setLoading(false);
                setLoginError(true);
                setEmailError(true);
                setPasswordError(true);
                return;
            }
            await autoRedirect(router);
        } catch (error) {
            console.error(error);
            alert("Login failed, please try again in a few moments.");
        }
        setLoading(false);
    }

    return (
        <div>
            <fieldset className="fieldset bg-base-100 border-base-300 rounded-box w-xs border p-4">
                <div className="flex flex-row w-full items-center justify-center">
                    <Image
                    src={'/brazil_logo_white.png'}
                    width={250} 
                    height={35}
                    alt="Brazil logo"
                    />
                </div>
                <label className="label">Email</label>
                <input type="email" className={`input input-lg ${emailError ? 'input-error' : ''}`} placeholder="brazilinfo@bmun.org" value={email} onChange={(event) => setEmail(event.target.value)} />

                <label className="label">Password</label>
                <div>
                    <input type="password" className={`input input-lg ${passwordError ? 'input-error' : ''}`} placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
                    <p className="pt-1 text-primary w-fit">Forgot your password? Email tech@bmun.org</p>
                </div>

                {loginError ? <label className="label text-red-400">Username or password incorrect</label> : <></>}
                
                <button className="btn btn-lg btn-primary w-full mt-4" disabled={loading} onClick={async (_) => await handleLogin()}>
                    {loading ? <span className="loading loading-spinner"></span> : <></>}
                    Login
                </button>
                <div className="divider m-0">OR</div>
                <button className="btn btn-lg btn-secondary w-full" onClick={(_) => setRegistering(true)}>{signMessage}</button>
            </fieldset>
        </div>
    )
}

export default LoginForm;