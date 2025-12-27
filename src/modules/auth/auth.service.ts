import { addHours } from "date-fns";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import { MailService } from "../mail/mail.service";
import { PrismaClient, Provider, Role } from "../../../generated/prisma/client";
import { comparePassword, hashPassword } from "../../utils/password";
import { verifyToken } from "../../utils/jwt";
import {
  ForgotPasswordDTO,
  LoginDTO,
  RegisterTenantDTO,
  RegisterUserDTO,
  ResendVerificationDTO,
  ResetPasswordDTO,
  SetPasswordDTO,
  VerifyEmailTokenDTO,
} from "./dto/auth.dto";


export class AuthService {
  private prisma: PrismaClient;
  mailService: MailService;

  constructor() {
    this.prisma = prisma;
    this.mailService = new MailService();
  }

  registerUserEmail = async (body: RegisterUserDTO) => {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) throw new ApiError("email already exist", 400);

    //const token = randomBytes(32).toString("hex");
    //const expiresAt = addHours(new Date(), 1);

    const user = await this.prisma.user.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        role: Role.USER,
        provider: Provider.CREDENTIAL,
        isVerified: false,
      },
    });

    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_VERIFY_SECRET!, {
      expiresIn: "1h",
    });
    const expiresAt = addHours(new Date(), 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        token,
        expiresAt,
      },
    });

    let sendEmail = await this.mailService.sendMail(
      user.email,
      "Email Verification",
      "welcome",
      {
        VerificationLink: `${process.env.FRONTEND_URL}/email-verification?token=${token}`,
      }
    );
    console.log("Email sent:", sendEmail);
  };

  registerTenantEmail = async (body: RegisterTenantDTO) => {
    const currentUser = await this.prisma.user.findUnique({
      where: { email: body.email },
    });
    if (currentUser) {
      throw new ApiError("email already exist", 400);
    }

    //const token = randomBytes(32).toString("hex");
    //const expiresAt = addHours(new Date(), 1);

    const user = await this.prisma.user.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        role: Role.TENANT,
        provider: Provider.CREDENTIAL,
        isVerified: false,
        tenant: {
          create: {
            tenantName: body.tenantName,
            bankName: body.bankName,
            bankNumber: body.bankNumber,
          },
        },
      },
    });

    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_VERIFY_SECRET!, {
      expiresIn: "1h",
    });
    const expiresAt = addHours(new Date(), 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        token,
        expiresAt,
      },
    });

    let sendEmail = await this.mailService.sendMail(
      user.email,
      "Verify Email",
      "welcome",
      {
        VerificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${token}`,
      }
    );
    console.log({ message: "email sent successful", sendEmail });
    return { message: "Please check your email to verify your account" };
  };

  verifyEmailToken = async (body: VerifyEmailTokenDTO) => {
    const user = await this.prisma.user.findFirst({
      where: { token: body.token },
    });
    if (!user) {
      throw new ApiError("User not found", 400);
    }

    if (user.isVerified) {
      //console.log("User already verified:", existingUser.id);
      throw new ApiError("User already verified", 400);
    }
    if (user.expiresAt! < new Date()) {
      //console.log("Token expired for user:", existingUser.id);
      throw new ApiError("Token has expired", 400);
    }
    if (user.token !== body.token) {
      //console.log("Token mismatch for user:", existingUser.id);
      throw new ApiError("Invalid token", 400);
    }

    const decodedToken = verifyToken(
      body.token,
      process.env.JWT_VERIFY_SECRET!
    ) as { id: number; role: Role };

    console.log("Decoded token:", decodedToken);

    if (!decodedToken || decodedToken.id !== user.id) {
      throw new ApiError("Invalid token", 400);
    }

    return {
      userId: user.id,
      role: user.role,
      isVerified: false,
      message: "Token is valid but not yet verified",
    };
  };

  verifyAndSetPassword = async (body: SetPasswordDTO) => {
    const { token, password } = body;

    if (!password) {
      //console.log("Password is null");
      throw new ApiError("Password is required", 400);
    }

    const currentUser = await this.prisma.user.findFirst({
      where: { token },
    });

    if (!currentUser) {
      throw new ApiError("Invalid or expired token", 400);
    }

    if (currentUser.isVerified) {
      throw new ApiError("User already verified", 400);
    }

    if (currentUser.password) {
      throw new ApiError(
        "Password already set. Please use forgot password to reset your password",
        400
      );
    }

    const decodedToken = verifyToken(token, process.env.JWT_VERIFY_SECRET!) as {
      id: number;
      role: Role;
    };
    if (!decodedToken || decodedToken.id !== currentUser.id) {
      throw new ApiError(" Invalid token", 400);
    }

    const hashedPassword = await hashPassword(body.password);

    const updatedUser = await this.prisma.user.update({
      where: { id: currentUser.id },
      data: {
        password: hashedPassword,
        isVerified: true,
        token: null,
        expiresAt: null,
      },
    });
    console.log("user id:", currentUser);
    console.log("DB isVerified:", updatedUser.isVerified);
    return {
      message: "Password set successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        isVerified: updatedUser.isVerified,
      },
    };
  };

  loginEmail = async (body: LoginDTO) => {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });

    if (!user) {
      throw new ApiError("Invalid credentials", 400);
    }

    if (!user.isVerified) {
      throw new ApiError("Not verified. Please verify your email", 400);
    }

    if (user.provider !== Provider.CREDENTIAL) {
      throw new ApiError("Please sign in with Google login", 400);
    }

    if (!user.password) {
      throw new ApiError("Password not found", 400);
    }
    const isPasswordValid = await comparePassword(body.password, user.password);

    if (!isPasswordValid) {
      throw new ApiError("Invalid credentials", 400);
    }

    const payload = { id: user.id, role: user.role };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: "2h",
    });

    const { password, ...userWithoutPassword } = user;
    return { ...userWithoutPassword, accessToken };
  };

  forgotPassword = async (body: ForgotPasswordDTO) => {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }
    if (user.provider !== Provider.CREDENTIAL) {
      throw new ApiError(
        "Your account is linked to Google, please login with Google login",
        400
      );
    }

    const payload = { id: user.id, role: user.role };
    const accessToken = jwt.sign(payload, process.env.JWT_RESET!, {
      expiresIn: "1h",
    });

    await this.mailService.sendMail(
      user.email,
      "Forgot Password",
      "forgot-password",
      { link: `http://localhost:3000/reset-password?token=${accessToken}` }
    );

    return { message: "send email success" };
  };

  resetPassword = async (body: ResetPasswordDTO, authUserId: number) => {
    const user = await this.prisma.user.findFirst({
      where: { id: authUserId },
    });

    if (!user) {
      throw new ApiError("user not found", 404);
    }

    const isSamePassword = await comparePassword(body.password, user.password!);
    if (isSamePassword) {
      throw new ApiError(
        "New password must be different from the old password",
        400
      );
    }

    const hashedPassword = await hashPassword(body.password);

    await this.prisma.user.update({
      where: { id: authUserId },
      data: { password: hashedPassword },
    });
    return { message: "Password reset successful" };
  };

  resendVerificationEmail = async (body: ResendVerificationDTO) => {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });
    if (!user) {
      throw new ApiError("user not found", 404);
    }

    if (user.provider !== Provider.CREDENTIAL) {
      throw new ApiError(
        "Your account is registered with Google, please login with Google",
        400
      );
    }

    if (user.isVerified) {
      throw new ApiError("user already verified", 400);
    }
    //const token = randomBytes(32).toString("hex");
    //const expiresAt = addHours(new Date(), 1);

    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_VERIFY_SECRET!, {
      expiresIn: "1h",
    });
    const expiresAt = addHours(new Date(), 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        token,
        expiresAt,
      },
    });
    await this.mailService.sendMail(
      user.email,
      "Email Verification",
      "welcome",
      {
        VerificationLink: `${process.env.FRONTEND_URL}/email-verification?token=${token}`,
      }
    );
    return { message: "Please check your email to verify your account" };
  };

  changeEmail = async (newEmail: string, authUserId: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
    });

    if (!user) throw new ApiError("user not found", 400);

    if (user.provider === Provider.GOOGLE) {
      throw new ApiError(
        "Email change is not available for accounts linked to Google",
        400
      );
    }

    if (newEmail === user.email) {
      throw new ApiError("Email is the same as current email", 400);
    }

    const currentEmail = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: newEmail }, { pendingEmail: newEmail }],
      },
    });

    if (currentEmail) throw new ApiError("Email already exists", 400);

    const payload = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_VERIFY_SECRET!, {
      expiresIn: "1h",
    });
    const expiresAt = addHours(new Date(), 1);

    const updatedUser = await this.prisma.user.update({
      where: { id: authUserId },
      data: {
        pendingEmail: newEmail,
        isVerified: false,
        token,
        expiresAt,
      },
    });

    let sendEmail = await this.mailService.sendMail(
      updatedUser.email,
      "Email Verification",
      "change-email-verification",
      {
        VerificationLink: `http://localhost:3000/email-verification?token=${token}`,
      }
    );
    console.log("Email sent:", sendEmail);
    return { message: "Please check your new email to verify your account" };
  };

  verifyChangeEmail = async (token: string) => {
    const user = await this.prisma.user.findUnique({
      where: { token },
    });
    if (!user) {
      throw new ApiError("User not found", 404);
    }

    if (!user.expiresAt || user.expiresAt < new Date()) {
      throw new ApiError("Token expired", 400);
    }

    const decodedToken = jwt.verify(token, process.env.JWT_VERIFY_SECRET!) as {
      id: number;
    };

    if (decodedToken.id !== user.id) {
      throw new ApiError("Invalid token", 400);
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.pendingEmail!,
        pendingEmail: null,
        isVerified: true,
        token: null,
        expiresAt: null,
      },
    });

    return { message: "Email changed and verified successfully" };
  };
}
