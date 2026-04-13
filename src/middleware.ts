import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/tenants(.*)",
  "/managers(.*)",
  "/admin(.*)",
]);

const isTenantRoute = createRouteMatcher(["/tenants(.*)"]);
const isManagerRoute = createRouteMatcher(["/managers(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  if (isProtectedRoute(req) && !userId) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  if (userId) {
    // ✅ Always allow select-role page — session claims may not have userType yet
    if (req.nextUrl.pathname === "/select-role") {
      return NextResponse.next();
    }

    // ✅ Read from session token custom claim
    const userType =
      (sessionClaims as any)?.userType ||
      (sessionClaims?.publicMetadata as any)?.userType ||
      (sessionClaims?.unsafeMetadata as any)?.userType;

    // ── DASHBOARD REDIRECT ────────────────────────────────
    if (req.nextUrl.pathname === "/dashboard") {
      if (userType === "admin") return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      if (userType === "manager") return NextResponse.redirect(new URL("/managers/properties", req.url));
      if (userType === "tenant") return NextResponse.redirect(new URL("/tenants/favorites", req.url));
      return NextResponse.redirect(new URL("/select-role", req.url));
    }

    // ── ADMIN PROTECTION ──────────────────────────────────
    if (isAdminRoute(req) && userType !== "admin") {
      if (userType === "manager") return NextResponse.redirect(new URL("/managers/properties", req.url));
      if (userType === "tenant") return NextResponse.redirect(new URL("/tenants/favorites", req.url));
      return NextResponse.redirect(new URL("/select-role", req.url));
    }

    // ── CROSS ROLE PROTECTION ─────────────────────────────
    if (isManagerRoute(req) && userType === "tenant") return NextResponse.redirect(new URL("/tenants/favorites", req.url));
    if (isTenantRoute(req) && userType === "manager") return NextResponse.redirect(new URL("/managers/properties", req.url));
    if (isTenantRoute(req) && userType === "admin") return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    if (isManagerRoute(req) && userType === "admin") return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|.*\\.(?:html?|css|js(?!on)|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf)).*)",
    "/(api|trpc)(.*)",
  ],
};