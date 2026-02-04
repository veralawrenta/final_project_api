import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreatePropertyImageDTO {
  @IsNotEmpty()
  @IsString()
  urlImages!: string;

  @IsNotEmpty()
  @IsBoolean()
  isCover?: boolean;
}

export class UpdatePropertyImageDTO {
  @IsOptional()
  @IsBoolean()
  isCover?: boolean;
}
