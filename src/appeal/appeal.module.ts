import { Module } from '@nestjs/common';
import { AppealService } from './appeal.service';
import { AppealController } from './appeal.controller';

@Module({
  controllers: [AppealController],
  providers: [AppealService],
})
export class AppealModule {}
