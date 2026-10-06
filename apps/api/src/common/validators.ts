import { PASSWORD_MAX_LENGTH, passwordProblem } from '@brgy/shared';
import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

/**
 * Rejects a YYYY-MM-DD string that falls after today. The date pickers already
 * disable future days, but that is only a UX guard — anything posting straight
 * to the API could still send one, and a birthdate in the future corrupts the
 * age/senior-citizen derivation used for queue priority.
 */
export function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isNotFutureDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return true; // shape is @Matches' job
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          return value <= todayStr; // ISO dates compare correctly as strings
        },
        defaultMessage(): string {
          return 'Birthdate cannot be in the future.';
        },
      },
    });
  };
}

/**
 * Enforces the shared password policy (length + uppercase + special char).
 * Delegates to @brgy/shared so the API and the sign-up form can never drift
 * apart — and so the rejection names exactly what is missing instead of a
 * generic "invalid password".
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && passwordProblem(value) === null;
        },
        defaultMessage(args: ValidationArguments): string {
          const value = args.value;
          if (typeof value !== 'string') return 'Password is required.';
          return (
            passwordProblem(value) ??
            `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`
          );
        },
      },
    });
  };
}
