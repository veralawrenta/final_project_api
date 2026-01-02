import { addHours } from "date-fns";
import { PrismaClient, Role } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

export class OAuthService {
  private oAuth2Client: OAuth2Client;
  private prisma: PrismaClient;

  constructor() {
    this.oAuth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    this.prisma = prisma;
  }

  private verifyGoogleToken = async (googleToken: string) => {
    const ticket = await this.oAuth2Client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      throw new ApiError("Invalid Google token", 401);
    }
    //console.log("Google token payload:", payload);
    return {
      email: payload.email!,
      firstName: payload.given_name || "no name",
      lastName: payload.family_name || "no name",
      imageurl: payload.picture,
      isVerified: payload.email_verified,
    };
  };

  googleLogin = async (googleToken: string, role: Role) => {
    //console.log("googleLogin called with token:", googleToken, "role:", role);

    const googleUser = await this.verifyGoogleToken(googleToken);
    console.log("Google user verified:", googleUser);

    let user = await this.prisma.user.findFirst({
      where: { email: googleUser.email },
    });
    console.log("User found:", user);

    if (user && role && user.role !== role) {
      throw new ApiError(
        `This email is already registered as ${user.role}`,
        403
      );
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          firstName: googleUser.firstName ?? "",
          lastName: googleUser.lastName ?? "",
          imageUrl: googleUser.imageurl,
          provider: "GOOGLE",
          role,
          isVerified: true,
        },
      });
      console.log("User created:", user);
    }
    const JWTpayload = { id: user.id, role: user.role };
    const accessToken = jwt.sign(JWTpayload, process.env.JWT_ACCESS_SECRET!, {
      expiresIn: "1h",
    });
    console.log("JWT token generated:", accessToken);

    const response = {
      accessToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        email: user.email,
        password: null,
        role: user.role,
      },
    };
    console.log("Login response prepared:", response);
    return response;
  };
}
