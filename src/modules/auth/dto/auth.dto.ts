import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class RegisterUserDTO {
  @IsNotEmpty()
  @IsEmail({}, {message: "Invalid email format"})
  email!: string;
}

export class RegisterTenantDTO {
  @IsNotEmpty()
  @IsEmail({}, {message: "Invalid email format"})
  email!: string;

  @IsNotEmpty()
  @IsString()
  tenantName!: string;
}

export class SetPasswordDTO {
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

export class ChangePasswordDTO {
  @IsString()
  @IsNotEmpty()
  @MinLength(8, {message: "Password must be at least 8 characters long"})
  currentPassword!: string;
  
  @IsString()
  @IsNotEmpty()
  @MinLength(8, {message: "Password must be at least 8 characters long"})
  newPassword!: string;
};
