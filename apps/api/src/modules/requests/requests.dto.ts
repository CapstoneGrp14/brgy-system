import { QueueTab } from '@brgy/shared';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDocumentRequestDto {
  /**
   * Census id of a minor in the filer's household. Validated server-side
   * against the filer actually being that household's head — the client
   * choosing a value here grants nothing on its own.
   */
  @IsOptional()
  @IsUUID()
  beneficiaryCensusRecordId?: string;

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

  /** Free-text match on request title or resident name. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  /**
   * Deadline bucket. Filtered server-side because the queue is paginated —
   * narrowing only the five visible rows would under-report the backlog.
   */
  @IsOptional()
  @IsIn(['all', 'overdue', 'soon', 'ontrack'])
  deadline?: 'all' | 'overdue' | 'soon' | 'ontrack';
}
