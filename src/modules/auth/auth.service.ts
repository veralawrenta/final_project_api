import { addHours } from "date-fns";
import jwt from "jsonwebtoken";
import { PrismaClient, Provider, Role } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import { comparePassword, hashPassword } from "../../utils/password.js";
import { MailService } from "../mail/mail.service.js";
import {
  ChangePasswordDTO,
  ForgotPasswordDTO,
  LoginDTO,
  RegisterTenantDTO,
  RegisterUserDTO,
  ResendVerificationDTO,
  ResetPasswordDTO,
  SetPasswordDTO,
} from "./dto/auth.dto.js";

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

    if (existingUser) throw new ApiError("Email already exist", 400);

    const user = await this.prisma.user.create({
      data: {
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
        verificationToken: token,
        expiresAt,
      },
    });

    let sendEmail = await this.mailService.sendMail(
      user.email,
      "Email Verification",
      "welcome-user",
      {
        UserVerificationLink: `${process.env.FRONTEND_URL}/auth/set-password?token=${token}`,
      }
    );
    return { message: "Please check your email to verify your account" };
  };

  registerTenantEmail = async (body: RegisterTenantDTO) => {
    const currentUser = await this.prisma.user.findUnique({
      where: { email: body.email },
    });
    if (currentUser) {
      throw new ApiError("email already exist", 400);
    }
    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        role: Role.TENANT,
        provider: Provider.CREDENTIAL,
        isVerified: false,
        tenant: {
          create: {
            tenantName: body.tenantName,
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
        verificationToken: token,
        expiresAt,
      },
    });

    let sendEmail = await this.mailService.sendMail(
      user.email,
      "Verify Email",
      "welcome-tenant",
      {
        TenantVerificationLink: `${process.env.FRONTEND_URL}/auth/set-password?token=${token}`,
      }
    );
    return { message: "Please check your email to verify your account" };
  };

  validateEmailToken = async (userId: number, verificationToken: string) => {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, verificationToken },
    });
    if (!user) {
      throw new ApiError("User not found", 400);
    }
    if (user.isVerified) {
      throw new ApiError("User already verified", 400);
    }
    if (user.expiresAt! < new Date()) {
      throw new ApiError("Token has expired", 400);
    }

    return {
      userId: user.id,
      role: user.role,
      isVerified: false,
      message: "Token is valid but not yet verified",
    };
  };

  verifyAndSetPassword = async (
    userId: number,
    verificationToken: string,
    body: SetPasswordDTO
  ) => {
    if (!body.password) {
      throw new ApiError("Password is required", 400);
    }

    const currentUser = await this.prisma.user.findFirst({
      where: { id: userId, verificationToken },
    });

    if (!currentUser) {
      throw new ApiError("Invalid or expired token", 400);
    }

    if (currentUser.isVerified) {
      throw new ApiError("User already verified", 400);
    }

    if (currentUser.provider !== "CREDENTIAL") {
      throw new ApiError("Not eligible to create password", 400);
    }

    if (currentUser.password) {
      throw new ApiError(
        "Password already set. Please use forgot password to reset your password",
        400
      );
    }

    const hashedPassword = await hashPassword(body.password);

    const updatedUser = await this.prisma.user.update({
      where: { id: currentUser.id },
      data: {
        password: hashedPassword,
        isVerified: true,
        verificationToken: null,
        expiresAt: null,
      },
    });
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
    };
    
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
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
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
    const accessToken = jwt.sign(payload, process.env.JWT_RESET_SECRET!, {
      expiresIn: "1h",
    });
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: accessToken,
        expiresAt,
      },
    });

    await this.mailService.sendMail(
      user.email,
      "Forgot Password",
      "forgot-password",
      {
        ResetPasswordLink: `http://localhost:3000/auth/reset-password/${accessToken}`,
      }
    );

    return { message: "send email success" };
  };

  resetPassword = async (
    authUserId: number,
    verificationToken: string,
    body: ResetPasswordDTO
  ) => {
    const user = await this.prisma.user.findFirst({
      where: { id: authUserId, verificationToken },
    });

    if (!user) {
      throw new ApiError("Invalid or outdated reset link", 404);
    }

    if (!user.expiresAt || user.expiresAt < new Date()) {
      throw new ApiError("Reset token expired", 400);
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
      where: { id: user.id },
      data: {
        password: hashedPassword,
        verificationToken: null,
        expiresAt: null,
      },
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

    if (user.provider === Provider.GOOGLE) {
      throw new ApiError(
        "Your account is registered with Google, please login with Google",
        400
      );
    }

    if (user.isVerified === true) {
      throw new ApiError("user already verified", 400);
    }

    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_VERIFY_SECRET!, {
      expiresIn: "1h",
    });
    const expiresAt = addHours(new Date(), 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: token,
        expiresAt,
      },
    });
    await this.mailService.sendMail(
      user.email,
      "Email Verification",
      "resend-verification",
      {
        ResendVerificationLink: `${process.env.FRONTEND_URL}/auth/set-password?token=${token}`,
      }
    );
    return { message: "Please check your email to verify your account" };
  };

  changeEmail = async (authUserId: number, newEmail: string) => {
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
    const token = jwt.sign(payload, process.env.JWT_CHANGE_EMAIL_SECRET!, {
      expiresIn: "1h",
    });
    const expiresAt = addHours(new Date(), 1);

    const updatedUser = await this.prisma.user.update({
      where: { id: authUserId },
      data: {
        pendingEmail: newEmail,
        isVerified: false,
        verificationToken: token,
        expiresAt,
      },
    });

    let sendEmail = await this.mailService.sendMail(
      updatedUser.pendingEmail!,
      "Change Email",
      "change-email",
      {
        ChangeEmailVerificationLink: `${process.env.FRONTEND_URL}/auth/verify-email-change?token=${token}`,
      }
    );
    return {
      message: "Please check your email to verify the new email address",
    };
  };

  verifyChangeEmail = async (authUserId: number, verificationToken: string) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId, verificationToken },
    });
    if (!user) {
      throw new ApiError("User not found", 404);
    }

    if (!user.expiresAt || user.expiresAt < new Date()) {
      throw new ApiError("Token expired", 400);
    }

    if (!user.pendingEmail) {
      throw new ApiError("No email change request found", 400);
    }
    await this.prisma.user.update({
      where: { id: authUserId },
      data: {
        email: user.pendingEmail!,
        pendingEmail: null,
        isVerified: true,
        verificationToken: null,
        expiresAt: null,
      },
    });

    return { message: "Email changed and verified successfully" };
  };

  resendChangeEmailVerification = async (authUserId: number) => {
    const user = await this.prisma.user.findFirst({
      where: { id: authUserId },
    });
    if (!user) {
      throw new ApiError("user not found", 404);
    }

    if (!user.pendingEmail) {
      throw new ApiError("No pending email change request", 400);
    }

    if (user.isVerified === true) {
      throw new ApiError("user already verified", 400);
    }

    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_CHANGE_EMAIL_SECRET!, {
      expiresIn: "1h",
    });
    const expiresAt = addHours(new Date(), 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: token,
        expiresAt,
      },
    });

    await this.mailService.sendMail(
      user.pendingEmail,
      "Resend Change Email Verification",
      "resend-change-email",
      {
        ResendChangeVerificationLink: `${process.env.FRONTEND_URL}/auth/verify-email-change?token=${token}`,
      }
    );
    return { message: "Please check your email to verify your account" };
  };

  changePassword = async (authUserId: number, body: ChangePasswordDTO) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    if (!user.password || user.provider !== "CREDENTIAL") {
      throw new ApiError(
        "Password cannot be changed if you register with Google",
        400
      );
    }

    const isMatch = await comparePassword(body.currentPassword, user.password);
    if (!isMatch) {
      throw new ApiError("Current password is incorrect", 400);
    }

    const isSamePassword = await comparePassword(
      body.newPassword,
      user.password
    );
    if (isSamePassword) {
      throw new ApiError(
        "New password must be different from the old password",
        400
      );
    }

    const hashedPassword = await hashPassword(body.newPassword);

    await this.prisma.user.update({
      where: { id: authUserId },
      data: { password: hashedPassword },
    });

    return { message: "Password updated successfully" };
  };
}
