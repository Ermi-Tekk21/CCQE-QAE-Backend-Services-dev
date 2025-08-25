import { Module } from '@nestjs/common';
import { CatagoryService } from './catagory.service';
import { CatagoryController } from './catagory.controller';
import { Catagory } from './entities/catagory.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Catagory])],
  controllers: [CatagoryController],
  providers: [CatagoryService],
})
export class CatagoryModule { }
