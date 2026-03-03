'use client';

import { useEffect, useState } from "react";
import AssignmentView from "./views/AssignmentView";
import { autoRedirect } from "../utils/generalHelper";
import { useRouter } from "next/navigation";
import RegistrationView from "./views/RegistrationView";
import GuideView from "./views/GuideView";
import NavBar from "./panels/NavBar";
import PositionPaperTab from "../delegate/tabs/PositionPaperTab";
import { getAssignmentForCurrentDelegate, getSchool, getSupabaseUser, DelegateAssignmentInfo, SchoolProps } from "../utils/supabaseHelpers";
import type { DelegateUser } from "../delegate/page";

function AdvisorView() {
    const [pageNum, setPageNum] = useState(0);
    const router = useRouter();
    const [isIndividual, setIsIndividual] = useState(false);
    const [individualDelegate, setIndividualDelegate] = useState<DelegateUser | null>(null);
    const [individualAssignment, setIndividualAssignment] = useState<DelegateAssignmentInfo | null>(null);
    const [navLoading, setNavLoading] = useState(true);

    // TODO: Clean this up too slow rn
    useEffect(() => {
        (async () => {
            await autoRedirect(router);
        })();
    }, [router]);

    // Detect individual delegation advisors and load delegate-style data
    useEffect(() => {
        (async () => {
            try {
                const school = (await getSchool()) as SchoolProps | undefined;
                if (school && typeof school.delegation_type === "string") {
                    const isInd = school.delegation_type.toLowerCase() === "individual";
                    setIsIndividual(isInd);

                    if (isInd) {
                        const user = await getSupabaseUser();
                        if (user) {
                            setIndividualDelegate({
                                first_name: user.first_name,
                                last_name: user.last_name,
                                waiver_submitted: user.waiver_submitted ?? false,
                            });
                        }
                        const assignmentInfo = await getAssignmentForCurrentDelegate();
                        if (assignmentInfo) {
                            setIndividualAssignment(assignmentInfo);
                        } else {
                            setIndividualAssignment(null);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to load individual advisor context", e);
            } finally {
                setNavLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        const gradient = 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 25%, #3c5a7f 50%, #2d4a6f 75%, #1e3a5f 100%)';
        const originalBodyBackground = document.body.style.background;
        const originalBodyAttachment = document.body.style.backgroundAttachment;
        const originalHtmlBackground = document.documentElement.style.background;
        const originalHtmlAttachment = document.documentElement.style.backgroundAttachment;
        const originalHtmlClass = document.documentElement.className;

        document.documentElement.style.background = gradient;
        document.documentElement.style.backgroundAttachment = 'fixed';
        document.body.style.background = gradient;
        document.body.style.backgroundAttachment = 'fixed';
            document.documentElement.classList.remove("bg-base-200");

        return () => {
            document.body.style.background = originalBodyBackground;
            document.body.style.backgroundAttachment = originalBodyAttachment;
            document.documentElement.style.background = originalHtmlBackground;
            document.documentElement.style.backgroundAttachment = originalHtmlAttachment;
            if (originalHtmlClass.includes("bg-base-200")) {
                document.documentElement.classList.add("bg-base-200");
            }
        };
    }, []);

    return (
        <div
            className="flex flex-col gap-5 min-h-screen text-base-content"
            style={{
                background: "linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 25%, #3c5a7f 50%, #2d4a6f 75%, #1e3a5f 100%)",
                backgroundAttachment: "fixed",
            }}
        >
            {navLoading ? (
                <div className="fixed z-20 w-full bg-base-100 border-b border-base-300 shadow-md">
                    <div className="navbar max-w-12/12 sm:max-w-[1400px] lg:w-10/12 mx-auto px-2">
                        <div className="navbar-start">
                            <div className="skeleton h-10 w-36 bg-base-300" />
                        </div>
                        <div className="navbar-center">
                            <div className="tabs tabs-boxed bg-base-200 px-2 py-1 flex gap-2">
                                <div className="skeleton h-8 w-20 bg-base-300" />
                                <div className="skeleton h-8 w-24 bg-base-300" />
                                <div className="skeleton h-8 w-28 bg-base-300 hidden sm:block" />
                            </div>
                        </div>
                        <div className="navbar-end">
                            <div className="skeleton h-8 w-16 bg-base-300" />
                        </div>
                    </div>
                </div>
            ) : (
                <NavBar pageNum={pageNum} setPageNum={setPageNum} isIndividual={isIndividual} />
            )}
            <main className="pt-24 pb-10 w-full h-full flex flex-row justify-center items-start">
                <div className="w-full max-w-12/12 sm:max-w-[1400px] lg:w-10/12 lg:h-10/12 rounded-md sm:p-4">
                    <div className={pageNum !== 0 ? 'hidden' : ''}>
                        <RegistrationView
                            setPageNum={setPageNum}
                            isIndividual={isIndividual}
                            individualDelegate={individualDelegate}
                            individualAssignment={individualAssignment}
                        />
                    </div>
                    {!isIndividual && (
                        <>
                            <div className={`h-full ${pageNum !== 2 ? "hidden" : ""}`}>
                                <AssignmentView forceTab="assignments" />
                            </div>
                            <div className={`h-full ${pageNum !== 4 ? "hidden" : ""}`}>
                                <AssignmentView forceTab="delegates" />
                            </div>
                        </>
                    )}
                    {isIndividual && (
                        <div className={`h-full ${pageNum !== 2 ? "hidden" : ""}`}>
                            <PositionPaperTab disabled />
                        </div>
                    )}
                    <div className={pageNum !== 3 ? "hidden" : ""}>
                        <GuideView />
                    </div>
                </div>
            </main>
        </div>
    );
}

export default AdvisorView;