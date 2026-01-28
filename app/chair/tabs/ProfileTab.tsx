import { useEffect, useState } from "react";
import {
    AssignmentProps,
    ChairInfo,
    ChairCommitteeInfo,
    getCommitteeForCurrentChair,
    getPositionPapersByIds,
    PositionPaperWithId,
    updateChairInfoForCurrentChair,
    Rubric,
    getRubricById,
    createRubric,
    updateRubric,
    updateCommitteeRubricId,
} from "@/app/utils/supabaseHelpers";
import { SINGLE_COMMITTEE } from "@/app/utils/generalHelper";

const COLOR_OPTIONS: { label: string; value: string }[] = [
    { label: "Blue", value: "#1D4ED8" },
    { label: "Sky", value: "#0EA5E9" },
    { label: "Teal", value: "#14B8A6" },
    { label: "Green", value: "#22C55E" },
    { label: "Amber", value: "#F59E0B" },
    { label: "Orange", value: "#F97316" },
    { label: "Red", value: "#EF4444" },
    { label: "Purple", value: "#8B5CF6" },
    { label: "Pink", value: "#EC4899" },
];

interface ProfileTabProps {
    chair: {
        first_name?: string;
        last_name?: string;
    };
    committeeName?: string;
    committeeShortName?: string;
    assignments: AssignmentProps[];
}

interface PaperStats {
    total: number;
    ungraded: number;
    loading: boolean;
}

