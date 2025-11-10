import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateRoleDto {
  @IsNotEmpty({ message: 'El rol es obligatorio' })
  @IsIn(['admin', 'client'], { message: 'El rol debe ser "admin" o "client"' })
  role: 'admin' | 'client';
}

