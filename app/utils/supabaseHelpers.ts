import { supabase } from "@/supabaseClient";

export async function signUpAdvisor(first_name: string, last_name: string, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
    });
    if (error || data.user == null) {
        console.error(error);
        return error;
    }
    const { error: newError } = await supabase.from('Users')
        .insert({
            id: data.user.id, 
            user_type: "advisor",
            first_name: first_name,
            last_name: last_name,
            email: email
        });

    if (newError) {
        console.error(newError);
        return newError;
    }
    return data.user.id;
}

export interface DelegateProps {
    first_name: string,
    last_name: string,
    email: string,
    school_id: number,
    assignment_id: number | null
}

export async function signUpDelegate(first_name: string, last_name: string, email: string, assignment_id: number): Promise<{ success: boolean; error?: string }> {
    try {
        const password = Array.from(crypto.getRandomValues(new Uint8Array(10)))
            .map(n => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[n % 62])
            .join("");

        // Store the current admin session before signUp
        const originalSession = await supabase.auth.getSession().then(({ data }) => data.session);

        if (!originalSession) {
            return { success: false, error: 'No session found. Cannot safely continue.' };
        }

        // Get advisor info before signing up new user (since session will change)
        const advisor = await getSupabaseUser();
        if (!advisor || !advisor.school_id) {
            return { success: false, error: 'Advisor session not found' };
        }
        const advisorSchoolId = advisor.school_id;

        // Sign up the new user (this will sign you in as them)
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: password
        });

        if (signUpError || signUpData == null || signUpData.user == null) {
            console.error('Error creating user:', signUpError);
            return { success: false, error: signUpError?.message || 'Failed to create user account' };
        }

        // Small delay to ensure the new user session is fully established
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verify we're authenticated as the new user
        const currentUser = await supabase.auth.getUser();
        if (currentUser.data.user?.id !== signUpData.user.id) {
            console.error('Session mismatch - not authenticated as new user');
            // Try to restore advisor session and return error
            await supabase.auth.setSession({
                access_token: originalSession.access_token,
                refresh_token: originalSession.refresh_token,
            });
            return { success: false, error: 'Failed to establish new user session' };
        }

        // DEBUG: Log the delegate creation attempt with key parameters
        // This helps verify assignment_id, school_id, and email are correct before database insert
        console.log('Creating delegate with:', {
            user_id: signUpData.user.id,
            assignment_id: assignment_id,
            school_id: advisorSchoolId,
            email: email,
            current_session_user: currentUser.data.user?.id
        });

        // Insert user record while authenticated as the new user (to satisfy RLS policies)
        // Users can typically insert their own records
        // Note: We set assignment_id in Users table AND also add to delegate_ids array in Assignment table
        const { error: userInsertError, data: insertedUser } = await supabase.from('Users')
            .insert({
                id: signUpData.user.id, 
                user_type: "delegate",
                first_name: first_name,
                last_name: last_name,
                email: email,
                assignment_id: assignment_id,
                school_id: advisorSchoolId
            })
            .select();

        // Now restore the advisor session so we can continue with assignment updates
        const { error: restoreError } = await supabase.auth.setSession({
            access_token: originalSession.access_token,
            refresh_token: originalSession.refresh_token,
        });

        if (restoreError) {
            console.error('Failed to restore admin session:', restoreError.message);
            // If we can't restore, we might still be able to continue, but log the error
        }

        if (userInsertError) {
            // DEBUG: Log database insert errors to diagnose issues with user creation
            console.error('Error inserting user:', userInsertError);
            return { success: false, error: userInsertError.message || 'Failed to create user record' };
        }

        // DEBUG: Log successful delegate creation to confirm the user record was created
        // Verify assignment_id and other fields are set correctly in the database
        console.log('Delegate created successfully:', insertedUser);
        
        // Small delay to ensure user is fully created before sending email
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get the site URL - use production domain for password reset emails
        // Use environment variable if set, otherwise use production domain
        let redirectUrl: string;
        if (typeof window !== 'undefined') {
            // Check if we're in development (localhost) or production
            const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isDevelopment && process.env.NEXT_PUBLIC_SITE_URL) {
                redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`;
            } else {
                // Use production domain
                redirectUrl = 'https://aldous.bmun.org/reset-password';
            }
        } else {
            redirectUrl = process.env.NEXT_PUBLIC_SITE_URL 
                ? `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
                : 'https://aldous.bmun.org/reset-password';
        }
        
        // DEBUG: Log email sending attempt to track password reset email delivery
        // Shows the redirect URL being used (important for Supabase redirect URL whitelist)
        console.log('Sending password reset email to:', email, 'with redirect:', redirectUrl);
        
        // Send password reset email
        // Note: For newly created users, we need to use resetPasswordForEmail
        // The redirect URL must be in the allowed list in Supabase config
        const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
        });

        if (resetError) {
            // DEBUG: Log email errors with full details to diagnose email delivery issues
            // Check if redirect URL is whitelisted, email service is configured, etc.
            console.error('Error sending reset email:', resetError);
            console.error('Reset error details:', {
                message: resetError.message,
                status: resetError.status,
                email: email,
                redirectUrl: redirectUrl
            });
            // Still return success as user was created, but log the email error
            // In local dev, check Inbucket at http://localhost:54324 for emails
            return { success: true, error: `User created but failed to send reset email: ${resetError.message}. Check Inbucket at http://localhost:54324 for local emails.` };
        }

        // DEBUG: Confirm password reset email was sent successfully
        console.log('Password reset email sent successfully:', resetData);
        
        // Add the new delegate's email to the assignment's delegate_ids array (which stores emails)
        const addDelegateToAssignmentResult = await addDelegateToAssignment(assignment_id, email);
        if (!addDelegateToAssignmentResult.success) {
            console.error('Failed to add delegate to assignment:', addDelegateToAssignmentResult.error);
            // Still return success as user was created, but log the error
            return { success: true, error: `User created but failed to update assignment: ${addDelegateToAssignmentResult.error}` };
        }
        
        // Small delay to ensure the database update is fully committed
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log(`Successfully created delegate and added to assignment ${assignment_id}`);
        return { success: true };
    } catch (error: any) {
        console.error('Unexpected error in signUpDelegate:', error);
        return { success: false, error: error?.message || 'An unexpected error occurred' };
    }
}

/** Maximum delegate accounts per school. */
export const MAX_DELEGATES_PER_SCHOOL = 50;

/**
 * Create a delegate account (no assignment). Sends password reset email.
 * Fails if school already has MAX_DELEGATES_PER_SCHOOL delegates.
 */
