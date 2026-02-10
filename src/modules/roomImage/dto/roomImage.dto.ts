import { Transform } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateRoomImageDTO {
  @IsNotEmpty()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isCover?: boolean;
}

export class UpdateRoomImageDTO {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isCover?: boolean;
}
