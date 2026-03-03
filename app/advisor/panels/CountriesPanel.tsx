'use client';

import DropdownIcon from "@/app/utils/DropdownIcon";
import { UN_COUNTRIES } from "@/app/utils/generalHelper";
import { getSchool, SchoolProps, updateSchool } from "@/app/utils/supabaseHelpers";
import { useEffect, useState } from "react";

function CountriesPanel() {
    const [school, setSchool] = useState<SchoolProps>();
    const [schoolLoaded, setSchoolLoaded] = useState(false);
    const [droppedDown, setDroppedDown] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [countryPreferences, setCountryPreferences] = useState<string[]>([]);

    const countryNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // Load school data and initialize country preferences
    useEffect(() => {
        (async () => {
            try {
                const newSchool = await getSchool();

                // Initialize with ""
                const initialPreferences = Array(10).fill("");

                // Populate with existing preferences if they exist
                if (newSchool.country_preferences) {
                    newSchool.country_preferences.forEach((country: string, index: number) => {
                        initialPreferences[index] = country;
                    });
                }

                setCountryPreferences(initialPreferences);
                setSchool(newSchool);
                setSchoolLoaded(true);
            } catch (e) {
                console.error(e);
            }
        })();
    }, []);

    // Save updated country preferences
    const saveCountries = async () => {
        setSaveLoading(true);
        try {
            const finalCountries = countryPreferences.filter(
                (country) => country !== ""
            );

            if (school) {
                const updatedSchool = { ...school, country_preferences: finalCountries };
                await updateSchool(updatedSchool);
                setSchool(updatedSchool);
            }
        } catch (e) {
            window.alert("Failed to save country preferences. Please try again in a moment.");
            console.error(e);
        }
        setSaveLoading(false);
    };

    return (
        <div className="card bg-base-100 shadow-xl border-2 border-primary w-full">
            <div className="card-body text-base-content">
            <div className="flex flex-row gap-10 items-center justify-between">
                <div className="flex flex-row gap-2">
                    <h4 className="text-5xl">Country Preferences</h4>
                    <DropdownIcon status={droppedDown} setStatus={setDroppedDown} />
                </div>
                <button
                    className="btn btn-lg btn-secondary"
                    onClick={saveCountries}
                    disabled={!schoolLoaded || saveLoading}
                >
                    {saveLoading ? <span className="loading loading-spinner"></span> : <></>}
                    Save
                </button>
            </div>

            <div
            className={`grid grid-cols-2 md:grid-cols-5 justify-between flex-wrap gap-4 overflow-hidden transition-all duration-500 ease-in-out
                ${droppedDown && schoolLoaded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}
            `}
            >
            {countryNumbers.map((_, index) => (
                <div key={index}>
                <label className="label text-lg">Country {index + 1}</label>
                <select
                    className="select select-primary select-lg"
                    value={countryPreferences[index] || ""}
                    onChange={(e) => {
                    const updated = [...countryPreferences];
                    updated[index] = e.target.value;
                    setCountryPreferences(updated);
                    }}
                >
                    <option disabled value=""></option>
                    {UN_COUNTRIES.map((country, i) => (
                    <option key={i} value={country}>
                        {country}
                    </option>
                    ))}
                </select>
                </div>
            ))}
            </div>
            </div>
        </div>
    );
}

export default CountriesPanel;