export async function createDelegateAccount(
    first_name: string,
    last_name: string,
    email: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const advisor = await getSupabaseUser();
        if (!advisor || advisor.user_type !== "advisor" || !advisor.school_id) {
            return { success: false, error: "Not authorized" };
        }
        const advisorSchoolId = advisor.school_id;

        const existing = await getDelegatesAsAdvisor();
        if (existing.length >= MAX_DELEGATES_PER_SCHOOL) {
            return { success: false, error: `Maximum ${MAX_DELEGATES_PER_SCHOOL} delegates per school. You have ${existing.length}.` };
        }

        const password = Array.from(crypto.getRandomValues(new Uint8Array(10)))
            .map(n => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[n % 62])
            .join("");

        const originalSession = await supabase.auth.getSession().then(({ data }) => data.session);
        if (!originalSession) {
            return { success: false, error: "No session found." };
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });
        if (signUpError || !signUpData?.user) {
            return { success: false, error: signUpError?.message || "Failed to create account" };
        }

        await new Promise(resolve => setTimeout(resolve, 200));
        const currentUser = await supabase.auth.getUser();
        if (currentUser.data.user?.id !== signUpData.user.id) {
            await supabase.auth.setSession({
                access_token: originalSession.access_token,
                refresh_token: originalSession.refresh_token,
            });
            return { success: false, error: "Failed to establish new user session" };
        }

        const { error: userInsertError } = await supabase.from("Users").insert({
            id: signUpData.user.id,
            user_type: "delegate",
            first_name,
            last_name,
            email,
            assignment_id: null,
            school_id: advisorSchoolId,
        });

        const { error: restoreError } = await supabase.auth.setSession({
            access_token: originalSession.access_token,
            refresh_token: originalSession.refresh_token,
        });
        if (restoreError) console.error("Failed to restore advisor session:", restoreError);

        if (userInsertError) {
            return { success: false, error: userInsertError.message || "Failed to create user record" };
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        let redirectUrl: string;
        if (typeof window !== "undefined") {
            const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
            redirectUrl = isDev && process.env.NEXT_PUBLIC_SITE_URL
                ? `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
                : "https://aldous.bmun.org/reset-password";
        } else {
            redirectUrl = process.env.NEXT_PUBLIC_SITE_URL
                ? `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
                : "https://aldous.bmun.org/reset-password";
        }
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
        if (resetError) {
            return { success: true, error: `Account created but reset email failed: ${resetError.message}` };
        }
        return { success: true };
    } catch (error: any) {
        console.error("Unexpected error in createDelegateAccount:", error);
        return { success: false, error: error?.message || "An unexpected error occurred" };
    }
}

export async function signUpChair(
    first_name: string, 
    last_name: string, 
    email: string, 
    committee_id: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const password = "bmunlove1952!";

        // Store the current admin session before signUp
        const originalSession = await supabase.auth.getSession().then(({ data }) => data.session);

        if (!originalSession) {
            return { success: false, error: 'No session found. Cannot safely continue.' };
        }

        // Sign up the new user (this will sign you in as them)
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: password
        });

        if (signUpError || signUpData == null || signUpData.user == null) {
            console.error('Error creating user:', signUpError);
            return { success: false, error: signUpError?.message || 'Failed to create user account' };
        }

        // Small delay to ensure the new user session is fully established
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verify we're authenticated as the new user
        const currentUser = await supabase.auth.getUser();
        if (currentUser.data.user?.id !== signUpData.user.id) {
            console.error('Session mismatch - not authenticated as new user');
            // Try to restore admin session and return error
            await supabase.auth.setSession({
                access_token: originalSession.access_token,
                refresh_token: originalSession.refresh_token,
            });
            return { success: false, error: 'Failed to establish new user session' };
        }

        // Insert user record while authenticated as the new user (to satisfy RLS policies)
        const { error: userInsertError, data: insertedUser } = await supabase.from('Users')
            .insert({
                id: signUpData.user.id, 
                user_type: "chair",
                first_name: first_name,
                last_name: last_name,
                email: email,
                committee_id: committee_id
            })
            .select();

        // Now restore the admin session
        const { error: restoreError } = await supabase.auth.setSession({
            access_token: originalSession.access_token,
            refresh_token: originalSession.refresh_token,
        });

        if (restoreError) {
            console.error('Failed to restore admin session:', restoreError.message);
        }

        if (userInsertError) {
            console.error('Error inserting user:', userInsertError);
            return { success: false, error: userInsertError.message || 'Failed to create user record' };
        }

        console.log('Chair created successfully:', insertedUser);
        
        // Small delay to ensure user is fully created before sending email
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get the site URL - use production domain for password reset emails
        let redirectUrl: string;
        if (typeof window !== 'undefined') {
            const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isDevelopment && process.env.NEXT_PUBLIC_SITE_URL) {
                redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`;
            } else {
                redirectUrl = 'https://aldous.bmun.org/reset-password';
            }
        } else {
            redirectUrl = process.env.NEXT_PUBLIC_SITE_URL 
                ? `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
                : 'https://aldous.bmun.org/reset-password';
        }
        
        // Send password reset email
        const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
        });

        if (resetError) {
            console.error('Error sending reset email:', resetError);
            return { success: true, error: `User created but failed to send reset email: ${resetError.message}. Check Inbucket at http://localhost:54324 for local emails.` };
        }

        console.log('Password reset email sent successfully:', resetData);
        console.log(`Successfully created chair for committee ${committee_id}`);
        return { success: true };
    } catch (error: any) {
        console.error('Unexpected error in signUpChair:', error);
        return { success: false, error: error?.message || 'An unexpected error occurred' };
    }
}

export interface SchoolProps {
    id: number,
    name: string,
    address: string,
    city: string,
    state: string,
    zip_code: string,
    country: string,
    primary_name: string,
    primary_email: string,
    primary_phone: string,
    times_attended: number,
    international: boolean,
    secondary_name: string,
    secondary_email: string,
    secondary_phone: string,
    primary_student: boolean,
    secondary_student: boolean,
    delegation_type: string,
    country_preferences?: string[]
}

export async function createSchool(schoolProps: SchoolProps) {
    const array = new Int32Array(1);
    crypto.getRandomValues(array);
    const schoolId = array[0];

    schoolProps.id = schoolId;
    const { error } = await supabase.from('School')
        .insert(schoolProps)

    if (error) {
        return error;
    }

    return schoolId;
}

export async function linkSchool(userId: string, schoolId: number) {
    const { error } = await supabase.from('Users')
        .update({ school_id: schoolId })
        .eq('id', userId);

    if (error) {
        console.error(error);
        return error;
    }

    return true;
}

export async function getSchool() {
    const user = await getSupabaseUser();

    if (user == null || user.user_type != 'advisor' && user.user_type != 'delegate') {
        console.error("Only advisors can register");
        return;
    }

    const {data, error} = await supabase.from('School')
        .select()
        .eq("id", user.school_id)
        .single();

    if (error) {
        console.error(error);
        return error;
    }

    return data;
}

