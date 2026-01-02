import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, MinLength } from "class-validator";
import { Provider, Role } from "../../../../generated/prisma/enums";

export class RegisterUserDTO {
  @IsNotEmpty()
  @IsEmail({}, {message: "Invalid email format"})
  email!: string;
}

export class RegisterTenantDTO {
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @IsNotEmpty()
  @IsEmail({}, {message: "Invalid email format"})
  email!: string;

  @IsNotEmpty()
  @IsString()
  tenantName!: string;

  @IsNotEmpty()
  @IsString()
  bankName!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+$/, { message: "Bank account number must contain only digits" })
  bankNumber!: string;
}

export class VerifyEmailTokenDTO {
  @IsNotEmpty()
  @IsString()
  token!: string;
}
export class SetPasswordDTO {
  @IsNotEmpty()
  @IsString()
  token!: string;
  
  @IsNotEmpty()
  @IsString()
  @MinLength(8, {message: "Password must be at least 8 characters long"})
  password!: string;
}

export class LoginDTO {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  password!: string;
}

export class ForgotPasswordDTO {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class ResetPasswordDTO {
  @IsString()
  @IsNotEmpty()
  @MinLength(8, {message: "Password must be at least 8 characters long"})
  password!: string;
}

export class ResendVerificationDTO {
  @IsEmail({}, {message: "Invalid email format"})
  @IsNotEmpty()
  email!: string;
}
export class RequestEmailChangeDTO {
  @IsEmail({}, {message: "Invalid email format"})
  @IsNotEmpty()
  newEmail!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}



