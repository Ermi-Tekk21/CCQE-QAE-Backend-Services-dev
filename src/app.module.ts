import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionModule } from './question/question.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { typeOrmConfig } from './common/config/datasource';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(typeOrmConfig),
    QuestionModule,
    EvaluationModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