export async function updateSchool(schoolProps: SchoolProps) {
    const user = await getSupabaseUser();

    if (user.school_id == null) {
        // If the school wasn't created properly, configure a new id and link the school
        const array = new Int32Array(1);
        crypto.getRandomValues(array);
        const schoolId = array[0]
        // Upset School
        const { error } = await supabase.from('School')
            .upsert({...schoolProps, "id": schoolId});
        
        if (error) {
            console.error(error);
            return false;
        }

        // Update User
        const { error: userError } = await supabase.from('Users')
            .update({ school_id: schoolId })
            .eq('id', user.id);

        if (userError) {
            console.error(userError);
            return false;
        }

        return true;
    }

    const { error } = await supabase.from('School')
        .upsert({...schoolProps, "id": user.school_id})

    if (error) {
        return false;
    }

    return true;
}

export async function loginUser(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        console.error(error);
        return null;
    } 

    return data.user;
}

export async function logoutUser() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error(error);
    }
}

export async function getUser() {
    const response = await supabase.auth.getUser();
    if (response.data.user == null) {
        console.error("User not signed in.");
        return null;
    }
    return response.data.user;
}

export async function getSupabaseUser() {
    const response = await supabase.auth.getUser();

    if (response.data.user == null) {
        return null;
    }

    const { data, error } = await supabase.from('Users')
        .select()
        .eq('id', response.data.user.id)
        .single();

    if (error) {
        return null;
    }

    return data;
}

export interface CommitteeProps {
    id?: number,
    name: string,
    full_name: string,
    delegation_size: number,
    special: boolean,
}

export interface ChairInfo {
    name: string;
    color: string;
    assignment_ids?: number[]; // Array of paper IDs assigned to this chair
}

export interface ChairCommitteeInfo {
    id: number;
    name: string;
    full_name: string;
    chair_info: ChairInfo[] | null;
    special?: boolean;
    rubric_id?: number | null;
}

export interface RubricItem {
    name: string;
    value: number;
}

export interface Rubric {
    id?: number;
    topic_one: RubricItem[];
    topic_two: RubricItem[];
    use_topic_2: boolean;
}

export async function createCommittee(committeeStruct: CommitteeProps) {
    const { error } = await supabase.from('Committee')
        .insert(committeeStruct);

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}

export async function getCommitteeForCurrentChair(): Promise<ChairCommitteeInfo | null> {
    const user = await getSupabaseUser();

    if (!user || user.user_type !== "chair" || !user.committee_id) {
        return null;
    }

    try {
        const { data, error } = await supabase
            .from("Committee")
            .select("id, name, full_name, chair_info, special, rubric_id")
            .eq("id", user.committee_id)
            .maybeSingle();

        if (error) {
            console.error("Error fetching committee for chair:", error);
            return null;
        }

        if (!data) {
            // No row found - this is not an error, just no committee assigned
            console.log("No committee found for chair with committee_id:", user.committee_id);
            return null;
        }

        // If chair_info is missing or null in the row, normalize it to null in the return type
        const row = data as any;
        return {
            id: row.id,
            name: row.name,
            full_name: row.full_name,
            chair_info: Array.isArray(row.chair_info) ? row.chair_info : null,
            special: row.special || false,
            rubric_id: row.rubric_id || null,
        } as ChairCommitteeInfo;
    } catch (e) {
        console.error("Unexpected error fetching committee for chair:", e);
        return null;
    }
}

export async function updateChairInfoForCurrentChair(chairs: ChairInfo[]): Promise<boolean> {
    const user = await getSupabaseUser();

    if (!user || user.user_type !== "chair" || !user.committee_id) {
        return false;
    }

    const { error } = await supabase
        .from("Committee")
        .update({ chair_info: chairs })
        .eq("id", user.committee_id);

    if (error) {
        console.error("Error updating chair_info for chair committee:", error);
        return false;
    }

    return true;
}

export async function assignPaperToChair(paperId: number, chairIndex: number | null): Promise<boolean> {
    const user = await getSupabaseUser();

    if (!user || user.user_type !== "chair" || !user.committee_id) {
        return false;
    }

    // Get current committee with chair_info
    const { data: committee, error: fetchError } = await supabase
        .from("Committee")
        .select("chair_info")
        .eq("id", user.committee_id)
        .maybeSingle();

    if (fetchError || !committee) {
        console.error("Error fetching committee for paper assignment:", fetchError);
        return false;
    }

    const chairs: ChairInfo[] = Array.isArray(committee.chair_info) ? committee.chair_info : [];

    // Remove paperId from all chairs first
    const updatedChairs = chairs.map(c => ({
        ...c,
        assignment_ids: (c.assignment_ids || []).filter(id => id !== paperId),
    }));

    // Add paperId to the selected chair (if not null)
    if (chairIndex !== null && chairIndex >= 0 && chairIndex < updatedChairs.length) {
        updatedChairs[chairIndex] = {
            ...updatedChairs[chairIndex],
            assignment_ids: [...(updatedChairs[chairIndex].assignment_ids || []), paperId],
        };
    }

    // Update the committee
    const { error: updateError } = await supabase
        .from("Committee")
        .update({ chair_info: updatedChairs })
        .eq("id", user.committee_id);

    if (updateError) {
        console.error("Error updating chair assignment:", updateError);
        return false;
    }

    return true;
}

export async function getCommittees() {
    const {data, error } = await supabase.from('Committee')
        .select();

    if (error) {
        console.error(error);
        return [];
    }

    return data;
}

export async function getChairByCommitteeId(committee_id: number) {
    const {data, error} = await supabase.from('Users')
        .select('email, first_name, last_name')
        .eq('user_type', 'chair')
        .eq('committee_id', committee_id)
        .maybeSingle();

    if (error) {
        console.error(error);
        return null;
    }

    console.log(data);

    return data;
}

export async function getChairsByCommitteeIds(committee_ids: number[]): Promise<Record<number, string>> {
    if (committee_ids.length === 0) {
        return {};
    }

    try {
        // Query committees individually to avoid PostgreSQL stack depth issues
        // This is slower but more reliable
        const chairMap: Record<number, string> = {};
        
        // Process in batches of 5 to balance performance and stack depth
        const batchSize = 5;
        for (let i = 0; i < committee_ids.length; i += batchSize) {
            const batch = committee_ids.slice(i, i + batchSize);
            
            // Query each committee individually to avoid stack depth
            for (const committeeId of batch) {
                const {data, error} = await supabase.from('Users')
                    .select('email')
                    .eq('user_type', 'chair')
                    .eq('committee_id', committeeId)
                    .maybeSingle();

                if (!error && data && data.email) {
                    chairMap[committeeId] = data.email;
                }
            }
        }

        return chairMap;
    } catch (err) {
        console.error('Unexpected error in getChairsByCommitteeIds:', err);
        return {};
    }
}

