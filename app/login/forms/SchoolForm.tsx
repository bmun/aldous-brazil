import { isValidEmail } from "@/app/utils/generalHelper";
import { SchoolProps } from "@/app/utils/supabaseHelpers";

interface SchoolFormProps {
    school: SchoolProps,
    setSchool: Function,
    submissionError: boolean
}

function SchoolForm({school, setSchool, submissionError}: SchoolFormProps) {
    return (
        <fieldset className="flex flex-col gap-4">
            <div className="flex flex-row justify-between">
                <h5 className="text-5xl">
                    School Information *
                </h5>
                {/*<label className="label text-lg">
                    <input 
                        type="checkbox" 
                        checked={school.international} 
                        className="toggle toggle-primary" 
                        onChange={(_) => setSchool(
                            {...school, international:!school.international}
                        )} />
                    International School
                </label>*/}
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                    <label className="label text-lg">
                        Name
                    </label>
                    <input 
                        type="text" 
                        className={`input input-lg w-full ${submissionError && school.name.length == 0 ? "input-error" : ""}`}
                        placeholder="Name"
                        value={school.name}
                        onChange={(e) => setSchool(
                            {...school, name:e.target.value}
                        )} />
                </div>
                <div className="flex flex-col">
                    <label className="label text-lg">
                        Address
                    </label>
                    <input 
                        type="text" 
                        className={`input input-lg w-full ${submissionError && school.address.length == 0 ? "input-error" : ""}`}
                        placeholder="Address"
                        value={school.address}
                        onChange={(e) => setSchool(
                            {...school, address:e.target.value}
                        )} />
                </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col">
                    <label className="label text-lg">
                        Country
                    </label>
                    <input 
                        type="text" 
                        className={`input input-lg w-full ${submissionError && school.country.length == 0 ? "input-error" : ""}`}
                        placeholder="Country"
                        value={school.international ? school.country : "United States"}
                        onChange={(e) => setSchool(
                            {...school, country:e.target.value}
                        )} />
                </div>
                <div className="flex flex-col">
                    <label className="label text-lg">
                        City
                    </label>
                    <input 
                        type="text" 
                        className={`input input-lg w-full ${submissionError && school.city.length == 0 ? "input-error" : ""}`}
                        placeholder="City"
                        value={school.city}
                        onChange={(e) => setSchool(
                            {...school, city:e.target.value}
                        )} />
                </div>
                <div className="flex flex-col">
                    <label className="label text-lg">
                        {school.international ? "State" : "State"}
                    </label>
                    <input 
                        type="text" 
                        className={`input input-lg w-full ${submissionError && school.state.length == 0 ? "input-error" : ""}`}
                        placeholder={school.international ? "State" : "State"}
                        value={school.state}
                        onChange={(e) => setSchool(
                            {...school, state:e.target.value}
                        )} />
                </div>
                <div className="flex flex-col">
                    <label className="label text-lg">
                        {school.international ? "Postal Code" : "Zip Code"}
                    </label>
                    <input 
                        type="text" 
                        className={`input input-lg w-full ${submissionError && school.zip_code.length == 0 ? "input-error" : ""}`}
                        placeholder={school.international ? "Postal Code" : "Zip Code"}
                        value={school.zip_code}
                        onChange={(e) => setSchool(
                            {...school, zip_code:e.target.value}
                        )} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {/*<div className="flex flex-col">
                    <label className="label text-lg">
                        {school.international ? "Postal Code" : "Zip Code"}
                    </label>
                    <input 
                        type="text" 
                        className={`input input-lg w-full ${submissionError && school.zip_code.length == 0 ? "input-error" : ""}`}
                        placeholder={school.international ? "Postal Code" : "Zip Code"}
                        value={school.zip_code}
                        onChange={(e) => setSchool(
                            {...school, zip_code:e.target.value}
                        )} />
                </div>*/}
                {/*<div className="flex flex-col w-full">
                    <label className="label text-lg">
                        Delegation Type
                    </label>
                    <select 
                        defaultValue="Delegation Type" 
                        className="select select-lg w-full"
                        onChange={(e) => setSchool(
                            {...school, delegation_type:e.target.value}
                        )}>
                        <option disabled={true}>Delegation Type</option>
                        <option>Class</option>
                        <option>Club</option>
                        <option>Individual</option>
                    </select>
                </div>*/}
                {/*<div className="flex flex-col w-full">
                    <label className="label text-lg">
                        Number of Times Attended
                    </label>
                    <input 
                        type="text" 
                        className="input input-lg w-full" 
                        placeholder=""
                        value={school.times_attended}
                        onChange={(e) => setSchool(
                            {...school, times_attended:parseInt(e.target.value.replace(/\D/g, '')) || 0}
                        )} />
                </div>*/}
            </div>
            <div className="flex flex-row gap-2 items-end justify-between">
                <h5 className="text-5xl">
                    Primary Advisor *
                </h5>
                <p className="mb-0.5">Must be 18 years or older</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col">
                    <label className="label text-lg">
                        Name (First Last)
                    </label>
                    <input 
                        type="text" 
                        className={`input input-lg w-full ${submissionError && school.primary_name.length == 0 ? "input-error" : ""}`}
                        placeholder="Name"
                        value={school.primary_name}
                        onChange={(e) => setSchool(
                            {...school, primary_name:e.target.value}
                        )} />
                </div>
                <div className="flex flex-col">
                    <label className="label text-lg">
                        Email
                    </label>
                    <input 
                        type="text" 
                        className={`input input-lg w-full ${(submissionError && school.primary_email.length == 0) || (!isValidEmail(school.primary_email) && school.primary_email.length > 0) ? "input-error" : ""}`}
                        placeholder="Email"
                        value={school.primary_email}
                        onChange={(e) => setSchool(
                            {...school, primary_email:e.target.value}
                        )} />
                </div>
                <div className="flex flex-col">
                    <label className="label text-lg">
                        Phone Number
                    </label>
                    <input 
                        type="text" 
                        className={`input input-lg w-full ${submissionError && school.primary_phone.length == 0 ? "input-error" : ""}`}
                        placeholder="XXX XXX XXXX"
                        value={school.primary_phone}
                        onChange={(e) => setSchool(
                            {...school, primary_phone:e.target.value.replace(/\D/g, '')}
                        )} />
                </div>
            </div>
            <div className="flex flex-row justify-between">
                <h5 className="text-5xl">
                    Secondary Advisor
                </h5>
                <label className="label text-lg">
                    <input 
                        type="checkbox" 
                        checked={school.secondary_student} 
                        className="toggle toggle-primary" 
                        onChange={(_) => setSchool(
                            {...school, secondary_student:!school.secondary_student}
                        )} />
                    Student Advisor
                </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col">
                    <label className="label text-lg">
                        Name (First Last)
                    </label>
                    <input 
                        type="text" 
                        className="input input-lg w-full" 
                        placeholder="Name"
                        value={school.secondary_name}
                        onChange={(e) => setSchool(
                            {...school, secondary_name:e.target.value}
                        )} />
                </div>
                <div className="flex flex-col">
                    <label className="label text-lg">
                        Email
                    </label>
                    <input 
                        type="email" 
                        className="input input-lg w-full" 
                        placeholder="Email"
                        value={school.secondary_email}
                        onChange={(e) => setSchool(
                            {...school, secondary_email:e.target.value}
                        )} />
                </div>
                <div className="flex flex-col">
                    <label className="label text-lg">
                        Phone Number
                    </label>
                    <input 
                        type="text" 
                        className="input input-lg w-full" 
                        placeholder="XXX XXX XXXX"
                        value={school.secondary_phone}
                        onChange={(e) => setSchool(
                            {...school, secondary_phone:e.target.value.replace(/\D/g, '')}
                        )} />
                </div>
            </div>
        </fieldset>
    )
}

export default SchoolForm;