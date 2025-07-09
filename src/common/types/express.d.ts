import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