export interface ConferenceProps {
    session: number,
    start_date: string,
    end_date: string,
    reg_open: string,
    round_one_end: string,
    round_one_fees_due: string,
    round_two_end: string,
    round_two_fees_due: string,
    round_three_end: string,
    round_three_fees_due: string,
    round_four_fees_due: string,
    part_refund_deadline: string,
    reg_close: string,
    min_attendance: number,
    max_attendance: number,
    open_reg: boolean,
    waitlist_reg: boolean,
    position_papers_accepted: boolean,
    advisor_edit_deadline: string,
    early_paper_deadline: string,
    paper_deadline: string,
    waiver_avail_date: string,
    waiver_deadline: string,
    waiver_link: string,
    external: string,
    treasurer: string,
    reg_fee: number,
    del_fee: number,
    current_conference: boolean
}

export async function createOrUpdateConference(conferenceStruct: ConferenceProps) {
    const {data:_, error} = await supabase.from("Conference")
        .upsert(conferenceStruct, 
            {onConflict: "session"}
        );
    
    if (error) {
        console.error(error);
        return false;
    }

    return true;
}

export async function getConferences() {
    const {data, error} = await supabase.from('Conference')
        .select();

    if (error) {
        console.error(error);
        return [];
    }

    return data;
}

export async function getCurrentConference() {
    const {data, error} = await supabase.from('Conference')
        .select()
        .eq("current_conference", true)
        .single()

    if (error) {
        console.error(error);
        return error;
    }

    return data;
}

export const currentConference = await getCurrentConference();

export interface RegistrationProps {
    id?: number,
    num_beginner_delegates: number,
    num_intermediate_delegates: number,
    num_advanced_delegates: number,
    num_spanish_speaking_delegates: number,
    num_chinese_speaking_delegates: number,
    delegate_fees_paid: number,
    registration_fee_paid: boolean,
    is_waitlisted: boolean,
    committee_preferences?: string[]
}

export async function getRegistration() {
    const user = await getSupabaseUser();

    if (user == null || user.user_type != 'advisor') {
        console.error("Only advisors can register");
        return;
    }

    const {data, error} = await supabase.from('Registration')
        .select()
        .eq("school_id", user.school_id)
        .single()

    if (error) {
        return;
    }

    return data;
}

export async function createRegistration(registrationStruct: RegistrationProps) {
    const user = await getSupabaseUser();

    if (user == null || user.user_type != 'advisor') {
        console.error("Only advisors can register");
        return;
    }

    const conference = await getCurrentConference();
    const totalDels = registrationStruct.num_beginner_delegates + registrationStruct.num_intermediate_delegates + registrationStruct.num_advanced_delegates;  
    const delFeesOwed = conference.del_fee * totalDels

    const {data:_, error} = await supabase.from('Registration')
        .insert({
            ...registrationStruct,
            "school_id": user.school_id,
            "conference_id": conference.session,
            "delegate_fees_owed": delFeesOwed
        })

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}

export async function updateRegistration(regData: RegistrationProps) {
  const user = await getSupabaseUser();

  if (!user || user.user_type !== "advisor") {
    console.error("Only advisors can register");
    return { error: "Only advisors can register." };
  }

  // Upsert the registration
  const { data, error } = await supabase
    .from("Registration")
    .upsert({
      ...regData,
      id: regData.id
    })
    .select();

  if (error) {
    console.error("Error upserting registration:", error.message);
    return { error: error.message };
  }

  console.log("Registration upserted:", data);
  return { data };
}

export interface AssignmentProps {
    id?: number,
    committee_id: number,
    committee_name: string,
    country_name: string,
    registration_id: number,
    rejected: boolean,
    delegate_ids?: string[] // Array of delegate emails assigned to this assignment
    paper_id?: number | null // ID of the position paper associated with this assignment
}

export interface DelegateAssignmentInfo {
    id: number;
    committee_name: string;
    country_name: string;
}

export async function createAssignment(assignmentValues: AssignmentProps) {
    const {data:_, error} = await supabase.from('Assignment')
        .insert(assignmentValues);

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}

export async function getAssignmentForCurrentDelegate(): Promise<DelegateAssignmentInfo | null> {
    const user = await getSupabaseUser();

    if (!user || !user.assignment_id) {
        return null;
    }

    const { data, error } = await supabase
        .from('Assignment')
        .select('id, committee_name, country_name')
        .eq('id', user.assignment_id)
        .maybeSingle();

    if (error || !data) {
        console.error('Error fetching assignment for delegate:', error);
        return null;
    }

    return data as DelegateAssignmentInfo;
}

// ─────────────────────────────────────────────────────────────
// Chair helpers
// ─────────────────────────────────────────────────────────────

// Lightweight delegate info for chair views (attendance, papers)
export interface ChairDelegateInfo {
    first_name: string | null;
    last_name: string | null;
    email: string;
    assignment_id: number | null;
}

export async function getAssignmentsForCurrentChair(): Promise<AssignmentProps[]> {
    const user = await getSupabaseUser();

    if (!user || user.user_type !== 'chair' || !user.committee_id) {
        return [];
    }

    const { data, error } = await supabase
        .from('Assignment')
        .select('*')
        .eq('committee_id', user.committee_id);

    if (error || !data) {
        console.error('Error fetching assignments for chair:', error);
        return [];
    }

    return data as AssignmentProps[];
}

export async function getDelegatesByEmails(emails: string[]): Promise<ChairDelegateInfo[]> {
    if (!emails || emails.length === 0) {
        return [];
    }

    const { data, error } = await supabase
        .from('Users')
        .select('first_name, last_name, email, assignment_id, user_type')
        .in('email', emails);

    if (error || !data) {
        console.error('Error fetching delegates by emails:', error);
        return [];
    }

    // Only keep delegates
    const delegates = data.filter((u: any) => u.user_type === 'delegate');

    return delegates.map((u: any) => ({
        first_name: u.first_name ?? null,
        last_name: u.last_name ?? null,
        email: u.email,
        assignment_id: u.assignment_id ?? null,
    })) as ChairDelegateInfo[];
}

export async function getDelegatesForCurrentChairSchool(): Promise<DelegateProps[]> {
    const user = await getSupabaseUser();

    if (!user || user.user_type !== 'chair' || !user.school_id) {
        return [];
    }

    const { data, error } = await supabase
        .from('Users')
        .select('*')
        .eq('user_type', 'delegate')
        .eq('school_id', user.school_id);

    if (error || !data) {
        console.error('Error fetching delegates for chair school:', error);
        return [];
    }

    return data as DelegateProps[];
}

export async function getAssignmentsByIds(assignmentIds: number[]): Promise<AssignmentProps[]> {
    if (!assignmentIds || assignmentIds.length === 0) {
        return [];
    }

    const { data, error } = await supabase
        .from('Assignment')
        .select('*')
        .in('id', assignmentIds);

    if (error || !data) {
        console.error('Error fetching assignments by IDs:', error);
        return [];
    }

    return data as AssignmentProps[];
}

