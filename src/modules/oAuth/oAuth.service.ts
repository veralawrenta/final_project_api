
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
    return {
      email: payload.email!,
      firstName: payload.given_name || "no name",
      lastName: payload.family_name || "no name",
      imageurl: payload.picture,
      isVerified: payload.email_verified,
    };
  };

  googleLogin = async (googleToken: string) => {
    const googleUser = await this.verifyGoogleToken(googleToken);
    let user = await this.prisma.user.findFirst({
      where: { email: googleUser.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          firstName: googleUser.firstName ?? "",
          lastName: googleUser.lastName ?? "",
          avatar: googleUser.imageurl,
          provider: "GOOGLE",
          isVerified: true,
        },
      });
    }
    const JWTpayload = { id: user.id, role: user.role };
    const accessToken = jwt.sign(JWTpayload, process.env.JWT_ACCESS_SECRET!, {
      expiresIn: "1h",
    });

    const response = {
      accessToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        email: user.email,
        password: null,
        role: user.role,
      },
    };
    return response;
  };
}
