import type { ExpressRequestWithAuth } from "@clerk/express";

declare global {
  namespace Express {
    interface Request {
      auth: ExpressRequestWithAuth["auth"];
    }
  }
}

export {};
