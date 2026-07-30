import { QueueTab } from '@brgy/shared';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDocumentRequestDto {
  // Validated at runtime against built-in + staff-added types (DocTypesService).
  @IsString()
  @MaxLength(60)
  documentType: string;

  @IsString()
  @MinLength(3, { message: 'Please state the purpose of your request.' })
  @MaxLength(255)
  purpose: string;
}

export class CreateCctvRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Please give the location of the incident.' })
  @MaxLength(255)
  location: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  incidentAt?: string | null;
}

export class CreateMedicineRequestDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsIn(['1 piece / strip', '1 box', '1 bottle'])
  quantity: string;
}

export class CreateEquipmentRequestDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Pick a borrow date.' })
  borrowDate: string;
}

export class CreatePrintingRequestDto {
  @IsIn(['Printing (Black & White)', 'Printing (Colored)', 'Laminating'])
  serviceType: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  copies: number;
}

export class QueueQueryDto {
  @IsOptional()
  @IsIn(['all', 'doc', 'health', 'cctv'])
  tab?: QueueTab;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
