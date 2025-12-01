'use client';

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logoutUser, getSupabaseUser, getAssignmentForCurrentDelegate, DelegateAssignmentInfo } from "../utils/supabaseHelpers";

type ActiveTab = "profile" | "paper";

interface DelegateUser {
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

    function renderProfileTab() {
        const fullName =
            delegate?.first_name && delegate?.last_name
                ? `${delegate.first_name} ${delegate.last_name}`
                : "Delegate";

        const committeeName = assignment?.committee_name || "your committee";
        const countryName = assignment?.country_name || "your assigned country";

        return (
            <div className="flex flex-col gap-6 w-full">
                {/* Welcome card */}
                <div className="card bg-base-100 shadow-xl border border-base-300">
                    <div className="card-body">
                        <h2
                            className="card-title text-3xl md:text-4xl"
                            style={{ fontFamily: "var(--font-roboto)" }}
                        >
                            Welcome to <span className="text-primary">BMUN 74</span>, {fullName}
                        </h2>
                        <p className="mt-2 text-lg md:text-xl">
                            You will be representing <span className="font-semibold text-primary">{countryName}</span> in
                            the committee <span className="font-semibold text-primary">{committeeName}</span>.
                        </p>
                    </div>
                </div>

                {/* Checklist card */}
                <div className="card bg-base-100 shadow-xl border border-base-300">
                    <div className="card-body space-y-4">
                        <h2
                            className="card-title text-2xl"
                            style={{ fontFamily: "var(--font-roboto)" }}
                        >
                            Your Conference Checklist
                        </h2>
                        <ul className="space-y-4">
                        <li className="flex flex-row gap-3 items-start">
                            <input
                                type="checkbox"
                                className="checkbox mt-1"
                                disabled
                            />
                            <div className="flex flex-col gap-1">
                                <p className="font-medium text-base md:text-lg">Position paper turned in</p>
                                <p className="text-sm md:text-base opacity-80">
                                    Delegates are strongly encouraged to turn in position papers 
                                    to ensure they have a solid grasp of their committee&apos;s topics 
                                    as well as the foundations for potential resolutions and 
                                    directives that can be pursued in committee. The due date to be 
                                    considered for a research award is <b>February 15</b> and the due date 
                                    to be considered for any award is <b>February 22</b>. To submit, click 
                                    the &quot;Position Paper&quot; tab, upload your position paper(s), and 
                                    click submit.
                                </p>
                            </div>
                        </li>
                        <li className="flex flex-row gap-3 items-start">
                            <input
                                type="checkbox"
                                className="checkbox mt-1"
                                disabled
                            />
                            <div className="flex flex-col gap-1">
                                <p className="font-medium text-base md:text-lg">Waiver submitted</p>
                                <p className="text-sm md:text-base opacity-80">
                                    All delegates are required to turn in a medical and media 
                                    release waiver prior to attending conference. Waiver completion 
                                    is due on <b>February 15</b> and the waiver will become available on <b>January 25</b> on
                                    this tab.
                                    <br/> <br/>
                                    This checklist item is updated manually by BMUN&apos;s USG of 
                                    External Relations, every non-holiday Wednesday and Sunday night on a 
                                    rolling basis. If you have submitted a waiver electronically 
                                    and this item has not been checked, please contact info@bmun.org
                                </p>
                            </div>
                        </li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    function renderPaperTab() {
        return (
            <div className="flex flex-col gap-6 w-full">
                <div className="card bg-base-100 shadow-xl border border-base-300">
                    <div className="card-body space-y-3">
                        <h2
                            className="card-title text-3xl md:text-4xl"
                            style={{ fontFamily: "var(--font-roboto)" }}
                        >
                            Position Paper Submission
                        </h2>
                        <ul className="list-disc list-outside ml-6 text-md md:text-lg opacity-90 space-y-1">
                            <li>
                                Choose a file then hit submit to turn in your paper
                            </li>
                            <li>
                                Accepted file types: .pdf, .doc, .docx. Other file types will not be graded
                            </li>
                            <li>
                                For double delegations, either delegate can upload the paper
                            </li>
                            <li>
                                You can only submit <b>one</b> file for your delegation. This should contain your position paper for all topics
                            </li>
                            <li>
                                All submission times are in <b>Pacific Standard Time</b>
                            </li>
                            <li>
                                The large influx of submissions near the deadline can slow the system, and result in your paper&apos;s timestamp being later
                                than you expect it to be. <b>THIS IS YOUR RESPONSIBILITY TO AVOID.</b> If you want to be safe, submit your paper at least
                                thirty minutes before the deadline to account for unforeseen difficulties.
                            </li>
                            <li>
                                Any submission with a timestamp later than the deadline will be considered late
                            </li>
                            <li>
                                When considering time of submission, chairs will only look at the timestamp of the most recent upload.
                            </li>
                            <li>
                                If either delegate (assuming a double delegation) submits a paper, it will entirely overwrite any previous submission made by either delegate.
                            </li>
                            <li>
                                After uploading, the green download button should appear/ Click this to see the file you have uploaded.
                            </li>
                            <li>
                                Once your paper has been graded you will be unable to resubmit. You may resubmit until then.
                            </li>
                            <li>
                                After your paper has been graded, you should be able to download the file and see comments left by your chairs
                            </li>
                        </ul>
                        <p className="text-md md:text-lg opacity-90">
                            <b>
                                Refresh the page and try to download your paper after you submit; if the file you see is not what you expect
                                you should re-upload the paper. If you do not see a download button, then your submission did not go through and you should 
                                re-upload the paper.
                            </b>
                        </p>
                    </div>
                </div>
                {/*<div className="card bg-base-100 shadow-xl border border-base-300">
                    <div className="card-body space-y-3">
                        <h4 className="card-title text-2xl md:text-3xl">
                            Position Paper Uploads will become available January 1st.
                        </h4>
                    </div>
                </div>*/}

                {/* Upload controls (disabled for now) */}
                <div className="card bg-base-100 shadow-md border border-base-300">
                    <div className="card-body space-y-3">
                        <h3 className="card-title text-xl md:text-2xl" style={{ fontFamily: "var(--font-roboto)" }}>
                            Position Paper uploads will become available January 1st.
                        </h3>
                        <div className="flex flex-wrap gap-3 items-center">
                            <button className="btn btn-outline btn-primary" disabled>
                                Select File
                            </button>
                            <button className="btn btn-primary" disabled>
                                Submit
                            </button>
                        </div>
                    </div>
                </div>

                {/* Download controls (disabled placeholders) */}
                <div className="card bg-base-100 shadow-md border border-base-300">
                    <div className="card-body space-y-3">
                        <h3 className="card-title text-xl md:text-2xl" style={{ fontFamily: "var(--font-roboto)" }}>
                            Uploaded File
                        </h3>
                        <div className="flex flex-wrap gap-3 items-center">
                            <button className="btn btn-success" disabled>
                                Download Original Paper
                            </button>
                            <button className="btn btn-secondary" disabled>
                                Download Graded Paper
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5 min-h-screen text-base-content">
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
                    {loadingUser ? (
                        <div className="flex items-center justify-center h-[60vh]">
                            <span className="loading loading-spinner loading-lg" />
                        </div>
                    ) : (
                        <>
                            {activeTab === "profile" && renderProfileTab()}
                            {activeTab === "paper" && renderPaperTab()}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

export default DelegateView;