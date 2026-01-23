'use client';

import DropdownIcon from "@/app/utils/DropdownIcon";
import { COMMITTEE_LIST } from "@/app/utils/generalHelper";
import { getRegistration, RegistrationProps, updateRegistration } from "@/app/utils/supabaseHelpers";
import { useEffect, useState } from "react";

function CommitteesPanel() {
    const [reg, setReg] = useState<RegistrationProps>();
    const [regLoaded, setRegLoaded] = useState(false);
    const [droppedDown, setDroppedDown] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [committeePreferences, setCommitteePreferences] = useState<string[]>([]);

    const committeeNumbers = [1, 2, 3, 4, 5];

    // Load school data and initialize committee preferences
    useEffect(() => {
        (async () => {
            try {
                const newReg = await getRegistration();

                // Initialize with ""
                const initialPreferences = Array(10).fill("");

                if (!newReg) {
                    return;
                }

                // Populate with existing preferences if they exist
                if (newReg && newReg.committee_preferences) {
                    newReg.committee_preferences.forEach((committee: string, index: number) => {
                        initialPreferences[index] = committee;
                    });
                }

                setCommitteePreferences(initialPreferences);
                setReg(newReg);
                setRegLoaded(true);
            } catch (e) {
                console.error(e);
            }
        })();
    }, []);

    // Save updated committee preferences
        const saveCommittees = async () => {
            setSaveLoading(true);
            try {
                const finalCommittees = committeePreferences.filter(
                    (committee) => committee !== ""
                );
    
                if (reg) {
                    const updatedReg = { ...reg, committee_preferences: finalCommittees };
                    await updateRegistration(updatedReg);
                    setReg(updatedReg);
                }
            } catch (e) {
                window.alert("Failed to save committee preferences. Please try again in a moment.");
                console.error(e);
            }
            setSaveLoading(false);
        };

    if (!regLoaded) {
        return <></>
    }

    return (
            <div className="bg-black flex flex-col gap-2 w-full p-4 border-2 border-primary rounded-2xl">
                <div className="flex flex-row gap-10 items-center justify-between">
                    <div className="flex flex-row gap-2">
                        <h4 className="text-5xl">Committee Preferences</h4>
                        {regLoaded ? 
                            <DropdownIcon status={droppedDown} setStatus={setDroppedDown} /> : 
                            <p></p>}
                    </div>
                    <button
                        className="btn btn-lg btn-secondary"
                        onClick={saveCommittees}
                        disabled={!regLoaded || saveLoading}
                    >
                        {saveLoading ? <span className="loading loading-spinner"></span> : <></>}
                        Save
                    </button>
                </div>
    
                <div
                className={`grid grid-cols-2 md:grid-cols-5 justify-between flex-wrap gap-4 overflow-hidden transition-all duration-500 ease-in-out
                    ${droppedDown && regLoaded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}
                `}
                >
                {committeeNumbers.map((_, index) => (
                    <div key={index}>
                    <label className="label text-lg">Committee {index + 1}</label>
                    <select
                        className="select select-primary select-lg"
                        value={committeePreferences[index] || ""}
                        onChange={(e) => {
                        const updated = [...committeePreferences];
                        updated[index] = e.target.value;
                        setCommitteePreferences(updated);
                        }}
                    >
                        <option disabled value=""></option>
                        {COMMITTEE_LIST.map((committee, i) => (
                        <option key={i} value={committee}>
                            {committee}
                        </option>
                        ))}
                    </select>
                    </div>
                ))}
                </div>
            </div>
        );
}

export default CommitteesPanel;