export async function getUsersFromAssignment(assignmentId: number) {
    const {data, error} = await supabase.from('Users')
        .select('*')
        .eq('assignment_id', assignmentId);
    
    if (error || data == null) {
        console.error(error);
        return;
    }

    return data;
}

export async function getDelegatesAsAdvisor() {
    const user = await getSupabaseUser();

    if (!user || user.user_type != 'advisor') {
        console.error('Not an advisor, no delegates to fetch.');
        return [];
    }

    // DEBUG: Log the query parameters to verify we're filtering correctly
    console.log(`Fetching delegates for advisor - school_id: ${user.school_id}`);

    const {data, error} = await supabase.from('Users')
        .select('*')
        .eq('user_type', 'delegate')
        .eq('school_id', user.school_id);
    console.log(data);
    
    if (error) {
        // DEBUG: Log database query errors to diagnose fetch issues
        console.error('Error fetching delegates:', error);
        return [];
    }

    // DEBUG: Log the raw database results to see what assignment_id values exist
    console.log(`Fetched ${data?.length || 0} delegates from database`);
    if (data && data.length > 0) {
        console.log('Database query results (raw assignment_id values):', 
            data.map(d => ({
                name: `${d.first_name} ${d.last_name}`,
                assignment_id: d.assignment_id,
                assignment_id_type: typeof d.assignment_id
            }))
        );
    }

    return data || [];
}

/**
 * Delegates from the current advisor's school who have no assignment (assignment_id is null).
 * Used to fill empty slots by assigning an existing delegate instead of creating a new one.
 */
export async function getUnassignedDelegatesForAdvisor(): Promise<ChairDelegateInfo[]> {
    const user = await getSupabaseUser();
    if (!user || user.user_type !== "advisor" || !user.school_id) return [];

    const { data, error } = await supabase
        .from("Users")
        .select("first_name, last_name, email, assignment_id, user_type")
        .eq("user_type", "delegate")
        .eq("school_id", user.school_id)
        .is("assignment_id", null);

    if (error || !data) return [];
    return data.map((u: any) => ({
        first_name: u.first_name ?? null,
        last_name: u.last_name ?? null,
        email: u.email,
        assignment_id: null,
    })) as ChairDelegateInfo[];
}

export async function getDelegatesByIds(userIds: string[]): Promise<DelegateProps[]> {
    if (!userIds || userIds.length === 0) {
        return [];
    }
    
    const {data, error} = await supabase.from('Users')
        .select('*')
        .in('id', userIds)
        .eq('user_type', 'delegate');
    
    if (error) {
        console.error('Error fetching delegates by IDs:', error);
        return [];
    }

    return (data || []) as DelegateProps[];
}

export interface AssignmentUploadProps {
    school_name: string,
    country_name: string,
    committee_name: string
}

async function getRegBySchool(school_name: string) {
    const { data: schoolData, error: schoolError } = await supabase
        .from('School')
        .select('id')
        .eq('name', school_name)
        .maybeSingle();

    if (schoolError || !schoolData) {
        console.error(schoolError)
        return null;
    }

    console.log(schoolData.id);

    const school_id = schoolData.id

    const { data: regData, error: regError } = await supabase
        .from('Registration')
        .select('id')
        .eq('school_id', school_id)
        .maybeSingle();

    if (regError || !regData) {
        console.error(regError)
        return null;
    }

    console.log(regData.id);

    return regData.id;
}

async function getCommitteeByName(committee_name: string) {
    const {data, error} = await supabase.from("Committee")
        .select('id')
        .eq('name', committee_name)
        .single();

    if (error) {
        console.error(error);
        return null;
    }
    
    return data.id;
}

export async function uploadAssignments(newAssignments: AssignmentUploadProps[]) {
    for (const assignment of newAssignments) {
        console.log(assignment.school_name);
        const registration_id = await getRegBySchool(assignment.school_name);
        const committee_id = await getCommitteeByName(assignment.committee_name);
        if (registration_id == null) {
            console.error("Registration does not exist");
            alert(`Failed attempting to upload assignment ${assignment.committee_name}. All before listed assignment succeeded`);
        }
        if (committee_id == null) {
            console.error("Committee does not exist");
            console.error(assignment.committee_name);
        }
        if (registration_id == null || committee_id == null) {
            alert(`Failed attempting to upload assignment ${assignment.committee_name}. All before listed assignment succeeded`);
            return false;
        }
        const success = await createAssignment({
            committee_id: parseInt(committee_id),
            committee_name: assignment.committee_name,
            registration_id: parseInt(registration_id),
            country_name: assignment.country_name,
            rejected: false,
            /*id: Math.floor(Math.random() * 2_147_483_648)*/
        });
        if (!success) {
            return false;
        }
    }
}

export async function loadAssignments() {
    const registration = await getRegistration();

    if (registration == null) {
        return null;
    } 

    const {data, error} = await supabase.from("Assignment")
        .select("*")
        .eq('registration_id', registration.id);

    if (error) {
        console.error(error);
        return null;
    }

    return data;
}

export async function updateAssignment(newAssignment: AssignmentProps) {
    const { error } = await supabase.from("Assignment")
        .upsert(newAssignment);

    if (error) {
        console.error("Failed to reject assignment");
        return false;
    }

    return true;
}

export async function addDelegateToAssignment(assignmentId: number, delegateEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Get the current assignment to retrieve existing delegate_ids (emails)
        const { data: assignment, error: fetchError } = await supabase
            .from("Assignment")
            .select("delegate_ids")
            .eq("id", assignmentId)
            .single();

        if (fetchError || !assignment) {
            console.error("Error fetching assignment:", fetchError);
            return { success: false, error: fetchError?.message || "Assignment not found" };
        }

        // Get existing delegate_ids array (emails) or initialize as empty array
        const currentDelegateEmails: string[] = assignment.delegate_ids || [];

        // Check if delegate email is already in the list (avoid duplicates)
        if (currentDelegateEmails.includes(delegateEmail)) {
            return { success: true };
        }

        // Add the new delegate email to the array
        const updatedDelegateEmails = [...currentDelegateEmails, delegateEmail];

        // Update the assignment with the new delegate_ids array (emails)
        const { error: updateError } = await supabase
            .from("Assignment")
            .update({ delegate_ids: updatedDelegateEmails })
            .eq("id", assignmentId);

        if (updateError) {
            console.error("Error updating assignment delegate_ids:", updateError);
            return { success: false, error: updateError.message || "Failed to update assignment" };
        }

        return { success: true };
    } catch (error: any) {
        console.error("Unexpected error in addDelegateToAssignment:", error);
        return { success: false, error: error?.message || "An unexpected error occurred" };
    }
}

/**
 * Remove a delegate from an assignment. Updates Assignment.delegate_ids and sets
 * the delegate's Users.assignment_id to null so their account reflects no assignment.
 */
