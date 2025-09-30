import { forwardRef, Module } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentEvaluation } from './entities/evaluation.entity';
import { GroupQuestionModule } from 'src/group-question/group-question.module';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentEvaluation]),
    forwardRef(() => GroupQuestionModule),
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
  controllers: [EvaluationController],
  providers: [EvaluationService],
  exports: [EvaluationService]
})
export class EvaluationModule { }