function ProfileTab({ chair: _chair, committeeName, committeeShortName, assignments }: ProfileTabProps) {
    const isSpecialCommittee = committeeShortName ? SINGLE_COMMITTEE.includes(committeeShortName) : false;
    const [paperStats, setPaperStats] = useState<PaperStats>({
        total: 0,
        ungraded: 0,
        loading: true,
    });
    const [chairs, setChairs] = useState<ChairInfo[]>([]);
    const [loadingChairs, setLoadingChairs] = useState(true);
    const [savingChairs, setSavingChairs] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [papers, setPapers] = useState<PositionPaperWithId[]>([]);
    const [rubric, setRubric] = useState<Rubric | null>(null);
    const [loadingRubric, setLoadingRubric] = useState(true);
    const [savingRubric, setSavingRubric] = useState(false);
    const [rubricFeedback, setRubricFeedback] = useState<string | null>(null);
    const [committee, setCommittee] = useState<ChairCommitteeInfo | null>(null);
    const [openColorPickerIndex, setOpenColorPickerIndex] = useState<number | null>(null);

    // Load paper stats based on assignments
    useEffect(() => {
        (async () => {
            try {
                const assignmentsWithPaper = assignments.filter(a => a.paper_id);
                if (assignmentsWithPaper.length === 0) {
                    setPaperStats({ total: 0, ungraded: 0, loading: false });
                    setPapers([]);
                    return;
                }

                const paperIds = Array.from(
                    new Set(
                        assignmentsWithPaper
                            .map(a => a.paper_id)
                            .filter((id): id is number => typeof id === "number")
                    )
                );

                const papersData: PositionPaperWithId[] = await getPositionPapersByIds(paperIds);
                const total = papersData.length;
                const ungraded = papersData.filter(p => !p.graded).length;

                setPapers(papersData);
                setPaperStats({ total, ungraded, loading: false });
            } catch (e) {
                console.error("Error loading paper stats for chair profile:", e);
                setPaperStats({ total: 0, ungraded: 0, loading: false });
                setPapers([]);
            }
        })();
    }, [assignments, committee]);

    // Load existing chair_info and rubric for this committee
    useEffect(() => {
        (async () => {
            setLoadingChairs(true);
            setLoadingRubric(true);
            try {
                const committeeData: ChairCommitteeInfo | null = await getCommitteeForCurrentChair();
                setCommittee(committeeData);
                
                if (committeeData && Array.isArray(committeeData.chair_info)) {
                    // Ensure assignment_ids exists for each chair
                    const chairsWithAssignments = committeeData.chair_info.map(c => ({
                        ...c,
                        assignment_ids: c.assignment_ids || [],
                    }));
                    setChairs(chairsWithAssignments);
                } else {
                    setChairs([]);
                }

                // Load rubric if it exists
                if (committeeData?.rubric_id) {
                    const rubricData = await getRubricById(committeeData.rubric_id);
                    if (rubricData) {
                        // Ensure we have exactly 5 items for each topic
                        const topicOne = [...(rubricData.topic_one || [])];
                        const topicTwo = [...(rubricData.topic_two || [])];
                        while (topicOne.length < 5) {
                            topicOne.push({ name: '', value: 0 });
                        }
                        while (topicTwo.length < 5) {
                            topicTwo.push({ name: '', value: 0 });
                        }
                        setRubric({
                            ...rubricData,
                            topic_one: topicOne.slice(0, 5),
                            topic_two: topicTwo.slice(0, 5),
                            use_topic_2: !isSpecialCommittee, // Always sync with committee special status
                        });
                    } else {
                        // Initialize empty rubric if not found
                        setRubric({
                            topic_one: Array(5).fill(null).map(() => ({ name: '', value: 0 })),
                            topic_two: Array(5).fill(null).map(() => ({ name: '', value: 0 })),
                            use_topic_2: !isSpecialCommittee,
                        });
                    }
                } else {
                    // Initialize empty rubric
                    setRubric({
                        topic_one: Array(5).fill(null).map(() => ({ name: '', value: 0 })),
                        topic_two: Array(5).fill(null).map(() => ({ name: '', value: 0 })),
                        use_topic_2: !isSpecialCommittee,
                    });
                }
            } catch (e) {
                console.error("Error loading chair_info for chair profile:", e);
                setChairs([]);
            }
            setLoadingChairs(false);
            setLoadingRubric(false);
        })();
    }, [isSpecialCommittee]);

    function updateChairName(index: number, name: string) {
        setChairs(prev => prev.map((c, i) => (i === index ? { ...c, name } : c)));
    }

    function updateChairColor(index: number, color: string) {
        setChairs(prev => prev.map((c, i) => (i === index ? { ...c, color } : c)));
    }

    function addChair() {
        setChairs(prev => [
            ...prev,
            {
                name: "",
                color: COLOR_OPTIONS[0]?.value ?? "#1D4ED8",
            },
        ]);
    }

    function removeChair(index: number) {
        setChairs(prev => prev.filter((_, i) => i !== index));
    }

    async function handleSaveChairs() {
        setSavingChairs(true);
        setFeedback(null);
        try {
            const cleaned = chairs.filter(c => c.name.trim().length > 0);
            const ok = await updateChairInfoForCurrentChair(cleaned);
            if (!ok) {
                setFeedback("Failed to save chairs. Please try again.");
            } else {
                setFeedback("Chairs saved successfully.");
            }
        } catch (e) {
            console.error(e);
            setFeedback("Unexpected error while saving chairs.");
        }
        setSavingChairs(false);
        setTimeout(() => setFeedback(null), 4000);
    }

    function updateRubricItem(topic: 'topic_one' | 'topic_two', index: number, field: 'name' | 'value', value: string | number) {
        if (!rubric) return;
        const updated = { ...rubric };
        updated[topic] = [...updated[topic]];
        updated[topic][index] = {
            ...updated[topic][index],
            [field]: value,
        };
        setRubric(updated);
    }

    async function handleSaveRubric() {
        if (!rubric || !committee) return;

        setSavingRubric(true);
        setRubricFeedback(null);

        try {
            // Always set use_topic_2 based on whether committee is special
            // If committee is in SINGLE_COMMITTEE list, use_topic_2 should be false
            const rubricToSave = {
                ...rubric,
                use_topic_2: !isSpecialCommittee,
            };

            let rubricId = committee.rubric_id;

            if (rubricId) {
                // Update existing rubric
                const success = await updateRubric(rubricId, rubricToSave);
                if (!success) {
                    setRubricFeedback("Failed to update rubric. Please try again.");
                } else {
                    setRubricFeedback("Rubric saved successfully.");
                    // Update local state
                    setRubric(rubricToSave);
                }
            } else {
                // Create new rubric
                rubricId = await createRubric(rubricToSave);
                if (!rubricId) {
                    setRubricFeedback("Failed to create rubric. Please try again.");
                } else {
                    // Link rubric to committee
                    const linkSuccess = await updateCommitteeRubricId(committee.id, rubricId);
                    if (!linkSuccess) {
                        setRubricFeedback("Rubric created but failed to link to committee.");
                    } else {
                        setRubricFeedback("Rubric saved successfully.");
                        // Update local state
                        setRubric({ ...rubricToSave, id: rubricId });
                        setCommittee({ ...committee, rubric_id: rubricId });
                    }
                }
            }
        } catch (e) {
            console.error(e);
            setRubricFeedback("Unexpected error while saving rubric.");
        }

        setSavingRubric(false);
        setTimeout(() => setRubricFeedback(null), 4000);
    }

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Title card: committee + progress */}
            <div className="card bg-base-100 shadow-xl border-2 border-primary">
                <div className="card-body">
                    <div className="flex flex-row items-center gap-4 flex-wrap">
                        <h2
                            className="card-title text-3xl md:text-4xl flex-1 min-w-0"
                            style={{ fontFamily: "var(--font-roboto)" }}
                        >
                            {committeeShortName && committeeName ? (
                                <span className="truncate block">
                                    <span className="text-primary">{committeeShortName}</span>
                                    <span className="text-white">: {committeeName}</span>
                                </span>
                            ) : committeeName ? (
                                <span className="truncate block text-primary">{committeeName}</span>
                            ) : (
                                "Committee Overview"
                            )}
                        </h2>
                        {!paperStats.loading && paperStats.total > 0 && (
                            <div className="flex-1 min-w-[200px] max-w-md">
                                <div className="flex flex-row justify-between items-center mb-1">
                                    <span className="text-sm font-semibold">Progress</span>
                                    <span className="text-sm font-semibold">
                                        {Math.round(((paperStats.total - paperStats.ungraded) / paperStats.total) * 100)}%
                                    </span>
                                </div>
                                <progress 
                                    className="progress progress-primary w-full" 
                                    value={paperStats.total - paperStats.ungraded} 
                                    max={paperStats.total}
                                />
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex flex-row flex-wrap gap-4 items-center">
                        {paperStats.loading ? (
                            <>
                                <div className="h-8 bg-base-300 rounded w-24 animate-pulse"></div>
                                <div className="h-8 bg-base-300 rounded w-24 animate-pulse"></div>
                                <div className="h-8 bg-base-300 rounded w-32 animate-pulse"></div>
                            </>
                        ) : (
                            <>
                                <div className="badge badge-primary badge-lg gap-2">
                                    Total Papers
                                    <span className="font-bold">{paperStats.total}</span>
                                </div>
                                <div className="badge badge-lg gap-2 bg-gray-500 text-white">
                                    Ungraded
                                    <span className="font-bold">{paperStats.ungraded}</span>
                                </div>
                                {/* Chair chips with graded/assigned counts */}
                                {committee?.chair_info && Array.isArray(committee.chair_info) && committee.chair_info.length > 0 && (
                                    <div className="overflow-x-auto flex-1 min-w-0 scrollbar-hide" style={{ 
                                        scrollbarWidth: 'none', 
                                        msOverflowStyle: 'none',
                                    }}>
                                        <div className="flex flex-row gap-2 items-center min-w-max">
                                            {committee.chair_info.map((chair: ChairInfo, index: number) => {
                                                // Count papers assigned to this chair
                                                const assignedPaperIds = chair.assignment_ids || [];
                                                const assignedCount = assignedPaperIds.length;
                                                
                                                // Count how many of those papers are graded
                                                const gradedCount = papers.filter(p => 
                                                    p.id && assignedPaperIds.includes(p.id) && p.graded
                                                ).length;
                                                
                                                return (
                                                    <div
                                                        key={index}
                                                        className="badge badge-lg p-3 whitespace-nowrap"
                                                        style={{
                                                            backgroundColor: chair.color,
                                                            color: '#fff',
                                                        }}
                                                    >
                                                        <span className="font-semibold">{chair.name}</span>
                                                        <span className="ml-2 opacity-90">
                                                            ({gradedCount} / {assignedCount})
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Rubric editor */}
            <div className="card bg-base-100 shadow-xl border-2 border-primary">
                <div className="card-body">
                    <div className="flex flex-row justify-between items-end mb-4">
                        <h3
                            className="card-title text-3xl"
                            style={{ fontFamily: "var(--font-roboto)" }}
                        >
                            Rubric
                        </h3>
                        <div className="flex flex-row flex-wrap gap-3 items-center">
                            {rubricFeedback && (
                                <span className="text-sm opacity-80">
                                    {rubricFeedback}
                                </span>
                            )}
                            <button
                                type="button"
                                className="btn btn-primary btn-sm md:btn-md"
                                onClick={handleSaveRubric}
                                disabled={savingRubric || !committee}
                            >
                                {savingRubric && <span className="loading loading-spinner loading-xs mr-2" />}
                                Save Rubric
                            </button>
                        </div>
                    </div>
                    {loadingRubric ? (
                        <div className="flex items-center justify-center py-4">
                            <span className="loading loading-spinner loading-md" />
                        </div>
                    ) : rubric ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Topic 1 */}
                                <div className="space-y-4">
                                    <p className="text-xl font-semibold" style={{ fontFamily: "var(--font-roboto)" }}>Topic 1</p>
                                    {rubric.topic_one.map((item, index) => (
                                        <div key={index} className="flex flex-row gap-3 items-center">
                                            <input
                                                type="text"
                                                className="input input-lg input-bordered flex-[3] text-lg"
                                                placeholder={`Section ${index + 1} name`}
                                                value={item.name}
                                                onChange={(e) => updateRubricItem('topic_one', index, 'name', e.target.value)}
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                className="input input-lg input-bordered flex-1 text-lg"
                                                placeholder="Max"
                                                value={item.value || ''}
                                                onChange={(e) => updateRubricItem('topic_one', index, 'value', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Topic 2 */}
                                <div className={`space-y-4 ${isSpecialCommittee ? 'opacity-50' : ''}`}>
                                    <p className="text-xl font-semibold" style={{ fontFamily: "var(--font-roboto)" }}>Topic 2</p>
                                    {rubric.topic_two.map((item, index) => (
                                        <div key={index} className="flex flex-row gap-3 items-center">
                                            <input
                                                type="text"
                                                className="input input-lg input-bordered flex-[3] text-lg"
                                                placeholder={`Section ${index + 1} name`}
                                                value={item.name}
                                                onChange={(e) => updateRubricItem('topic_two', index, 'name', e.target.value)}
                                                disabled={isSpecialCommittee}
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                className="input input-lg input-bordered flex-1 text-lg"
                                                placeholder="Max"
                                                value={item.value || ''}
                                                onChange={(e) => updateRubricItem('topic_two', index, 'value', parseInt(e.target.value) || 0)}
                                                disabled={isSpecialCommittee}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm opacity-70">Failed to load rubric.</p>
                    )}
                </div>
            </div>

            {/* Chair form - split into two halves */}
            <div className="card bg-base-100 shadow-xl border-2 border-primary">
                <div className="card-body">
                    <div className="flex flex-row justify-between items-end mb-4">
                        <h3
                            className="card-title text-3xl"
                            style={{ fontFamily: "var(--font-roboto)" }}
                        >
                            Chairs
                        </h3>
                        <div className="flex flex-row flex-wrap gap-3 items-center">
                            {feedback && (
                                <span className="text-sm opacity-80">
                                    {feedback}
                                </span>
                            )}
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm md:btn-md"
                                onClick={addChair}
                                disabled={loadingChairs}
                            >
                                Add Chair
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary btn-sm md:btn-md"
                                onClick={handleSaveChairs}
                                disabled={loadingChairs || savingChairs}
                            >
                                {savingChairs && <span className="loading loading-spinner loading-xs mr-2" />}
                                Save Chairs
                            </button>
                        </div>
                    </div>
                        <div className="space-y-4">

                    {loadingChairs ? (
                        <div className="flex items-center justify-center py-4">
                            <span className="loading loading-spinner loading-md" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {chairs.length === 0 ? (
                                <div className="flex flex-row gap-3 items-stretch w-full">
                                    <input
                                        type="text"
                                        className="input input-lg md:input-xl flex-1"
                                        placeholder="Chair name"
                                        value=""
                                        onChange={e => {
                                            // When user starts typing, add the chair
                                            setChairs([{
                                                name: e.target.value,
                                                color: COLOR_OPTIONS[0]?.value ?? "#1D4ED8",
                                            }]);
                                        }}
                                    />
                                    <div className="relative">
                                        <button
                                            type="button"
                                            className="btn rounded-lg min-h-0 p-0 flex items-center justify-center border border-base-300 bg-base-100 hover:bg-base-200"
                                            style={{ 
                                                width: '56px', 
                                                height: '56px',
                                                borderColor: openColorPickerIndex === 0 
                                                    ? (COLOR_OPTIONS[0]?.value ?? "#1D4ED8")
                                                    : undefined
                                            }}
                                            onClick={() => setOpenColorPickerIndex(0)}
                                        >
                                            <div
                                                className="w-8 h-8 rounded-full"
                                                style={{ backgroundColor: COLOR_OPTIONS[0]?.value ?? "#1D4ED8" }}
                                            />
                                        </button>
                                        {openColorPickerIndex === 0 && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-40"
                                                    onClick={() => setOpenColorPickerIndex(null)}
                                                />
                                                <div className="absolute z-50 bottom-full mb-2 p-3 bg-base-100 border border-base-300 rounded-lg shadow-lg w-[180px]">
                                                    <div className="grid grid-cols-3 gap-3">
                                        {COLOR_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                className="w-12 h-12 rounded-full border-2 border-transparent hover:border-primary transition-all flex-shrink-0"
                                                style={{ backgroundColor: opt.value }}
                                                onClick={() => {
                                                    setChairs([{
                                                        name: "",
                                                        color: opt.value,
                                                    }]);
                                                    setOpenColorPickerIndex(null);
                                                }}
                                            />
                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-ghost min-h-0 p-0 flex items-center justify-center text-error font-bold"
                                        style={{ width: '56px', height: '56px', fontSize: '32px' }}
                                        disabled
                                    >
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {chairs.map((chairInfo, index) => (
                                <div
                                    key={index}
                                    className="flex flex-row gap-3 items-stretch w-full"
                                >
                                    <input
                                        type="text"
                                        className="input input-lg md:input-xl flex-1"
                                        placeholder="Chair name"
                                        value={chairInfo.name}
                                        onChange={e => updateChairName(index, e.target.value)}
                                    />
                                    <div className="relative">
                                        <button
                                            type="button"
                                            className="btn rounded-lg min-h-0 p-0 flex items-center justify-center border border-base-300 bg-base-100 hover:bg-base-200"
                                            style={{ 
                                                width: '56px', 
                                                height: '56px',
                                                borderColor: openColorPickerIndex === index 
                                                    ? chairInfo.color
                                                    : undefined
                                            }}
                                            onClick={() => setOpenColorPickerIndex(index)}
                                        >
                                            <div
                                                className="w-8 h-8 rounded-full"
                                                style={{ backgroundColor: chairInfo.color }}
                                            />
                                        </button>
                                        {openColorPickerIndex === index && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-40"
                                                    onClick={() => setOpenColorPickerIndex(null)}
                                                />
                                                <div className="absolute z-50 bottom-full mb-2 p-3 bg-base-100 border border-base-300 rounded-lg shadow-lg w-[180px]">
                                                    <div className="grid grid-cols-3 gap-3">
                                        {COLOR_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                className={`w-12 h-12 rounded-full border-2 flex-shrink-0 transition-all ${
                                                    chairInfo.color === opt.value
                                                        ? "border-primary"
                                                        : "border-transparent hover:border-primary"
                                                }`}
                                                style={{ backgroundColor: opt.value }}
                                                onClick={() => {
                                                    updateChairColor(index, opt.value);
                                                    setOpenColorPickerIndex(null);
                                                }}
                                            />
                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-ghost min-h-0 p-0 flex items-center justify-center text-error font-bold"
                                        style={{ width: '56px', height: '56px', fontSize: '32px' }}
                                        onClick={() => removeChair(index)}
                                    >
                                        ×
                                    </button>
                                </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfileTab;
