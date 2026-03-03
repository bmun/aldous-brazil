'use client';

import { logoutUser } from "@/app/utils/supabaseHelpers";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

interface NavBarProps {
    pageNum: number;
    setPageNum: (n: number) => void;
    /** When true, show advisor-as-delegate navigation (no assignments/delegate tabs, add position paper tab). */
    isIndividual?: boolean;
}

function goToPage(setPageNum: (n: number) => void, page: number) {
    setPageNum(page);
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
}

function NavBar({ pageNum, setPageNum, isIndividual = false }: NavBarProps) {
    const [loggingOut, setLoggingOut] = useState(false);
    const router = useRouter();

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

    const tabClass = "tab text-xs sm:text-sm md:text-base";
    const fontStyle = { fontFamily: "var(--font-roboto)" };

    return (
        <div className="fixed z-20 w-full bg-base-100 border-b border-base-300 shadow-md">
            <div className="navbar max-w-12/12 sm:max-w-[1400px] lg:w-10/12 mx-auto px-2">
                <div className="navbar-start">
                    <button
                        className="btn btn-ghost normal-case text-2xl flex items-center gap-2"
                        onClick={() => goToPage(setPageNum, 0)}
                    >
                        <Image src="/BMUN Logo Blue.png" alt="BMUN Logo" width={140} height={32} />
                    </button>
                </div>
                <div className="navbar-center">
                    <div className="tabs tabs-boxed bg-base-200">
                        <button
                            className={`${tabClass} ${pageNum === 0 ? "tab-active" : ""}`}
                            style={fontStyle}
                            onClick={() => goToPage(setPageNum, 0)}
                        >
                            Registration
                        </button>

                        {!isIndividual && (
                            <>
                                <button
                                    className={`${tabClass} ${pageNum === 2 ? "tab-active" : ""}`}
                                    style={fontStyle}
                                    onClick={() => goToPage(setPageNum, 2)}
                                >
                                    Assignments
                                </button>
                                <button
                                    className={`${tabClass} ${pageNum === 4 ? "tab-active" : ""}`}
                                    style={fontStyle}
                                    onClick={() => goToPage(setPageNum, 4)}
                                >
                                    Delegate accounts
                                </button>
                            </>
                        )}

                        {isIndividual && (
                            <button
                                className={`${tabClass} ${pageNum === 2 ? "tab-active" : ""}`}
                                style={fontStyle}
                                onClick={() => goToPage(setPageNum, 2)}
                            >
                                Position paper
                            </button>
                        )}

                        <button
                            className={`${tabClass} inline-flex items-center gap-1`}
                            style={fontStyle}
                            onClick={() => window.open("https://www.bmun.org/brazilintro", "_blank", "noopener,noreferrer")}
                        >
                            Conference Intro
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
                            className={`${tabClass} inline-flex items-center gap-1`}
                            style={fontStyle}
                            onClick={() => window.open("https://www.bmun.org/brazilcommittees", "_blank", "noopener,noreferrer")}
                        >
                            Committees
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
                        onClick={() => handleLogout()}
                    >
                        {loggingOut ? <span className="loading loading-spinner" /> : null}
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}

export default NavBar;