export async function removeDelegateFromAssignment(
    assignmentId: number,
    delegateEmail: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: assignment, error: fetchError } = await supabase
            .from("Assignment")
            .select("delegate_ids")
            .eq("id", assignmentId)
            .single();

        if (fetchError || !assignment) {
            return { success: false, error: fetchError?.message || "Assignment not found" };
        }

        const currentDelegateEmails: string[] = assignment.delegate_ids || [];
        if (!currentDelegateEmails.includes(delegateEmail)) {
            return { success: true };
        }

        const updatedDelegateEmails = currentDelegateEmails.filter((e) => e !== delegateEmail);

        const { error: updateError } = await supabase
            .from("Assignment")
            .update({ delegate_ids: updatedDelegateEmails })
            .eq("id", assignmentId);

        if (updateError) {
            return { success: false, error: updateError.message || "Failed to update assignment" };
        }

        const { error: userUpdateError } = await supabase
            .from("Users")
            .update({ assignment_id: null })
            .eq("email", delegateEmail)
            .eq("user_type", "delegate");

        if (userUpdateError) {
            console.error("Error clearing delegate assignment_id:", userUpdateError);
            return { success: false, error: userUpdateError.message || "Failed to update user" };
        }

        return { success: true };
    } catch (error: any) {
        console.error("Unexpected error in removeDelegateFromAssignment:", error);
        return { success: false, error: error?.message || "An unexpected error occurred" };
    }
}

/**
 * Update a delegate's first and last name in Users. Only affects delegates in the current advisor's school.
 */
export async function updateDelegateName(
    email: string,
    first_name: string,
    last_name: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSupabaseUser();
        if (!user || user.user_type !== "advisor" || !user.school_id) {
            return { success: false, error: "Not authorized" };
        }

        const { error } = await supabase
            .from("Users")
            .update({ first_name, last_name })
            .eq("email", email)
            .eq("user_type", "delegate")
            .eq("school_id", user.school_id);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (error: any) {
        console.error("Unexpected error in updateDelegateName:", error);
        return { success: false, error: error?.message || "An unexpected error occurred" };
    }
}

/**
 * Set a delegate's password (advisor only, same school). Calls the API that uses the service role.
 */
export async function setDelegatePasswordAsAdvisor(
    delegateUserId: string,
    newPassword: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            return { success: false, error: "Not signed in" };
        }
        const res = await fetch("/api/set-delegate-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ delegateUserId, newPassword }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return { success: false, error: (data.error as string) || res.statusText };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e?.message || "Request failed" };
    }
}

/**
 * Link an existing delegate (by email) to an assignment. Adds email to assignment's delegate_ids
 * and sets the user's assignment_id. Delegate must already exist and belong to advisor's school.
 */
export async function linkDelegateToAssignment(
    delegateEmail: string,
    assignmentId: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const advisor = await getSupabaseUser();
        if (!advisor || advisor.user_type !== "advisor" || !advisor.school_id) {
            return { success: false, error: "Not authorized" };
        }

        const { data: delegateUser, error: fetchUserError } = await supabase
            .from("Users")
            .select("id, email, user_type, school_id")
            .eq("email", delegateEmail)
            .maybeSingle();

        if (fetchUserError || !delegateUser) {
            return { success: false, error: "Delegate account not found with that email." };
        }
        if (delegateUser.user_type !== "delegate") {
            return { success: false, error: "That email belongs to a non-delegate account." };
        }
        if (delegateUser.school_id !== advisor.school_id) {
            return { success: false, error: "That delegate is not from your school." };
        }

        const { data: thisAssignment, error: assignFetchErr } = await supabase
            .from("Assignment")
            .select("registration_id, delegate_ids")
            .eq("id", assignmentId)
            .single();

        if (assignFetchErr || !thisAssignment) {
            return { success: false, error: "Assignment not found" };
        }

        const { data: otherAssignments } = await supabase
            .from("Assignment")
            .select("id, delegate_ids")
            .eq("registration_id", thisAssignment.registration_id);

        for (const a of otherAssignments || []) {
            if (a.id === assignmentId) continue;
            const ids: string[] = a.delegate_ids || [];
            if (!ids.includes(delegateEmail)) continue;
            const updated = ids.filter((e) => e !== delegateEmail);
            await supabase
                .from("Assignment")
                .update({ delegate_ids: updated })
                .eq("id", a.id);
        }

        const addResult = await addDelegateToAssignment(assignmentId, delegateEmail);
        if (!addResult.success) return addResult;

        const { error: userUpdateError } = await supabase
            .from("Users")
            .update({ assignment_id: assignmentId })
            .eq("email", delegateEmail)
            .eq("user_type", "delegate");

        if (userUpdateError) {
            return { success: false, error: userUpdateError.message || "Failed to link delegate to assignment" };
        }
        return { success: true };
    } catch (error: any) {
        console.error("Unexpected error in linkDelegateToAssignment:", error);
        return { success: false, error: error?.message || "An unexpected error occurred" };
    }
}

/**
 * Get delegate by email if they exist and belong to the current advisor's school. Used to check
 * whether an email is an existing delegate before linking to an assignment.
 */
export async function getDelegateByEmail(email: string): Promise<ChairDelegateInfo | null> {
    const user = await getSupabaseUser();
    if (!user || user.user_type !== "advisor" || !user.school_id) return null;

    const { data, error } = await supabase
        .from("Users")
        .select("first_name, last_name, email, assignment_id, user_type")
        .eq("email", email)
        .eq("user_type", "delegate")
        .eq("school_id", user.school_id)
        .maybeSingle();

    if (error || !data) return null;
    return {
        first_name: data.first_name ?? null,
        last_name: data.last_name ?? null,
        email: data.email,
        assignment_id: data.assignment_id ?? null,
    } as ChairDelegateInfo;
}

export async function getAmountRegistered() {
    const { data, error } = await supabase.rpc('get_delegate_total_count');

    if (error) {
        console.error('Error fetching delegate count:', error);
        return 0;
    } else {
        console.log('Total delegate count:', data);
        return data;
    }
}

export const registrationNumber = await getAmountRegistered();

const regCaps = [1200, 3000, 2050, 2050]

export async function isRegOpen() {
    return registrationNumber <= regCaps[1] && currentConference.open_reg;
    /*console.log("Hey");

    const currentConference = await getCurrentConference();

    const roundOneStart = new Date(currentConference.reg_open);
    const roundOneEnd = new Date(currentConference.round_one_end);
    const roundTwoStart = new Date(roundOneEnd.getDate() + 3);
    const roundTwoEnd = new Date(currentConference.round_two_end);
    const regEnd = new Date(currentConference.reg_close);

    
    const currentDate = new Date();

    if (!currentConference) {
        console.error("No Conference found.");
        return null;
    }

    // Override and Date Check
    if (currentDate < roundOneStart ||
        currentDate > regEnd) {
        console.log(1);
        return false;
    }
    // Round 1 Check
    console.log(currentDate);
    console.log(roundOneStart);
    if (currentDate < roundOneEnd && registrationNumber >= regCaps[0]) {
        console.log(2);
        return false
    }
    // Round 2 Check
    if (currentDate > roundTwoStart &&
        currentDate < roundTwoEnd &&
        registrationNumber >= regCaps[1]) {
        console.log(3);
        return false;
    }

    console.log(4);
    return true;*/
}

