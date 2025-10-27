import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const error = url.searchParams.get("error");
    const accountId = url.searchParams.get("account_id");

    // Redirect back to onboarding so user stays on onboarding after LinkedIn connect
    const redirectTarget = new URL("/onboarding", req.url);
    const finalStatus = status || (error ? undefined : "connected");
    if (finalStatus) redirectTarget.searchParams.set("unipile_status", finalStatus);
    if (error) redirectTarget.searchParams.set("unipile_error", error);
    if (accountId) redirectTarget.searchParams.set("unipile_account_id", accountId);

    return NextResponse.redirect(redirectTarget);
  } catch (e) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }
}


