import 'express';

import { JwtPayload } from '../auth/jwt-auth.guard';

/**
 * Declaration merging: JwtAuthGuard menaruh payload JWT ke request.user.
 * Augment ke global `Express.Request` (bukan 'express-serve-static-core')
 * karena Request core meng-extend Express.Request — merge ini bekerja
 * apa pun strategi resolusi modul (npm hoisted maupun pnpm strict).
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