export async function isWaitlistOpen() {
    const currentConference = await getCurrentConference();

    if (currentConference) {
        return currentConference.waitlist_reg
    }

    return false
}

export async function resetPassword(password: string) {
    const user = await getUser();

    if (!user) {
        console.error("User not logged in");
    }
    
    const {data:_, error} = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        console.log(error);
        return false;
    }

    return true;
}

export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Get the site URL - use production domain for password reset emails
        let redirectUrl: string;
        if (typeof window !== 'undefined') {
            // Check if we're in development (localhost) or production
            const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isDevelopment && process.env.NEXT_PUBLIC_SITE_URL) {
                redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`;
            } else {
                // Use production domain
                redirectUrl = 'https://aldous.bmun.org/reset-password';
            }
        } else {
            redirectUrl = process.env.NEXT_PUBLIC_SITE_URL 
                ? `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
                : 'https://aldous.bmun.org/reset-password';
        }

        const { data: _, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
        });

        if (error) {
            console.error('Error sending reset email:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Unexpected error in sendPasswordResetEmail:', error);
        return { success: false, error: error?.message || 'An unexpected error occurred' };
    }
}

/**
 * Send a magic link (sign-in link) to the given email. The user can click the link to sign in.
 * Can be called by an advisor to send a login link to a delegate.
 */
export async function sendMagicLinkToEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
        let redirectUrl: string;
        if (typeof window !== "undefined") {
            const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
            redirectUrl = isDev && process.env.NEXT_PUBLIC_SITE_URL
                ? `${process.env.NEXT_PUBLIC_SITE_URL}/delegate`
                : "https://aldous.bmun.org/delegate";
        } else {
            redirectUrl = process.env.NEXT_PUBLIC_SITE_URL
                ? `${process.env.NEXT_PUBLIC_SITE_URL}/delegate`
                : "https://aldous.bmun.org/delegate";
        }
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: redirectUrl },
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e?.message || "Failed to send magic link" };
    }
}

export interface rubric {
    topic_1_background: number,
    topic_1_solutions: number,
    topic_1_questions: number,
    topic_1_discrection: number,
    topic_2_background: number,
    topic_2_solutions: number,
    topic_2_questions: number,
    topic_2_discrection: number
}

export interface PositionPaper {
    id?: number,
    graded: boolean,
    score_1: number,
    score_2: number,
    score_3: number,
    score_4: number,
    score_5: number,
    score_t2_1: number,
    score_t2_2: number,
    score_t2_3: number,
    score_t2_4: number,
    score_t2_5: number,
    submission_date: Date,
    paper_url: string
}

const MAX_SIZE = 10 * 1024 * 1024

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]


export async function uploadPositionPaper(file: File) {
    // ─────────────────────────────────────────────
    // 0. Validate file
    // ─────────────────────────────────────────────
    if (!file) {
        throw new Error('No file provided')
    }

    if (file.size > MAX_SIZE) {
        throw new Error('File must be under 10MB')
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Only PDF or Word documents are allowed')
    }

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        throw new Error('Not authenticated')
    }

    const { data: userRow, error: userRowError } =
        await supabase
        .from('Users')
        .select('assignment_id')
        .eq('id', user.id)
        .single()

    if (userRowError) throw userRowError
    if (!userRow?.assignment_id) {
        throw new Error('User has no assignment')
    }

    const assignmentId = userRow.assignment_id

    const { data: assignment, error: assignmentError } =
        await supabase
        .from('Assignment')
        .select('id, paper_id')
        .eq('id', assignmentId)
        .single()

    if (assignmentError) throw assignmentError

    const paperId: number | null = assignment.paper_id

    // Sanitize filename to prevent path traversal and ensure it's safe
    // Remove any path separators and keep only the filename
    const sanitizedFileName = file.name.replace(/[\/\\]/g, '_').replace(/\.\./g, '_')
    const filePath = `${assignmentId}/${sanitizedFileName}`

    if (paperId) {
        const { data: oldPaper, error: oldPaperError } =
        await supabase
            .from('PositionPaper')
            .select('paper_url')
            .eq('id', paperId)
            .single()

        if (oldPaperError) throw oldPaperError

        if (oldPaper?.paper_url) {
        await supabase.storage
            .from('position-papers')
            .remove([oldPaper.paper_url])
        }
    }

    const { error: uploadError } =
        await supabase.storage
        .from('position-papers')
        .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
        })

    if (uploadError) throw uploadError

    const submissionDate = new Date().toISOString()

    if (!paperId) {
        // CREATE
        const { data: newPaper, error: insertError } =
        await supabase
            .from('PositionPaper')
            .insert(
            {
                graded: false,
                submission_date: submissionDate,
                paper_url: filePath,
                score_1: 0,
                score_2: 0,
                score_3: 0,
                score_4: 0,
                score_5: 0,
                score_t2_1: 0,
                score_t2_2: 0,
                score_t2_3: 0,
                score_t2_4: 0,
                score_t2_5: 0,
            }
            )
            .select('id')
            .single()

        if (insertError || !newPaper?.id) {
            throw insertError
            throw new Error('Failed to create PositionPaper')
        }

        // Attach paper to assignment
        const { error: updateAssignmentError } =
        await supabase
            .from('Assignment')
            .update({ paper_id: newPaper.id })
            .eq('id', assignmentId)

        if (updateAssignmentError) throw updateAssignmentError
    } else {
        // UPDATE
        const { error: updateError } =
        await supabase
            .from('PositionPaper')
            .update({
            submission_date: submissionDate,
            paper_url: filePath,
            })
            .eq('id', paperId)

        if (updateError) throw updateError
    }
}

export async function getPositionPaperForCurrentDelegate(): Promise<PositionPaper | null> {
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        console.error('Not authenticated')
        return null
    }

    const { data: userRow, error: userRowError } =
        await supabase
        .from('Users')
        .select('assignment_id')
        .eq('id', user.id)
        .single()

    if (userRowError || !userRow?.assignment_id) {
        return null
    }

    const assignmentId = userRow.assignment_id

    const { data: assignment, error: assignmentError } =
        await supabase
        .from('Assignment')
        .select('paper_id')
        .eq('id', assignmentId)
        .single()

    if (assignmentError || !assignment?.paper_id) {
        return null
    }

    const { data: paper, error: paperError } =
        await supabase
        .from('PositionPaper')
        .select('*')
        .eq('id', assignment.paper_id)
        .single()

    if (paperError || !paper) {
        return null
    }

    return paper as PositionPaper
}

