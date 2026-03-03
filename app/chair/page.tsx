'use client';

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    logoutUser,
    getSupabaseUser,
    getAssignmentsForCurrentChair,
    getDelegatesByEmails,
    getCommitteeForCurrentChair,
    ChairCommitteeInfo,
    DelegateProps,
    AssignmentProps,
} from "../utils/supabaseHelpers";
import ProfileTab from "./tabs/ProfileTab";
import PapersTab from "./tabs/PapersTab";
import AttendanceTab from "./tabs/AttendanceTab";

type ActiveTab = "profile" | "papers" | "attendance";

export interface ChairUser {
    first_name?: string;
    last_name?: string;
}

function ChairView() {
    const [activeTab, setActiveTab] = useState<ActiveTab>("profile");
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);
    const [chair, setChair] = useState<ChairUser | null>(null);
    const [committeeName, setCommitteeName] = useState<string | undefined>(undefined);
    const [committee, setCommittee] = useState<ChairCommitteeInfo | null>(null);
    const [committeeShortName, setCommitteeShortName] = useState<string | undefined>(undefined);
    const [delegates, setDelegates] = useState<DelegateProps[]>([]);
    const [assignments, setAssignments] = useState<AssignmentProps[]>([]);

    const router = useRouter();

    const committeeSlug = committeeShortName
        ? (() => {
              const lower = committeeShortName.toLowerCase();

              if (lower.includes("jcc")) {
                  return "jcc";
              }

              if (lower.includes("press")) {
                  return "presscorps";
              }

              return encodeURIComponent(lower);
          })()
        : null;

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const user = await getSupabaseUser();

            if (!user) {
                router.push("/login");
                return;
            }

            if (user.user_type !== "chair") {
                router.push("/login");
                return;
            }

            setChair({
                first_name: user.first_name,
                last_name: user.last_name,
            });

            // 1) Get committee info for this chair (for name, chair_info, etc.)
            const committeeData: ChairCommitteeInfo | null = await getCommitteeForCurrentChair();
            if (committeeData) {
                setCommittee(committeeData);
                setCommitteeName(committeeData.full_name || committeeData.name);
                setCommitteeShortName(committeeData.name);
            }

            // 2) Get all assignments with the same committee_id as the user's committee_id
            const assignmentsList = await getAssignmentsForCurrentChair();
            setAssignments(assignmentsList);

            // 3) Collect all emails from delegate_ids in those assignments
            const allEmails = new Set<string>();
            assignmentsList.forEach(assignment => {
                (assignment.delegate_ids || []).forEach(email => {
                    if (email) allEmails.add(email);
                });
            });

            // 4) Get users associated with those emails
            const emailList = Array.from(allEmails);
            const delegateList = await getDelegatesByEmails(emailList);
            
            // Convert ChairDelegateInfo to DelegateProps format
            const delegatesList: DelegateProps[] = delegateList.map(d => ({
                first_name: d.first_name || "",
                last_name: d.last_name || "",
                email: d.email,
                school_id: 0, // Not needed for chair view
                assignment_id: d.assignment_id || null,
            }));
            setDelegates(delegatesList);

            setLoading(false);
        }

        loadData();
    }, [router]);

    async function handleLogout() {
        setLoggingOut(true);
        try {
            await logoutUser();
            router.push("/login");
        } catch (error) {
            console.error(error);
        }
        setLoggingOut(false);
    }

    useEffect(() => {
        // Apply gradient to html and body as the true background
        const gradient = 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 25%, #3c5a7f 50%, #2d4a6f 75%, #1e3a5f 100%)';
        
        // Store original styles
        const originalBodyBackground = document.body.style.background;
        const originalBodyAttachment = document.body.style.backgroundAttachment;
        const originalHtmlBackground = document.documentElement.style.background;
        const originalHtmlAttachment = document.documentElement.style.backgroundAttachment;
        const originalHtmlClass = document.documentElement.className;
        
        // Apply gradient to html and body
        document.documentElement.style.background = gradient;
        document.documentElement.style.backgroundAttachment = 'fixed';
        document.body.style.background = gradient;
        document.body.style.backgroundAttachment = 'fixed';
        
        // Remove bg-base-200 class if present
        document.documentElement.classList.remove('bg-base-200');
        
        return () => {
            // Restore original styles on cleanup
            document.body.style.background = originalBodyBackground;
            document.body.style.backgroundAttachment = originalBodyAttachment;
            document.documentElement.style.background = originalHtmlBackground;
            document.documentElement.style.backgroundAttachment = originalHtmlAttachment;
            if (originalHtmlClass.includes('bg-base-200')) {
                document.documentElement.classList.add('bg-base-200');
            }
        };
    }, []);

    return (
        <div className="flex flex-col gap-5 min-h-screen text-base-content" style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 25%, #3c5a7f 50%, #2d4a6f 75%, #1e3a5f 100%)',
            backgroundAttachment: 'fixed',
        }}>
            {/* Top Nav */}
            <div className="fixed z-20 w-full bg-base-100 border-b border-base-300 shadow-md">
                <div className="navbar max-w-12/12 sm:max-w-[1400px] lg:w-10/12 mx-auto px-2">
                    <div className="navbar-start">
                        <button
                            className="btn btn-ghost normal-case text-2xl flex items-center gap-2"
                            onClick={() => setActiveTab("profile")}
                        >
                            <Image src="/BMUN Logo Blue.png" alt="BMUN Logo" width={140} height={32} />
                        </button>
                    </div>
                    <div className="navbar-center">
                        <div className="tabs tabs-boxed bg-base-200">
                            <button
                                className={`tab text-xs sm:text-sm md:text-base ${
                                    activeTab === "profile" ? "tab-active" : ""
                                }`}
                                style={{ fontFamily: "var(--font-roboto)" }}
                                onClick={() => setActiveTab("profile")}
                            >
                                Profile
                            </button>
                            <button
                                className={`tab text-xs sm:text-sm md:text-base ${
                                    activeTab === "papers" ? "tab-active" : ""
                                }`}
                                style={{ fontFamily: "var(--font-roboto)" }}
                                onClick={() => setActiveTab("papers")}
                            >
                                Papers
                            </button>
                            <button
                                className={`tab text-xs sm:text-sm md:text-base ${
                                    activeTab === "attendance" ? "tab-active" : ""
                                }`}
                                style={{ fontFamily: "var(--font-roboto)" }}
                                onClick={() => setActiveTab("attendance")}
                            >
                                Attendance
                            </button>
                            <button
                                className="tab text-xs sm:text-sm md:text-base inline-flex items-center gap-1"
                                style={{ fontFamily: "var(--font-roboto)" }}
                                onClick={() => {
                                    window.open("https://www.bmun.org/brazilcommittees", "_blank", "noopener,noreferrer");
                                }}
                            >
                                Committee Website
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                    focusable="false"
                                    className="inline-block"
                                >
                                    <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <path d="M15 3h6v6" />
                                    <path d="M10 14L21 3" />
                                </svg>
                                <span className="sr-only">(opens in a new tab)</span>
                            </button>
                        </div>
                    </div>
                    <div className="navbar-end gap-2">
                        <button
                            className="btn btn-ghost btn-sm md:btn-md"
                            disabled={loggingOut}
                            onClick={async () => await handleLogout()}
                        >
                            {loggingOut ? <span className="loading loading-spinner" /> : null}
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Page Content */}
            <main className="pt-24 pb-10 w-full h-full flex flex-row justify-center items-start">
                <div className="w-full max-w-12/12 sm:max-w-[1400px] lg:w-10/12 lg:h-10/12 rounded-md sm:p-4">
                    {loading || chair == null ? (
                        <div className="flex flex-col gap-6 w-full">
                            {/* Title card skeleton */}
                            <div className="card bg-base-100 shadow-xl border border-base-300">
                                <div className="card-body">
                                    <div className="flex flex-row items-center gap-4 flex-wrap">
                                        <div className="h-10 bg-base-300 rounded w-64 animate-pulse"></div>
                                        <div className="h-6 bg-base-300 rounded w-32 animate-pulse"></div>
                                    </div>
                                    <div className="mt-4 flex flex-row flex-wrap gap-4 items-center">
                                        <div className="h-8 bg-base-300 rounded w-24 animate-pulse"></div>
                                        <div className="h-8 bg-base-300 rounded w-24 animate-pulse"></div>
                                        <div className="h-8 bg-base-300 rounded w-32 animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                            {/* Rubric card skeleton */}
                            <div className="card bg-base-100 shadow-xl border border-base-300">
                                <div className="card-body">
                                    <div className="h-8 bg-base-300 rounded w-32 mb-4 animate-pulse"></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="h-6 bg-base-300 rounded w-24 animate-pulse"></div>
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="space-y-2">
                                                    <div className="h-4 bg-base-300 rounded w-32 animate-pulse"></div>
                                                    <div className="h-12 bg-base-300 rounded animate-pulse"></div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="space-y-4">
                                            <div className="h-6 bg-base-300 rounded w-24 animate-pulse"></div>
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="space-y-2">
                                                    <div className="h-4 bg-base-300 rounded w-32 animate-pulse"></div>
                                                    <div className="h-12 bg-base-300 rounded animate-pulse"></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Chairs card skeleton */}
                            <div className="card bg-base-100 shadow-xl border border-base-300">
                                <div className="card-body">
                                    <div className="h-8 bg-base-300 rounded w-32 mb-4 animate-pulse"></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[1, 2].map((i) => (
                                            <div key={i} className="flex flex-row gap-3 items-stretch">
                                                <div className="h-14 bg-base-300 rounded flex-1 animate-pulse"></div>
                                                <div className="h-14 w-14 bg-base-300 rounded animate-pulse"></div>
                                                <div className="h-14 w-14 bg-base-300 rounded animate-pulse"></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={activeTab === "profile" ? "" : "hidden"}>
                                <ProfileTab chair={chair} committeeName={committeeName} committeeShortName={committeeShortName} assignments={assignments} />
                            </div>
                            <div className={activeTab === "papers" ? "" : "hidden"}>
                                <PapersTab committeeName={committeeName} committeeShortName={committeeShortName} delegates={delegates} assignments={assignments} committee={committee} />
                            </div>
                            <div className={activeTab === "attendance" ? "" : "hidden"}>
                                <AttendanceTab committeeName={committeeName} delegates={delegates} assignments={assignments} />
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

export default ChairView;