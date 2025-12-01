'use client';

import { useEffect, useState } from "react";
import AssignmentView from "./views/AssignmentView";
import { autoRedirect } from "../utils/generalHelper";
import { useRouter } from 'next/navigation';
import RegistrationView from "./views/RegistrationView";
import GuideView from "./views/GuideView";
import NavBar from "./panels/NavBar";

function AdvisorView() {
    const [pageNum, setPageNum] = useState(0);
    const router = useRouter();

    // TODO: Clean this up too slow rn
    useEffect(() => {(async () => {
        await autoRedirect(router);
    })()}, [router])

    return (
        <div className="flex flex-col gap-5 min-h-screen bg-linear-65 from-black to-[#165a7b] bg-no-repeat bg-cover">
            <div className="h-18 w-full" /> {/* Hardcoded placeholder. TODO: Make it dynamic */}
            <NavBar setPageNum={setPageNum}/>
            <div className="w-full h-full flex flex-row justify-center items-center mb-2">
                <div className="max-w-12/12 sm:max-w-[1400px] lg:w-10/12 lg:h-10/12 rounded-md sm:p-4 lg:overflow-scroll">
                    <div className={pageNum != 0 ? 'hidden' : ''}>
                        <RegistrationView setPageNum={setPageNum} />
                    </div>
                    <div className={`h-full ${pageNum != 2 ? 'hidden' : ''}`}>
                        <AssignmentView />
                    </div>
                    <div className={pageNum != 3 ? 'hidden' : ''}>
                        <GuideView />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AdvisorView;