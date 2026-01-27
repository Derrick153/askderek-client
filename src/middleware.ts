import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/search(.*)",
  "/dashboard(.*)",
  "/tenants(.*)",
  "/managers(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId, redirectToSignIn } = await auth();

    if (!userId) {
      return redirectToSignIn({ returnBackUrl: req.url });
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|.*\\.(?:html?|css|js(?!on)|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf)).*)",
    "/(api|trpc)(.*)",
  ],
};
