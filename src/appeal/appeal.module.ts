import { forwardRef, Module } from '@nestjs/common';
import { AppealService } from './appeal.service';
import { AppealController } from './appeal.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appeal } from './entities/appeal.entity';
import { EvalPerAudio } from 'src/evaluation/entities/evaluationPerAudio.entity';
import { EvaluationModule } from 'src/evaluation/evaluation.module';
import { AppealComplain } from './entities/appealComplain.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appeal, EvalPerAudio, AppealComplain]),
    forwardRef(() => EvaluationModule),
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            brokers: ['51.20.140.67:9094'],
            connectionTimeout: 30000,
            sasl: {
              mechanism: 'plain',
              username: 'admin',
              password: 'admin-password',
            },
            ssl: false,
            retry: {
              initialRetryTime: 300,
              retries: 5,
            },
          },
          consumer: {
            groupId: 'evaluation-consumer-group',
          },
        },
      },
    ]),
  ],
  controllers: [AppealController],
  providers: [AppealService],
  exports: [AppealService]
})
export class AppealModule { }
