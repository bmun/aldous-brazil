'use client';

import { logoutUser } from "@/app/utils/supabaseHelpers";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WAIVER_URL } from "@/app/utils/generalHelper";

import Image from 'next/image';

interface NavBarProps {
    setPageNum: Function
}

function NavBar({setPageNum}: NavBarProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleLogout() {
        setLoading(true);
        try {
            await logoutUser();
            router.push('/login');
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    }

    return (
        <div className="fixed navbar z-20 bg-black border-b-2 border-primary text-primary shadow-lg mx-auto">
                <div className="navbar-start">
                    <div className="dropdown">
                        <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" /> </svg>
                        </div>
                        <ul
                            tabIndex={0}
                            className="menu menu-xl dropdown-content text-white bg-black rounded-box z-1 mt-3 w-52 p-2 shadow">
                            <li onClick={() => setPageNum(0)}><a>Registration</a></li>
                            <li onClick={() => setPageNum(2)}><a>Assignments</a></li>
                            <li onClick={() => setPageNum(3)}><a>Website Guide</a></li>
                            <li>
                                <a
                                    href={WAIVER_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1"
                                >
                                    Waiver
                                    <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16" height="16" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round"
                                    aria-hidden="true" focusable="false"
                                    className="inline-block"
                                    >
                                    <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                    <path d="M15 3h6v6"/>
                                    <path d="M10 14L21 3"/>
                                    </svg>
                                    <span className="sr-only">(opens in a new tab)</span>
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://www.bmun.org/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1"
                                >
                                    BMUN.org
                                    <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16" height="16" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round"
                                    aria-hidden="true" focusable="false"
                                    className="inline-block"
                                    >
                                    <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                    <path d="M15 3h6v6"/>
                                    <path d="M10 14L21 3"/>
                                    </svg>
                                    <span className="sr-only">(opens in a new tab)</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                    <h1 className="hidden md:flex flex-row items-center gap-2 text-3xl p-2 hover:cursor-pointer" onClick={() => setPageNum(0)}>
                        <Image src="/BMUN Logo Blue.png" alt="BMUN Logo" width={150} height={35} />
                    </h1>
                    <h1 className="md:hidden text-3xl p-2 hover:cursor-pointer" onClick={() => setPageNum(0)}>
                        <Image src="/BMUN Logo Blue.png" alt="BMUN Logo" width={150} height={35} />
                    </h1>
                </div>
                <div className="navbar-center hidden lg:block">
                    <ul className="menu menu-horizontal px-1 text-lg text-white font-bold">
                        <li onClick={() => {
                            setPageNum(0); 
                            window.scrollTo({
                                top: 0,
                                left: 0,
                                behavior: 'smooth'
                            });
                            }}><a>Registration</a></li>
                        <li onClick={() => {
                            setPageNum(2); 
                            window.scrollTo({
                                top: 0,
                                left: 0,
                                behavior: 'smooth'
                            });
                            }}><a>Assignments</a></li>
                        <li onClick={() => {
                            setPageNum(3); 
                            window.scrollTo({
                                top: 0,
                                left: 0,
                                behavior: 'smooth'
                            });
                            }}><a>Guide</a></li>
                        <li>
                            <a
                                href={WAIVER_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1"
                            >
                                Waiver
                                <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16" height="16" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round"
                                aria-hidden="true" focusable="false"
                                className="inline-block"
                                >
                                <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                <path d="M15 3h6v6"/>
                                <path d="M10 14L21 3"/>
                                </svg>
                                <span className="sr-only">(opens in a new tab)</span>
                            </a>
                        </li>
                        <li>
                            <a
                                href="https://www.bmun.org/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1"
                            >
                                Main Website
                                <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16" height="16" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round"
                                aria-hidden="true" focusable="false"
                                className="inline-block"
                                >
                                <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                <path d="M15 3h6v6"/>
                                <path d="M10 14L21 3"/>
                                </svg>
                                <span className="sr-only">(opens in a new tab)</span>
                            </a>
                        </li>
                    </ul>
                </div>
                <div className="navbar-end">
                    <button className="btn btn-ghost text-lg" disabled={loading} onClick={async () => await handleLogout()}>
                        {loading ? <span className="loading loading-spinner"></span> : <></>}
                        Logout
                    </button>
                </div>
            </div>
    )
}

export default NavBar;