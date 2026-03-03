'use client';

import { useState } from "react";
import GuidePanel from "../panels/GuidePanel";


const guides = [
    {
        topicTitle: "How to officially register",
        imgSrc: '/RegScreenshot.png',
        helpfulSnippet: `
        Navigate to your home dashboard by either clicking the logo in the top 
        left corner or the "Registration" tab in the navigation bar. Then, in the top left 
        card, click "Register Now", fill out the associated information, and 
        click "Register for BMUN". If all went well, you should see your confirmed 
        registration numbers in the top left card, and you will receive an invoice 
        within 5 business days. In order to register, it has to be during a 
        registration period outlined in the registration guide, and in the timeline 
        located in the "Registration" tab.
        `
    },
    {
        topicTitle: "How to update my profile",
        imgSrc: '/ProfileInfo.png',
        helpfulSnippet: `
        Your profile is divided into three sections: school information, primary
        advisor, and secondary advisor. You can edit all three in the "Profile" card
        on your registration page. Simply update the information and select "Update Profile".
        When updating your profile, keep in mind that your primary advisor must be 18 years 
        or older, at least one advisor must be present on campus at all times, and the 
        school information will be used as your mailing address for invoicing. 
        `
    },
    {
        topicTitle: "How to edit country preferences",
        imgSrc: '/savePreferences.png',
        helpfulSnippet: `
        When delegating assignments, BMUN takes into account the country preferences submitted 
        by each school. To select or update your preferences, go to the "Assignments" tab and 
        locate the "Country Preferences" card at the top of the page. From there, you can choose 
        up to 10 countries using the individual dropdown menus. Once you’ve made your selections, 
        click "Save" to confirm your choices.
        `
    },
]

function GuideView() {
    const [viewShortcuts, setViewShortcuts] = useState(false);

    const scrollToPanel = (index: number) => {
        const el = document.getElementById(`guide-panel-${index}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div className="flex flex-col gap-4 w-full p-4">
            <div className="flex flex-col w-full gap-4 rounded-lg mb-4">
                {/* Help icon */}
                <div className="flex flex-col gap-4 justify-end items-end text-right fixed z-50 bottom-10 right-10 text-primary">
                    <div 
                        className={`${viewShortcuts ? '' : 'translate-x-full opacity-0'} flex flex-col transition duration-300 ease-in-out gap-2 bg-base-100 p-2 rounded-md border-2 border-primary shadow-xl text-base-content`}>
                    {guides.map((guide, index) => (
                        <h5 
                            className="text-4xl hover:cursor-pointer"
                            key={index}
                            onClick={() => scrollToPanel(index)}>
                                {guide.topicTitle}
                        </h5>
                    ))}
                    </div>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-20 w-20 hover:cursor-pointer bg-base-100 border-2 border-primary rounded-full shadow-xl text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        onClick={() => setViewShortcuts(!viewShortcuts)}
                        stroke="currentColor">
                            <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                {/* Guides */}
                {guides.map((guide, index) => (
                    <div key={index} id={`guide-panel-${index}`}>
                        {index != 0 ? <div className="divider" /> : <></>}
                        <GuidePanel
                            topicTitle={guide.topicTitle}
                            imgSrc={guide.imgSrc}
                            helpfulSnippet={guide.helpfulSnippet}
                            invert={index % 2 === 1}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default GuideView;
