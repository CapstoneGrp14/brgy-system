import { PASSWORD_MAX_LENGTH, TWO_FACTOR_CODE_LENGTH } from '@brgy/shared';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsNotFutureDate, IsStrongPassword } from '../../common/validators';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class VerifyTwoFactorDto {
  @IsUUID()
  challengeId: string;

  /** The 6-digit code from the sign-in email. */
  @Matches(new RegExp(`^\\d{${TWO_FACTOR_CODE_LENGTH}}$`), {
    message: `Enter the ${TWO_FACTOR_CODE_LENGTH}-digit code from your email.`,
  })
  code: string;
}

export class ResendTwoFactorDto {
  @IsUUID()
  challengeId: string;
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  /** Must match the birthdate in the Barangay Census (YYYY-MM-DD). */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Birthdate must be YYYY-MM-DD' })
  @IsNotFutureDate()
  birthdate: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @Matches(/^09\d{9}$/, { message: 'Mobile number must look like 09XXXXXXXXX' })
  phone?: string;

  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  @IsStrongPassword()
  password: string;
}

export class AcceptInviteDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  @IsStrongPassword()
  password: string;

  @IsOptional()
  @Matches(/^09\d{9}$/, { message: 'Mobile number must look like 09XXXXXXXXX' })
  phone?: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  @IsStrongPassword()
  newPassword: string;
}
