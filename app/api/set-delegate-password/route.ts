import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { delegateUserId, newPassword } = (await request.json()) as {
            delegateUserId?: string;
            newPassword?: string;
        };
        if (!delegateUserId || !newPassword || newPassword.length < 6) {
            return NextResponse.json(
                { error: "Delegate user ID and password (min 6 characters) required." },
                { status: 400 }
            );
        }

        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace(/^Bearer\s+/i, "");
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }
        if (!serviceRoleKey) {
            return NextResponse.json(
                { error: "Password reset is not configured. Set SUPABASE_SERVICE_ROLE_KEY." },
                { status: 503 }
            );
        }

        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: { user: currentUser }, error: userError } = await userClient.auth.getUser();
        if (userError || !currentUser) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        const { data: advisorRow, error: advisorError } = await userClient
            .from("Users")
            .select("school_id, user_type")
            .eq("id", currentUser.id)
            .single();

        if (advisorError || !advisorRow || advisorRow.user_type !== "advisor" || advisorRow.school_id == null) {
            return NextResponse.json({ error: "Not authorized as advisor" }, { status: 403 });
        }

        const { data: delegateRow, error: delegateError } = await userClient
            .from("Users")
            .select("id, school_id, user_type")
            .eq("id", delegateUserId)
            .single();

        if (delegateError || !delegateRow || delegateRow.user_type !== "delegate") {
            return NextResponse.json({ error: "Delegate not found" }, { status: 404 });
        }
        if (delegateRow.school_id !== advisorRow.school_id) {
            return NextResponse.json({ error: "Delegate is not from your school" }, { status: 403 });
        }

        const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
        const { error: updateError } = await adminClient.auth.admin.updateUserById(delegateUserId, {
            password: newPassword,
        });

        if (updateError) {
            console.error("set-delegate-password:", updateError);
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("set-delegate-password:", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
