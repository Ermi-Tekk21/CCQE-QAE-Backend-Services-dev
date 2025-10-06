import { Module } from '@nestjs/common';
import { CatagoryService } from './catagory.service';
import { CatagoryController } from './catagory.controller';
import { Catagory } from './entities/catagory.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionLookup } from 'src/question-lookup/entities/question-lookup.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Catagory, QuestionLookup])],
  controllers: [CatagoryController],
  providers: [CatagoryService],
})
export class CatagoryModule { }
