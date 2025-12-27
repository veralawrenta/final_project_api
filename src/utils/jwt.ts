import jwt, { SignOptions } from "jsonwebtoken";

export const generateToken = (
  payload: object,
  secret: string,
  options?: SignOptions
): string => {
  return jwt.sign(payload, secret, options);
};

export const verifyToken = <T>(token: string, secret: string): T => {
  return jwt.verify(token, secret) as T;
};
