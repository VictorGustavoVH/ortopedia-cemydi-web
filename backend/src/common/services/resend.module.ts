import { Module } from '@nestjs/common';
import { ResendService } from './resend.service';
import { EmailController } from './email.controller';

@Module({
  controllers: [EmailController],
  providers: [ResendService],
  exports: [ResendService],
})
export class ResendModule {}

