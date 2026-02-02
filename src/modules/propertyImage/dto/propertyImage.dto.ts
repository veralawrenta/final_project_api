import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreatePropertyImageDTO {
  @IsNotEmpty()
  @IsBoolean()
  isCover?: boolean;
}

export class UpdatePropertyImageDTO {
  @IsOptional()
  @IsBoolean()
  isCover?: boolean;
}

