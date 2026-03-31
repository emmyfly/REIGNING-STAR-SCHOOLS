import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Build a response we can attach refreshed cookies to
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          // Write refreshed cookies to both request and response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getUser() — re-validates the JWT with Supabase on every request.
  // Safer than getSession() which only reads the cookie without server verification.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in → redirect to /login
  if (!user && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    // Verify the user exists in the admins table
    const { data: admin } = await supabase
      .from("admins")
      .select("id, role")
      .eq("auth_id", user.id)
      .single();

    // Auth user exists but has no admin record → sign out and redirect
    if (!admin && pathname !== "/login") {
      await supabase.auth.signOut();
      const redirectResponse = NextResponse.redirect(
        new URL("/login", request.url)
      );
      // Clear the session cookies on the redirect response
      response.cookies.getAll().forEach((cookie) => {
        if (cookie.name.startsWith("sb-")) {
          redirectResponse.cookies.delete(cookie.name);
        }
      });
      return redirectResponse;
    }

    // Logged-in admin visiting /login → send to dashboard
    if (admin && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
