import { Request } from 'express';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';
import { User } from 'generated/prisma';

export type SafeUser = Omit<User, 'password'>;

export interface RequestWithUser extends Request {
  user?: JwtPayload;
}

export interface RequestWithAuthUser extends Request {
  user: JwtPayload;
}
