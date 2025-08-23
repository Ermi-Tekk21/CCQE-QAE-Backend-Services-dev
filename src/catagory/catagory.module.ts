import { Module } from '@nestjs/common';
import { CatagoryService } from './catagory.service';
import { CatagoryController } from './catagory.controller';

@Module({
  controllers: [CatagoryController],
  providers: [CatagoryService],
})
export class CatagoryModule {}
