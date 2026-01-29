'use client';

import { isValidEmail } from "@/app/utils/generalHelper";
import { AccountProps } from "../modals/AccountRegistrationModal";

interface AccountFormProps {
    accountInfo: AccountProps,
    setAccountInfo: Function,
    confPassword: string,
    setConfPassword: Function,
    submissionError: boolean
}

function AccountForm({accountInfo, setAccountInfo, confPassword, setConfPassword, submissionError}: AccountFormProps) {
    return (
        <fieldset className="w-full flex flex-col gap-4">
            <h5 className="text-5xl">
                Account Information *
            </h5>
            <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col">
                    <label className="label text-lg">
                        First Name
                    </label>
                    <input 
                        type="text" 
                        className={`input input-lg w-full ${submissionError && accountInfo.firstName.length == 0 ? "input-error" : ""}`}
                        placeholder="Oski"
                        value={accountInfo.firstName}
                        onChange={(e) => setAccountInfo(
                            {...accountInfo, firstName:e.target.value}
                        )} />
                </div>
                <div className="flex flex-col">
                    <label className="label text-lg">
                        Last Name
                    </label>
                    <input
                        type="text"
                        className={`input input-lg w-full ${submissionError && accountInfo.lastName.length == 0 ? "input-error" : ""}`}
                        placeholder="Bear"
                        value={accountInfo.lastName}
                        onChange={(e) => setAccountInfo(
                            {...accountInfo, lastName:e.target.value}
                        )} />
                </div>
                <div className="flex flex-col">
                    <label className="label text-lg">
                        Email
                    </label>
                    <input
                        type="email"
                        className={`input input-lg w-full ${(submissionError && accountInfo.email.length == 0 || (!isValidEmail(accountInfo.email) && accountInfo.email.length > 0)) ? "input-error" : ""}`}
                        placeholder="oski@bmun.org"
                        value={accountInfo.email}
                        onChange={(e) => setAccountInfo(
                            {...accountInfo, email:e.target.value}
                        )} />
                </div>
            </div>
            <div className="flex flex-col">
                <label className="label text-lg">
                    Password [Must be 8+ Characters]
                </label>
                <input
                    type="password"
                    className={`input input-lg w-full ${(submissionError && accountInfo.password.length == 0) || (accountInfo.password.length > 0 && accountInfo.password.length < 8) ? "input-error" : ""}`}
                    placeholder="GobEars123"
                    value={accountInfo.password}
                    onChange={(e) => setAccountInfo(
                        {...accountInfo, password:e.target.value}
                    )} />
            </div>
            <div className="flex flex-col">
                <label className="label text-lg">
                    Confirm Password
                </label>
                <input
                    type="password"
                    className={`input input-lg w-full ${(submissionError && confPassword.length == 0) || (confPassword != accountInfo.password) ? "input-error" : ""}`}
                    placeholder="GobEars123"
                    value={confPassword}
                    onChange={(e) => setConfPassword(e.target.value)} />
            </div>
        </fieldset>
    )
}

export default AccountForm;