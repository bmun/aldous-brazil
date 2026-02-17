'use client';

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logoutUser, getSupabaseUser, getAssignmentForCurrentDelegate, DelegateAssignmentInfo } from "../utils/supabaseHelpers";
import { WAIVER_URL } from "../utils/generalHelper";
import ProfileTab from "./tabs/ProfileTab";
import PositionPaperTab from "./tabs/PositionPaperTab";

type ActiveTab = "profile" | "paper";

export interface DelegateUser {
    first_name?: string;
    last_name?: string;
}

function DelegateView() {
    const [activeTab, setActiveTab] = useState<ActiveTab>("profile");
    const [loadingUser, setLoadingUser] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);
    const [delegate, setDelegate] = useState<DelegateUser | null>(null);
    const [assignment, setAssignment] = useState<DelegateAssignmentInfo | null>(null);

    const router = useRouter();

    const committeeSlug = assignment
        ? (() => {
              const rawName = assignment.committee_name || "";
              const lower = rawName.toLowerCase();

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
            const user = await getSupabaseUser();

            if (!user) {
                router.push("/login");
                return;
            }

            setDelegate({
                first_name: user.first_name,
                last_name: user.last_name,
            });

            const assignmentInfo = await getAssignmentForCurrentDelegate();
            if (assignmentInfo) {
                setAssignment(assignmentInfo);
            }

            setLoadingUser(false);
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
                    {assignment != null && (
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
                                    activeTab === "paper" ? "tab-active" : ""
                                }`}
                                style={{ fontFamily: "var(--font-roboto)" }}
                                onClick={() => setActiveTab("paper")}
                            >
                                Paper
                            </button>
                            <button
                                className="tab text-xs sm:text-sm md:text-base inline-flex items-center gap-1"
                                style={{ fontFamily: "var(--font-roboto)" }}
                                onClick={() => {
                                    window.open(WAIVER_URL, "_blank", "noopener,noreferrer");
                                }}
                            >
                                Waiver
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
                            <button
                                className="tab text-xs sm:text-sm md:text-base inline-flex items-center gap-1"
                                style={{ fontFamily: "var(--font-roboto)" }}
                                onClick={() => {
                                    const url = committeeSlug
                                        ? `https://www.bmun.org/committees/${committeeSlug}`
                                        : "https://www.bmun.org/committees";
                                    window.open(url, "_blank", "noopener,noreferrer");
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
                    )}
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
                    { loadingUser || delegate == null ? (
                        <div className="flex flex-col gap-6 w-full">
                            {/* Welcome card skeleton */}
                            <div className="card bg-base-100 shadow-xl border border-base-300">
                                <div className="card-body">
                                    <div className="h-10 bg-base-300 rounded w-96 mb-4 animate-pulse"></div>
                                    <div className="h-6 bg-base-300 rounded w-full max-w-md animate-pulse"></div>
                                </div>
                            </div>
                            {/* Checklist card skeleton */}
                            <div className="card bg-base-100 shadow-xl border border-base-300">
                                <div className="card-body space-y-4">
                                    <div className="h-8 bg-base-300 rounded w-64 animate-pulse"></div>
                                    <ul className="space-y-4">
                                        {[1, 2].map((i) => (
                                            <li key={i} className="flex flex-row gap-3 items-start">
                                                <div className="h-6 w-6 bg-base-300 rounded mt-1 animate-pulse"></div>
                                                <div className="flex flex-col gap-2 flex-1">
                                                    <div className="h-5 bg-base-300 rounded w-48 animate-pulse"></div>
                                                    <div className="h-4 bg-base-300 rounded w-full animate-pulse"></div>
                                                    <div className="h-4 bg-base-300 rounded w-3/4 animate-pulse"></div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ) : assignment == null ? (
                        <div className="w-full flex flex-col justify-center items-center min-h-[50vh]">
                            <div className="card bg-base-100 shadow-xl border border-base-300 text-center">
                                <div className="card-body items-center text-center">
                                    <p className="text-lg md:text-xl">
                                        Unassigned Delegate Account.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : activeTab == "profile" ?
                        <ProfileTab assignment={assignment} delegate={delegate} />
                      :
                        <PositionPaperTab />
                    }
                </div>
            </main>
        </div>
    );
}

export default DelegateView;