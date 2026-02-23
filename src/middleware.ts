import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/tenants(.*)", "/managers(.*)"]);
const isTenantRoute = createRouteMatcher(["/tenants(.*)"]);
const isManagerRoute = createRouteMatcher(["/managers(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  if (isProtectedRoute(req) && !userId) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  if (userId) {
    const userType =
      (sessionClaims?.unsafeMetadata as any)?.userType ||
      (sessionClaims?.publicMetadata as any)?.userType;

    if (req.nextUrl.pathname === "/dashboard") {
      if (userType === "manager") return NextResponse.redirect(new URL("/managers/properties", req.url));
      if (userType === "tenant") return NextResponse.redirect(new URL("/tenants/favorites", req.url));
      return NextResponse.redirect(new URL("/select-role", req.url));
    }

    if (isManagerRoute(req) && userType === "tenant") return NextResponse.redirect(new URL("/tenants/favorites", req.url));
    if (isTenantRoute(req) && userType === "manager") return NextResponse.redirect(new URL("/managers/properties", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\.(?:html?|css|js(?!on)|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf)).*)","/(api|trpc)(.*)"],
};
