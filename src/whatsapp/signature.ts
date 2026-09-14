import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config/env.js";

export function verifyMetaSignature(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("x-hub-signature-256");
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

  if (!header || !rawBody) {
    res.sendStatus(401);
    return;
  }

  const expected = "sha256=" + crypto.createHmac("sha256", config.META_APP_SECRET).update(rawBody).digest("hex");
  const received = Buffer.from(header);
  const expectedBuffer = Buffer.from(expected);

  if (received.length !== expectedBuffer.length || !crypto.timingSafeEqual(received, expectedBuffer)) {
    res.sendStatus(401);
    return;
  }

  next();
}
