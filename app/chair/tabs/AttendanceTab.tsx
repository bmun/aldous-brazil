import { useEffect, useState } from "react";
import { AssignmentProps, DelegateProps } from "@/app/utils/supabaseHelpers";

interface AttendanceTabProps {
    committeeName?: string;
    delegates: DelegateProps[];
    assignments: AssignmentProps[];
}

interface AttendanceRow {
    id: string;
    country_name: string;
    first_name: string;
    last_name: string;
    email: string;
}

type AttendanceState = Record<string, boolean[]>; // key: email, value: 8-session attendance
type SortField = 'country' | 'delegate' | 'email' | null;
type SortDirection = 'asc' | 'desc';

function AttendanceTab({ committeeName: _committeeName, delegates, assignments }: AttendanceTabProps) {
    const [rows, setRows] = useState<AttendanceRow[]>([]);
    const [attendance, setAttendance] = useState<AttendanceState>({});
    const [sortField, setSortField] = useState<SortField>('country');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const sessionCount = 8;

    useEffect(() => {
        const builtRows: AttendanceRow[] = [];

        const assignmentsById = new Map<number, AssignmentProps>();
        assignments.forEach(a => {
            if (a.id != null) assignmentsById.set(a.id, a);
        });

        delegates.forEach(d => {
            if (d.assignment_id == null) return;
            const assignment = assignmentsById.get(d.assignment_id);
            if (!assignment) return;

            builtRows.push({
                id: `${assignment.id}-${d.email}`,
                country_name: assignment.country_name,
                first_name: d.first_name || "",
                last_name: d.last_name || "",
                email: d.email,
            });
        });

        setRows(builtRows);

        // Initialize attendance state (local only – not persisted yet)
        const initialAttendance: AttendanceState = {};
        builtRows.forEach(r => {
            initialAttendance[r.email] = new Array(sessionCount).fill(false);
        });
        setAttendance(initialAttendance);
    }, [delegates, assignments]);

    function toggleAttendance(email: string, sessionIndex: number) {
        setAttendance(prev => {
            const current = prev[email] || new Array(sessionCount).fill(false);
            const updated = [...current];
            updated[sessionIndex] = !updated[sessionIndex];
            return {
                ...prev,
                [email]: updated,
            };
        });
    }

    // Sort rows based on current sort field and direction
    const sortedRows = [...rows].sort((a, b) => {
        if (!sortField) return 0;
        
        let comparison = 0;
        switch (sortField) {
            case 'country':
                comparison = a.country_name.localeCompare(b.country_name);
                break;
            case 'delegate':
                const aName = `${a.last_name} ${a.first_name}`.trim().toLowerCase();
                const bName = `${b.last_name} ${b.first_name}`.trim().toLowerCase();
                comparison = aName.localeCompare(bName);
                break;
            case 'email':
                comparison = a.email.toLowerCase().localeCompare(b.email.toLowerCase());
                break;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    function handleSort(field: SortField) {
        if (sortField === field) {
            // Toggle direction if clicking the same field
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new field with ascending direction
            setSortField(field);
            setSortDirection('asc');
        }
    }

    function getSortIcon(field: SortField) {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? '↑' : '↓';
    }

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="overflow-scroll rounded-xl border-2 border-primary bg-base-100">
                <table className="table table-zebra text-base md:text-lg text-center">
                    <thead>
                        <tr className="text-sm md:text-base font-bold">
                            <th 
                                className="px-4 py-2 cursor-pointer hover:bg-base-200 select-none"
                                onClick={() => handleSort('country')}
                            >
                                Country {getSortIcon('country')}
                            </th>
                            <th 
                                className="px-4 py-2 cursor-pointer hover:bg-base-200 select-none"
                                onClick={() => handleSort('delegate')}
                            >
                                Delegate {getSortIcon('delegate')}
                            </th>
                            <th 
                                className="px-4 py-2 whitespace-nowrap cursor-pointer hover:bg-base-200 select-none"
                                onClick={() => handleSort('email')}
                            >
                                Email {getSortIcon('email')}
                            </th>
                            {Array.from({ length: sessionCount }).map((_, idx) => (
                                <th key={idx} className="px-4 py-2">
                                    Session {idx + 1}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={3 + sessionCount} className="py-6 text-center text-sm opacity-70">
                                    No delegates found for this committee.
                                </td>
                            </tr>
                        ) : (
                            sortedRows.map(row => (
                                <tr key={row.id} className="text-sm md:text-base">
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <span className="font-semibold text-primary">
                                            {row.country_name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <span className="font-semibold">
                                            {`${row.first_name} ${row.last_name}`.trim() || "Delegate"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <span className="text-sm md:text-base">{row.email}</span>
                                    </td>
                                    {Array.from({ length: sessionCount }).map((_, idx) => (
                                        <td key={idx} className="px-2 py-2">
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-sm md:checkbox-md"
                                                checked={attendance[row.email]?.[idx] || false}
                                                onChange={() => toggleAttendance(row.email, idx)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AttendanceTab;
