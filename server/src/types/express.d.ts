declare global {
  namespace Express {
    interface Request {
      auth?: { id: string; role: "user" | "admin"; sessionId: string };
    }
  }
}
export {};
