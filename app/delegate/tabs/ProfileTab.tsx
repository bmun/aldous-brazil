import { DelegateAssignmentInfo, getPositionPaperForCurrentDelegate } from "@/app/utils/supabaseHelpers";
import { DelegateUser } from "../page";
import { useEffect, useState } from "react";

interface ProfileTabProps {
    delegate: DelegateUser,
    assignment: DelegateAssignmentInfo
}

function ProfileTab({delegate, assignment}: ProfileTabProps) {
    const [hasPaper, setHasPaper] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const paper = await getPositionPaperForCurrentDelegate();
                setHasPaper(paper !== null);
            } catch (e) {
                console.error('Error checking position paper:', e);
                setHasPaper(false);
            }
        })();
    }, []);

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
                    <li className="flex flex-row gap-3 items-start hover:cursor-default">
                        <input
                            type="checkbox"
                            className="checkbox checkbox-primary mt-1 "
                            checked={hasPaper}
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
                            className="checkbox checkbox-primary mt-1"
                            checked={delegate?.waiver_submitted ?? false}
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


export default ProfileTab;