import { Transform } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreatePropertyImageDTO {
  @IsNotEmpty()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isCover?: boolean;
}

export class UpdatePropertyImageDTO {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isCover?: boolean;
}
