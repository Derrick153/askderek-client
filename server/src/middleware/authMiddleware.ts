import { Request, Response, NextFunction, RequestHandler } from "express";
import { verifyToken }                                     from "@clerk/backend";
import { prisma }                                          from "../lib/prisma";

const verifyClerkToken = async (req: Request): Promise<string | null> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token   = authHeader.split(" ")[1];
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    return payload.sub ?? null;
  } catch (e) {
    return null;
  }
};

export const authMiddleware = (allowedRoles?: string[]): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const userId = await verifyClerkToken(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    (req as any).auth = { userId, sessionId: "" };
    if (allowedRoles?.length) {
      const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true, isActive: true } });
      if (!user || !allowedRoles.includes(user.role)) return res.status(403).json({ success: false, message: "Forbidden" });
    }
    next();
  };

export const requireTenant: RequestHandler =
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const userId = await verifyClerkToken(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    (req as any).auth = { userId, sessionId: "" };
    const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
    if (!user || (user.role !== "TENANT" && user.role !== "ADMIN")) return res.status(403).json({ success: false, message: "Forbidden" });
    next();
  };

export const requireManager: RequestHandler =
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const userId = await verifyClerkToken(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    (req as any).auth = { userId, sessionId: "" };
    const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
    if (!user || (user.role !== "MANAGER" && user.role !== "ADMIN")) return res.status(403).json({ success: false, message: "Forbidden" });
    next();
  };
