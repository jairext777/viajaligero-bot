import type { Request, Response } from "express";

export function captureRawBody(req: Request, _res: Response, buf: Buffer): void {
  (req as Request & { rawBody?: Buffer }).rawBody = buf;
}
