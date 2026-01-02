import "dotenv/config";

export const PORT = process.env.PORT;

export const JWT_VERIFY_SECRET=process.env.JWT_VERIFY_SECRET;
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_RESET_SECRET = process.env.JWT_RESET_SECRET;

export const GOOGLE_CLIENT_ID= process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET= process.env.GOOGLE_CLIENT_SECRET;
export const GOOGLE_REDIRECT_URI= process.env.GOOGLE_REDIRECT_URI;

export const FRONTEND_URL= process.env.FRONTEND_URL;
