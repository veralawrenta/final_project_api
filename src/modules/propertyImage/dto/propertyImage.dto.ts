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
