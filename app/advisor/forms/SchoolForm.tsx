'use client';
import { getSchool, SchoolProps, updateSchool } from "@/app/utils/supabaseHelpers";
import { useEffect, useState } from "react";

interface SchoolFormProps {
    setSchoolLoading: Function
}

function SchoolForm({setSchoolLoading}: SchoolFormProps) {
    const [school, setSchool] = useState<SchoolProps>();
    const [ogSchool, setOGSchool] = useState<SchoolProps>();
    const [loading, setLoading] = useState(false);

    useEffect(() => {(async () => {
        const newSchool = await getSchool();
        setSchool(newSchool);
        setOGSchool(newSchool);
        setSchoolLoading(false);
    })()}, [setSchoolLoading]);

    function canUpdate() {
        return JSON.stringify(school) !== JSON.stringify(ogSchool);
    }

    const handleChange = (field: keyof SchoolProps, value: string | boolean | number) => {
        if (!school) return;
        setSchool({ ...school, [field]: value });
    }

    async function handleSubmission() {
        if (!canUpdate() || school === undefined) {
            return;
        }
        setLoading(true);
        try {
            const success = await updateSchool(school);
            if (!success) {
                alert("Update failed, please try again later.");
            }
        } catch (error) {
            console.log(error);
        }
        setLoading(false);
    }

    if (!school) return (
        <div className="flex flex-col w-full h-full justify-center items-center text-5xl">
            Loading...
        </div>
    );

    return (
        <fieldset className="w-full flex flex-col gap-1 p-4 bg-black border-2 border-primary rounded-2xl">
            <h3 className="text-7xl">Profile</h3>
            <div>
                <div className="flex flex-row items-center justify-between gap-4">
                    <h5 className="text-3xl">School Information</h5>
                    {/*<label className="label gap-2">
                        <input
                            type="checkbox"
                            checked={school.international}
                            onChange={(e) => {
                                if (school.international) {
                                    setSchool({ ...school, ["country"]: "United States" });
                                }
                                handleChange('international', e.target.checked);
                            }}
                            className="toggle toggle-primary"
                        />
                        International School
                    </label>*/}
                </div>
                <div className="flex flex-col">
                    <label className="label text-lg">School Name</label>
                    <input
                        type="text"
                        value={school.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="input input-bordered text-lg w-full"
                    />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                        <label className="label text-lg">Address</label>
                        <input
                            type="text"
                            value={school.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            className="input input-bordered text-lg w-full"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="label text-lg">Country</label>
                        <input
                            type="text"
                            value={school.country}
                            onChange={(e) => handleChange('country', e.target.value)}
                            className="input input-bordered text-lg w-full"
                            disabled={!school.international}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col">
                        <label className="label text-lg">City</label>
                        <input
                            type="text"
                            value={school.city}
                            onChange={(e) => handleChange('city', e.target.value)}
                            className="input input-bordered text-lg w-full"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="label text-lg">{school.international ? "State" : "State"}</label>
                        <input
                            type="text"
                            value={school.state}
                            onChange={(e) => handleChange('state', e.target.value)}
                            className="input input-bordered text-lg w-full"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="label text-lg">{school.international ? "Postal Code" : "Zip Code"}</label>
                        <input
                            type="text"
                            value={school.zip_code}
                            onChange={(e) => handleChange('zip_code', e.target.value)}
                            className="input input-bordered text-lg w-full"
                        />
                    </div>
                </div>
            </div>

            <div>
                <div className="flex flex-row items-center justify-between gap-4">
                    <h5 className="text-3xl">Primary Contact</h5>
                    <label className="label gap-2">
                        <input
                            type="checkbox"
                            checked={school.primary_student}
                            onChange={(e) => handleChange('primary_student', e.target.checked)}
                            className="toggle toggle-primary"
                        />
                        Student Advisor
                    </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col">
                        <label className="label text-lg">Name</label>
                        <input
                            type="text"
                            value={school.primary_name}
                            onChange={(e) => handleChange('primary_name', e.target.value)}
                            className="input input-bordered text-lg w-full"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="label text-lg">Email</label>
                        <input
                            type="email"
                            value={school.primary_email}
                            onChange={(e) => handleChange('primary_email', e.target.value)}
                            className="input input-bordered text-lg w-full"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="label text-lg">Phone Number</label>
                        <input
                            type="text"
                            value={school.primary_phone}
                            onChange={(e) => handleChange('primary_phone', e.target.value)}
                            className="input input-bordered text-lg w-full"
                        />
                    </div>
                </div>
            </div>

            <div>
                <div className="flex flex-row items-center justify-between gap-4">
                    <h5 className="text-3xl">Secondary Contact</h5>
                    <label className="label gap-2">
                        <input
                            type="checkbox"
                            checked={school.secondary_student}
                            onChange={(e) => handleChange('secondary_student', e.target.checked)}
                            className="toggle toggle-primary"
                        />
                        Student Advisor
                    </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col">
                        <label className="label text-lg">Name</label>
                        <input
                            type="text"
                            value={school.secondary_name}
                            onChange={(e) => handleChange('secondary_name', e.target.value)}
                            className="input input-bordered text-lg w-full"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="label text-lg">Email</label>
                        <input
                            type="email"
                            value={school.secondary_email}
                            onChange={(e) => handleChange('secondary_email', e.target.value)}
                            className="input input-bordered text-lg w-full"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="label text-lg">Phone Number</label>
                        <input
                            type="text"
                            value={school.secondary_phone}
                            onChange={(e) => handleChange('secondary_phone', e.target.value)}
                            className="input input-bordered text-lg w-full"
                        />
                    </div>
                </div>
            </div>
            <button 
                className="btn btn-primary mt-4 text-lg"
                disabled={!canUpdate()}
                onClick={handleSubmission}
            >
                {loading ? <span className="loading loading-spinner"></span> : <></>}
                Update Profile
            </button>
        </fieldset>
    )
}

export default SchoolForm;
