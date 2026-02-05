'use client';

import { useEffect, useRef, useState } from "react";
import CommitteeModal from "../modals/CommitteeModal";
import { CommitteeProps, getCommittees, ConferenceProps, uploadAssignments, AssignmentUploadProps, signUpChair, getChairsByCommitteeIds } from "../../utils/supabaseHelpers";
import ConferenceModal from "../modals/ConferenceModal";
import { defaultConferenceData } from "@/app/utils/generalHelper";

function AdminPanel() {
    const [creatingCommittee, setCreatingCommittee] = useState(false);
    const [creatingConference, setCreatingConference] = useState(false);

    const [committees, setCommittees] = useState<CommitteeProps[]>([]);

    const [formData, setFormData] = useState<ConferenceProps>(defaultConferenceData)

    const [assignments, setAssignments] = useState<AssignmentUploadProps[]>([]);

    const [chairEmails, setChairEmails] = useState<Record<number, string>>({});
    const [existingChairEmails, setExistingChairEmails] = useState<Record<number, string>>({});
    const [submittingCommitteeId, setSubmittingCommitteeId] = useState<number | null>(null);

    useEffect(() => {(async () => {
        try {
            const newCommittees = await getCommittees();
            setCommittees(newCommittees);
            
            // Fetch existing chair accounts for all committees
            const committeeIds = newCommittees
                .filter(c => c.id !== undefined)
                .map(c => c.id!);
            
            if (committeeIds.length > 0) {
                try {
                    const chairs = await getChairsByCommitteeIds(committeeIds);
                    setExistingChairEmails(chairs);
                } catch (error) {
                    console.error('Error fetching existing chair emails:', error);
                    setExistingChairEmails({});
                }
            }
        } catch (error) {
            console.error('Error loading committees:', error);
        }
    })()}, [])

    const inputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !file.name.endsWith('.csv')) return

        const text = await file.text()
        const lines = text.trim().split('\n')
        const headers = lines[0].split(',').map(h => h.trim())

        const parsed: AssignmentUploadProps[] = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim())
            const obj: Record<string, string> = {}
            headers.forEach((key, i) => {
                obj[key] = values[i]
            })

            // Explicitly extract the fields you expect
            return {
                school_name: obj['School'],
                country_name: obj['Country'],
                committee_name: obj['Committee'],
            }
        })

        // await uploadAssignments(parsed)
        setAssignments(parsed);

        // Optionally reset input
        // if (inputRef.current) inputRef.current.value = ''
    }

    const handleAssignmentSubmission = async () => {
        await uploadAssignments(assignments);
    }

    const handleCreateChairAccount = async (committee: CommitteeProps) => {
        if (!committee.id) {
            alert('Committee ID is missing');
            return;
        }

        const email = chairEmails[committee.id]?.trim();
        if (!email) {
            alert('Please enter an email address');
            return;
        }

        setSubmittingCommitteeId(committee.id);
        try {
            const result = await signUpChair(
                committee.name,
                committee.full_name,
                email,
                committee.id
            );

            if (result.success) {
                // Clear the email input for this committee
                setChairEmails(prev => {
                    const newEmails = { ...prev };
                    delete newEmails[committee.id!];
                    return newEmails;
                });
                // Update existing chair emails to show the newly created account
                setExistingChairEmails(prev => ({
                    ...prev,
                    [committee.id!]: email
                }));
                alert(`Account created successfully for ${email}`);
            } else {
                alert(`Failed to create account: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error creating chair account:', error);
            alert('An error occurred while creating the account');
        } finally {
            setSubmittingCommitteeId(null);
        }
    }

    return (
        <div>
            <CommitteeModal creatingCommittee={creatingCommittee} setCreatingCommittee={setCreatingCommittee} />
            <ConferenceModal creatingConference={creatingConference} setCreatingConference={setCreatingConference} formData={formData} setFormData={setFormData} />
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 h-full overflow-scroll">
                <div>
                    <h3 className="text-5xl">Actions</h3>
                    <div className="flex flex-col gap-4">
                        <div>
                            <h5 className="text-3xl text-primary">Upload Assignments</h5>
                            <p>
                                To upload assignments, download the google sheet as a csv and drop it into the following bin.
                                Then, hit confirm and wait for it to finish loading. 
                                <b> Do not refresh the page when you have uploaded it</b>.
                            </p>
                            <div className="flex flex-row gap-2 items-end">
                                <input
                                    type="file"
                                    accept=".csv"
                                    ref={inputRef}
                                    className="file-input file-input-secondary mt-2"
                                    onChange={handleFileChange}
                                />
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleAssignmentSubmission}
                                >
                                    Upload Assignments
                                </button>
                            </div>
                        </div>
                        <div>
                            <h5 className="text-3xl text-primary">Create Committees</h5>
                            <p>
                                Before creating committes please get the emails for them ready. Then, for each one, input the associated 
                                email, full title, and other relevant information.  
                            </p>
                            <button className="btn btn-secondary mt-2" onClick={() => setCreatingCommittee(true)}>Create Committee</button>
                        </div>
                        <div>
                            <h5 className="text-3xl text-primary">Create Conference</h5>
                            <p>
                                Here you can edit the conference that you have currently selected, or upload a new 
                                conference. Check your guide for a full explanation on the process
                            </p>
                            <button className="btn btn-secondary mt-2" onClick={() => setCreatingConference(true)}>Create Conference</button>
                        </div>
                    </div>
                </div>
                <div className="border border-base-300 rounded-3xl h-full overflow-auto">
                    <table className="table table-zebra text-lg overflow-auto">
                        <thead>
                        <tr>
                            <th>Name</th>
                            <th>Full Committee Name</th>
                            <th>Size</th>
                            <th>Special</th>
                            <th>Create Account</th>
                        </tr>
                        </thead>
                        <tbody>
                        {committees.map((committee: CommitteeProps, index) => (
                            <tr key={index}>
                            <td>{committee.name}</td>
                            <td>{committee.full_name}</td>
                            <td>{committee.delegation_size}</td>
                            <td>{committee.special ? "✅" : "❌"}</td>
                            <td>
                                {existingChairEmails[committee.id || 0] ? (
                                    <div className="text-sm text-success font-semibold">
                                        {existingChairEmails[committee.id || 0]}
                                    </div>
                                ) : (
                                    <div className="flex flex-row gap-2 items-center">
                                        <input
                                            type="email"
                                            placeholder="Enter email"
                                            className="input input-bordered input-sm w-48"
                                            value={chairEmails[committee.id || 0] || ''}
                                            onChange={(e) => {
                                                if (committee.id) {
                                                    setChairEmails(prev => ({
                                                        ...prev,
                                                        [committee.id!]: e.target.value
                                                    }));
                                                }
                                            }}
                                            disabled={submittingCommitteeId === committee.id}
                                        />
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleCreateChairAccount(committee)}
                                            disabled={submittingCommitteeId === committee.id || !committee.id}
                                        >
                                            {submittingCommitteeId === committee.id ? 'Creating...' : 'Submit'}
                                        </button>
                                    </div>
                                )}
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default AdminPanel;