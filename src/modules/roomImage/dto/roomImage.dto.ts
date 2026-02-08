import { IsBoolean, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateRoomImageDTO {
  @IsNotEmpty()
  @IsBoolean()
  isCover?: boolean;
}

export class UpdateRoomImageDTO {
  @IsOptional()
  @IsBoolean()
  isCover?: boolean;
}
