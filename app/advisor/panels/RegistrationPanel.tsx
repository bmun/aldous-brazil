'use client';

import { getRegistration, isRegOpen, RegistrationProps } from "@/app/utils/supabaseHelpers";
import { useEffect, useState } from "react";

interface RegistrationPanelProps {
    setCreatingRegistration: Function,
    setRegLoading: Function,
    setPageNum: Function,
    waitlistOpen: boolean
}

function RegistrationPanel({setCreatingRegistration, setRegLoading, setPageNum, waitlistOpen}: RegistrationPanelProps) {
    const [regOpen, setRegOpen] = useState(false);
    const [registered, setRegistered] = useState(false);
    const [registration, setRegistration] = useState<RegistrationProps>();

    useEffect(() => {(async () => {
        const newReg = await getRegistration();
        const reg = newReg !== null;
        setRegistered(reg);
        if (reg) {
            setRegistration(newReg);
        }
        setRegLoading(false);
    })()}, [setRegLoading]);

    useEffect(() => {(async () => {
        try {
            const newRegOpen = await isRegOpen();
            if (newRegOpen == null){
                throw new Error("Failed to check if registration is open.");
            }
            setRegOpen(newRegOpen);
        } catch (e) {
            console.error(e);
        }
    })()}, []);

    return (
        <div className="bg-black flex flex-col w-full p-4 border-2 border-primary rounded-2xl">
            <div className="flex flex-row justify-start">
                <h2 className="text-7xl">Welcome to <span className="text-primary text-nowrap">ALDOUS</span>!</h2>
            </div>
            {registered && registration !== undefined ?
                <div className="flex flex-col w-full justify-start text-xl">
                    {registration.is_waitlisted ? 
                    <p>
                        You have joined the <span className="text-primary font-bold">waitlist</span> for <span className="text-primary font-bold">BMUN Brazil</span>!
                        Please view the listed information to see your requested registration numbers. Please direct 
                        any questions to <span className="text-primary font-bold">info@bmun.org</span> and <span className="text-primary font-bold">tech@bmun.org</span>. 
                        You will be notified via email if your delegation is taken off the waitlist.
                    </p> :
                    <p>
                        Congratulations! You have successfully registered for <span className="text-primary font-bold">BMUN Brazil</span>!
                        Please view the listed information to see your confirmed registration numbers and payment status. Please direct 
                        any questions to <span className="text-primary font-bold">info@bmun.org</span> and <span className="text-primary font-bold">tech@bmun.org</span>.
                    </p>
                    }
                    <div className="stats py-2">
                        <div className="stat">
                            <div className="stat-title text-base">
                                {
                                    registration.is_waitlisted ?
                                    "Total Requested" :
                                    "Total Registered"
                                }
                            </div>
                            <div className="stat-value text-info">{registration.num_beginner_delegates + registration.num_intermediate_delegates + registration.num_advanced_delegates}</div>
                        </div>
                        <div className="stat">
                            <div className="stat-title text-base">Beginner</div>
                            <div className="stat-value text-primary">{registration.num_beginner_delegates}</div>
                        </div>
                        <div className="stat">
                            <div className="stat-title text-base">Intermediate</div>
                            <div className="stat-value text-primary">{registration.num_intermediate_delegates}</div>
                        </div>
                        <div className="stat">
                            <div className="stat-title text-base">Advanced</div>
                            <div className="stat-value text-primary">{registration.num_advanced_delegates}</div>
                        </div>
                    </div>
                    <p>
                        Please take the time to review the <span className="text-primary hover:cursor-pointer"><b onClick={() => setPageNum(3)}>Website Guide</b></span> to familiarize yourself
                        with the features of <span className="text-primary font-bold">Aldous</span>. We have provided tutorials on the key functionalities that you and your 
                        delegates need to understand for the upcoming conference! See you in the Spring.
                    </p>
                    <div className="flex flex-row flex-wrap gap-4 mt-8 w-full justify-between">
                        <div className="flex flex-row gap-2 items-center">
                            <input readOnly type="checkbox" checked={registration.delegate_fees_paid != 0} className="checkbox checkbox-primary" />
                            <label className="label text-lg">Delegate Fees Paid</label>
                        </div>
                        <div className="flex flex-row gap-2 items-center">
                            <input readOnly type="checkbox" checked={registration.registration_fee_paid} className="checkbox checkbox-primary" />
                            <label className="label text-lg">School Fee Paid</label>
                        </div>
                        <div className="flex flex-row gap-2 items-center">
                            <input readOnly type="checkbox" checked={registration.is_waitlisted} className="checkbox checkbox-primary" />
                            <label className="label text-lg">Waitlisted</label>
                        </div>
                    </div>
                </div>
                :
                <div className="flex flex-col w-full h-full justify-start">
                    <p className="text-xl">
                        It looks like you have <b>not yet registered for BMUN Brazil. </b>
                        In order to do so, please click on the button below to fill out our registration form.
                        If you need some guidance on the process please navigate to our <span className="text-primary hover:cursor-pointer"><b onClick={() => setPageNum(3)}>Website Guide</b></span>.
                        We have provided tutorials for the website&apos;s features and we will continue to update it as conference approaches.
                        <br/> <br/>
                        When registering, ensure that your delegation numbers are accurate. 
                        In order to change any information after submitting the form, an advisor will have to email <span className="font-bold text-primary">info@bmun.org</span> and <span className="font-bold text-primary">tech@bmun.org</span>.
                        Please familiarize yourself with our delegate fees and refund deadlines prior to registering.
                    </p>
                    <button className="btn btn-xl text-xl btn-primary mt-4"
                        disabled={!regOpen && !waitlistOpen}
                        onClick={() => setCreatingRegistration(true)}>
                            {waitlistOpen ? "Join Waitlist" : "Register Now"}
                    </button>
                    <div className="flex flex-row justify-between p-4">
                        <div className="flex flex-row">
                            <p className="text-2xl text-center">Registration is&nbsp;</p>
                            {
                                regOpen ?
                                <div className="badge badge-primary badge-xl">Open</div> :
                                <div className="badge badge-error badge-xl">Closed</div>
                            }
                        </div>
                        <div className="flex flex-row">
                            <p className="text-2xl text-center">Waitlist is&nbsp;</p>
                            {
                                waitlistOpen ?
                                <div className="badge badge-primary badge-xl">Open</div> :
                                <div className="badge badge-error badge-xl">Closed</div>
                            }
                        </div>
                    </div>
                </div>
            }
        </div>
    )
}

export default RegistrationPanel;