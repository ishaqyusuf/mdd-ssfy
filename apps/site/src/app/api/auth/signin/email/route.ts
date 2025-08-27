// Example in a Next.js API route handler
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  //   try {
  //     const result = await auth.signIn.email({
  //       email,
  //       password,
  //     });

  //     // Handle successful sign-in, e.g., set a session cookie
  //     // The 'result' object will contain user and session information
  //     return NextResponse.json({ success: true, user: result.user });
  //   } catch (error) {
  //     // Handle sign-in errors (e.g., incorrect credentials)
  //     return NextResponse.json(
  //       { success: false, error: error.message },
  //       { status: 401 }
  //     );
  //   }
}
