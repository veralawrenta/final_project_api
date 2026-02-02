import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";
import { DATE_ONLY_REGEX } from "../utils/date.utils";

export function IsDateOnly(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isDateOnly",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions ?? {
        message: "Date must be in YYYY-MM-DD format (e.g. 2025-01-15)",
      },
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (typeof value !== "string") return false;
          return DATE_ONLY_REGEX.test(value);
        },
      },
    });
  };
}
