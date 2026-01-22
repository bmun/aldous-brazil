'use client';

import { createRegistration } from "@/app/utils/supabaseHelpers";
import React, { useEffect, useState } from "react";

interface RegistrationModalProps {
    creatingRegistration: boolean,
    setCreatingRegistration: Function,
    waitlistOpen: boolean
}

type Delegate = {
  fullName: string;
  email: string;
};

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function RegistrationForm ({creatingRegistration, setCreatingRegistration, waitlistOpen} : RegistrationModalProps) {
    const [loading, setLoading] = useState(false)

    const [numBeginner, setNumBeginner] = useState(0);
    const [numIntermediate, setNumIntermediate] = useState(0);
    const [numAdvanced, setNumAdvanced] = useState(0);

    const [totalRegistered, setTotalRegistered] = useState(0);
    const [delegates, setDelegates] = useState<Delegate[]>([]);

    const updateDelegate = (
        index: number,
        field: keyof Delegate,
        value: string
        ) => {
        setDelegates(prev =>
            prev.map((d, i) =>
            i === index ? { ...d, [field]: value } : d
            )
        );
    };

    const allDelegatesValid =
        delegates.length === totalRegistered &&
        delegates.every(d =>
            d.fullName.trim().length > 0 &&
            isValidEmail(d.email)
        );

    useEffect(() => {
        if (numBeginner + numIntermediate + numAdvanced > 50) {
            setTotalRegistered(50)
        } else {
            setTotalRegistered(numBeginner + numIntermediate + numAdvanced)
        }
    }, [numBeginner, numIntermediate, numAdvanced])

    useEffect(() => {
        setDelegates(prev =>
            Array.from({ length: totalRegistered }, (_, i) =>
                prev[i] ?? { fullName: "", email: "" }
            )
        );
    }, [totalRegistered]);

    // Currently we have no foreign language committees. Update this as needed.
    // const [numSpanish, setNumSpanish] = useState(0);
    // const [numChinese, setNumChinese] = useState(0);
    const [onlinePayment, setOnlinePayment] = useState(false);

    async function handleSubmission () {
        setLoading(true);
        try {
            const success = await createRegistration({
                num_beginner_delegates: numBeginner,
                num_intermediate_delegates: numIntermediate,
                num_advanced_delegates: numAdvanced,
                num_spanish_speaking_delegates: 0,
                num_chinese_speaking_delegates: 0,
                delegate_fees_paid: 0,
                registration_fee_paid: false,
                is_waitlisted: waitlistOpen,
                delegate_info: delegates
            });
            if (success) {
                window.location.reload();
            }
        } catch (error) {
            console.log(error);
        }
        setLoading(false);
    };

    if (creatingRegistration) {
        return (
            <div className="fixed z-50 inset-0 w-full h-full flex flex-row items-center justify-center">
                <div className="absolute z-10 w-full h-full bg-black opacity-60" onClick={() => setCreatingRegistration(false)}></div>
                <fieldset className="flex flex-row gap-6 fieldset z-20 bg-black border-primary rounded-box border-2 p-4 opacity-100">
                    <div className="flex flex-col gap-2 w-md">
                        <h3 className="text-5xl">
                            {waitlistOpen ? `Join the BMUN Brazil waitlist`: `Register for BMUN Brazil`} 
                        </h3>
                        <label className="label text-xl">Number of Beginner Delegates</label>
                        <input
                        type="text"
                        className="input input-lg w-full"
                        value={numBeginner.toString()}
                        onChange={(e) => {
                            // Remove all non-digit characters
                            const cleaned = e.target.value.replace(/\D/g, "");
                            // Parse to number or fallback 0
                            const num = cleaned === "" ? 0 : Number(cleaned);
                            setNumBeginner(num);
                        }}
                        />

                        <label className="label text-xl">Number of Intermediate Delegates</label>
                        <input
                        type="text"
                        className="input input-lg w-full"
                        value={numIntermediate.toString()}
                        onChange={(e) => {
                            const cleaned = e.target.value.replace(/\D/g, "");
                            const num = cleaned === "" ? 0 : Number(cleaned);
                            setNumIntermediate(num);
                        }}
                        />

                        <label className="label text-xl">Number of Advanced Delegates</label>
                        <input
                        type="text"
                        className="input input-lg w-full"
                        value={numAdvanced.toString()}
                        onChange={(e) => {
                            const cleaned = e.target.value.replace(/\D/g, "");
                            const num = cleaned === "" ? 0 : Number(cleaned);
                            setNumAdvanced(num);
                        }}
                        />

                        <label className="label text-xl mt-2">
                            <input type="checkbox" checked={onlinePayment} className="toggle toggle-primary" onChange={(_) => setOnlinePayment(!onlinePayment)} />
                            Pay Online
                        </label>
                        <button 
                            className="btn btn-primary mt-4 text-xl" 
                            onClick={async () => await handleSubmission()}
                            disabled={numBeginner == 0 && numIntermediate == 0 && numAdvanced == 0
                                || numBeginner + numIntermediate + numAdvanced > 50 
                                || !allDelegatesValid
                            }
                        >
                            {loading ? <span className="loading loading-spinner"></span> : <></>}
                            {waitlistOpen ? 'Join Waitlist': 'Register for BMUN'}
                        </button>
                        {numBeginner + numIntermediate + numAdvanced > 50 ? 
                            <div className="text-md text-red-500">Each school is limited to 50 delegates</div>
                            : <></>
                        }
                    </div>
                    <div className="flex flex-col gap-2 w-lg overflow-scroll max-h-[432px]">
                        <h3 className="text-5xl">
                            Delegate Information
                        </h3>
                        {
                            totalRegistered == 0 ?
                            <div className="w-full h-full text-xl">
                                No delegates requested...
                            </div> : <></>
                        }
                        {delegates.map((delegate, index) => {
                            const nameError = delegate.fullName.trim() === "";
                            const emailError =
                                delegate.email.trim() === "" ||
                                !isValidEmail(delegate.email);

                            return (
                                <div key={index} className="flex flex-col gap-2 p-3">
                                <h4 className="text-xl">Delegate {index + 1}</h4>

                                <input
                                    type="text"
                                    className={`input input-md w-full ${
                                    nameError ? "input-error" : ""
                                    }`}
                                    placeholder="Full Name"
                                    value={delegate.fullName}
                                    onChange={(e) =>
                                    updateDelegate(index, "fullName", e.target.value)
                                    }
                                />

                                <input
                                    type="email"
                                    className={`input input-md w-full ${
                                    emailError ? "input-error" : ""
                                    }`}
                                    placeholder="Email Address"
                                    value={delegate.email}
                                    onChange={(e) =>
                                    updateDelegate(index, "email", e.target.value)
                                    }
                                />
                                </div>
                            );
                        })}
                    </div>
                </fieldset>
            </div>
        );
    }
};

export default RegistrationForm;
