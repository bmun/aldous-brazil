'use client'
import { useEffect, useState } from "react";
import RegistrationModal from "../modals/RegistrationModal";
import SchoolForm from "../forms/SchoolForm";
import RegistrationPanel from "../panels/RegistrationPanel";
import TimelinePanel from "../panels/TimelinePanel";
import FAQPanel from "../panels/FAQPanel";
import OpeningSkeleton from "../skeletons/OpeningSkeleton";
import { isWaitlistOpen } from "@/app/utils/supabaseHelpers";
import ProfileTab from "../../delegate/tabs/ProfileTab";
import type { DelegateUser } from "../../delegate/page";
import type { DelegateAssignmentInfo } from "@/app/utils/supabaseHelpers";

interface RegistrationViewProps {
    setPageNum: Function;
    isIndividual?: boolean;
    individualDelegate?: DelegateUser | null;
    individualAssignment?: DelegateAssignmentInfo | null;
}

function RegistrationView({ setPageNum, isIndividual = false, individualDelegate, individualAssignment }: RegistrationViewProps) {
    const [regLoading, setRegLoading] = useState(true);
    const [waitlistOpen, setWaitlistOpen] = useState(false);
    const [creatingRegistration, setCreatingRegistration] = useState(false);
    const [_, setSchoolLoading] = useState(false);

    useEffect(() => {(async () => {
        try {
            const newWaitlistOpen = await isWaitlistOpen();
            if (newWaitlistOpen == null){
                throw new Error("Failed to check if waitlist is open.");
            }
            setWaitlistOpen(newWaitlistOpen);
        } catch (e) {
            console.error(e);
        }
    })()}, []);

    return (
        <div>
            <OpeningSkeleton regLoading={regLoading} />
            <div className={`${regLoading ? 'hidden' : ''} flex flex-col gap-10 p-4 lg:gap-8 lg:p-0 lg:grid lg:order-last lg:grid-cols-2 h-full`}>
                <RegistrationModal
                    creatingRegistration={creatingRegistration}
                    setCreatingRegistration={setCreatingRegistration}
                    waitlistOpen={waitlistOpen}
                    isIndividual={isIndividual}
                />
                <div className={`${regLoading ? 'hidden' : ''} flex flex-col gap-10 justify-start items-start h-full w-full`}>
                    <RegistrationPanel
                        setCreatingRegistration={setCreatingRegistration} 
                        setRegLoading={setRegLoading}
                        setPageNum={setPageNum}
                        waitlistOpen={waitlistOpen} />
                    <SchoolForm setSchoolLoading={setSchoolLoading} />
                    <FAQPanel />
                </div>
                <div className={`${regLoading ? 'hidden' : ''} flex flex-col gap-10 justify-start items-start h-full w-full pb-24`}>
                    {isIndividual ? (
                        <>
                            {individualAssignment && individualDelegate ? (
                                <ProfileTab assignment={individualAssignment} delegate={individualDelegate} />
                            ) : (
                                <div className="card bg-base-100 shadow-xl border-2 border-primary w-full">
                                    <div className="card-body text-base-content text-2xl text-center flex flex-col items-center gap-4">
                                        <img
                                            src="/BMUN Circle Logo Blue.png"
                                            alt="BMUN Logo"
                                            width={160}
                                            height={160}
                                        />
                                        <span>Your assignment is not yet posted.</span>
                                    </div>
                                </div>
                            )}
                            <TimelinePanel />
                        </>
                    ) : (
                        <TimelinePanel />
                    )}
                </div>
            </div>
        </div>
    )
}

export default RegistrationView;