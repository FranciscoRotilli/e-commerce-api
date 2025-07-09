import { Request } from 'express';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';

export interface RequestWithUser extends Request {
  user?: JwtPayload;
}
