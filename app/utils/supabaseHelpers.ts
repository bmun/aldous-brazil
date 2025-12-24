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
    name: string,
    full_name: string,
    delegation_size: number,
    special: boolean,
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

export async function getCommittees() {
    const {data, error } = await supabase.from('Committee')
        .select();

    if (error) {
        console.error(error);
        return [];
    }

    return data;
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

        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
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