export async function downloadPositionPaper(): Promise<void> {
    const paper = await getPositionPaperForCurrentDelegate()

    if (!paper || !paper.paper_url) {
        throw new Error('No position paper found')
    }

    const { data, error } = await supabase.storage
        .from('position-papers')
        .download(paper.paper_url)

    if (error) {
        throw new Error(`Failed to download file: ${error.message}`)
    }

    if (!data) {
        throw new Error('No file data received')
    }

    // Create a blob URL and trigger download
    const url = window.URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    
    // Extract filename from paper_url (e.g., "123/original_filename.pdf" -> "original_filename.pdf")
    const fileName = paper.paper_url.split('/').pop() || 'position_paper.pdf'
    link.download = fileName
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
}

// Batch fetch position papers for chair views
export interface PositionPaperWithId extends PositionPaper {
    id: number;
}

export async function getPositionPapersByIds(paperIds: number[]): Promise<PositionPaperWithId[]> {
    if (!paperIds || paperIds.length === 0) {
        return [];
    }

    const { data, error } = await supabase
        .from('PositionPaper')
        .select('*')
        .in('id', paperIds);

    if (error || !data) {
        console.error('Error fetching position papers by IDs:', error);
        return [];
    }

    return data as PositionPaperWithId[];
}

export async function getPositionPaperByPaperId(paperId: number): Promise<PositionPaper | null> {
    const { data: paper, error: paperError } =
        await supabase
        .from('PositionPaper')
        .select('*')
        .eq('id', paperId)
        .single()

    if (paperError || !paper) {
        return null
    }

    return paper as PositionPaper
}

export async function downloadPositionPaperByPaperId(paperId: number): Promise<void> {
    const paper = await getPositionPaperByPaperId(paperId)

    if (!paper || !paper.paper_url) {
        throw new Error('No position paper found')
    }

    const { data, error } = await supabase.storage
        .from('position-papers')
        .download(paper.paper_url)

    if (error) {
        throw new Error(`Failed to download file: ${error.message}`)
    }

    if (!data) {
        throw new Error('No file data received')
    }

    // Create a blob URL and trigger download
    const url = window.URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    
    // Extract filename from paper_url (e.g., "123/original_filename.pdf" -> "original_filename.pdf")
    const fileName = paper.paper_url.split('/').pop() || 'position_paper.pdf'
    link.download = fileName
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
}

export async function updatePositionPaperScores(
    paperId: number,
    scores: {
        score_1: number;
        score_2: number;
        score_3: number;
        score_4: number;
        score_5: number;
        score_t2_1: number;
        score_t2_2: number;
        score_t2_3: number;
        score_t2_4: number;
        score_t2_5: number;
    }
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('PositionPaper')
            .update({
                ...scores,
                graded: true,
            })
            .eq('id', paperId);

        if (error) {
            console.error('Error updating position paper scores:', error);
            return false;
        }

        return true;
    } catch (e) {
        console.error('Error updating position paper scores:', e);
        return false;
    }
}

export async function uploadGradedPaper(paperId: number, assignmentId: number, file: File): Promise<boolean> {
    try {
        // Validate file
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('File must be under 10MB');
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error('Only PDF or Word documents are allowed');
        }

        // Sanitize filename
        const sanitizedFileName = file.name.replace(/[\/\\]/g, '_').replace(/\.\./g, '_');
        const filePath = `${assignmentId}/graded/${sanitizedFileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
            .from('position-papers')
            .upload(filePath, file, {
                upsert: true,
                contentType: file.type,
            });

        if (uploadError) {
            console.error('Error uploading graded paper:', uploadError);
            return false;
        }

        return true;
    } catch (e) {
        console.error('Error uploading graded paper:', e);
        return false;
    }
}

export async function downloadGradedPaper(paperId: number, assignmentId: number): Promise<void> {
    try {
        // List files in the graded folder for this assignment
        const { data: files, error: listError } = await supabase.storage
            .from('position-papers')
            .list(`${assignmentId}/graded`, {
                limit: 1,
                sortBy: { column: 'created_at', order: 'desc' }
            });

        if (listError || !files || files.length === 0) {
            throw new Error('No graded paper found');
        }

        const gradedFilePath = `${assignmentId}/graded/${files[0].name}`;

        const { data, error } = await supabase.storage
            .from('position-papers')
            .download(gradedFilePath);

        if (error) {
            throw new Error(`Failed to download file: ${error.message}`);
        }

        if (!data) {
            throw new Error('No file data received');
        }

        // Create a blob URL and trigger download
        const url = window.URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = files[0].name;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (e: any) {
        throw new Error(e.message || 'Failed to download graded paper');
    }
}

export async function getRubricById(rubricId: number): Promise<Rubric | null> {
    try {
        const { data, error } = await supabase
            .from('Rubric')
            .select('*')
            .eq('id', rubricId)
            .single();

        if (error || !data) {
            console.error('Error fetching rubric:', error);
            return null;
        }

        return {
            id: data.id,
            topic_one: Array.isArray(data.topic_one) ? data.topic_one : [],
            topic_two: Array.isArray(data.topic_two) ? data.topic_two : [],
            use_topic_2: data.use_topic_2 || false,
        } as Rubric;
    } catch (e) {
        console.error('Error fetching rubric:', e);
        return null;
    }
}

export async function createRubric(rubric: Omit<Rubric, 'id'>): Promise<number | null> {
    try {
        // jsonb columns handle arrays/objects directly
        const { data, error } = await supabase
            .from('Rubric')
            .insert({
                topic_one: rubric.topic_one,
                topic_two: rubric.topic_two,
                use_topic_2: rubric.use_topic_2,
            })
            .select('id')
            .single();

        if (error || !data) {
            console.error('Error creating rubric:', error);
            return null;
        }

        return data.id;
    } catch (e) {
        console.error('Error creating rubric:', e);
        return null;
    }
}

export async function updateRubric(rubricId: number, rubric: Omit<Rubric, 'id'>): Promise<boolean> {
    try {
        // jsonb columns handle arrays/objects directly
        const { error } = await supabase
            .from('Rubric')
            .update({
                topic_one: rubric.topic_one,
                topic_two: rubric.topic_two,
                use_topic_2: rubric.use_topic_2,
            })
            .eq('id', rubricId);

        if (error) {
            console.error('Error updating rubric:', error);
            return false;
        }

        return true;
    } catch (e) {
        console.error('Error updating rubric:', e);
        return false;
    }
}

export async function updateCommitteeRubricId(committeeId: number, rubricId: number | null): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('Committee')
            .update({ rubric_id: rubricId })
            .eq('id', committeeId);

        if (error) {
            console.error('Error updating committee rubric_id:', error);
            return false;
        }

        return true;
    } catch (e) {
        console.error('Error updating committee rubric_id:', e);
        return false;
    }
}