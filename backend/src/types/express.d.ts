import 'express';

import { JwtPayload } from '../auth/jwt-auth.guard';

/**
 * Declaration merging: JwtAuthGuard menaruh payload JWT ke request.user.
 * Dengan augmentasi ini, req.user bertipe JwtPayload tanpa cast `as any`.
 */
declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}
