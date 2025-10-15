import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { GroupQuestionService } from './group-question/group-question.service';
import { UUID } from 'crypto';
import { groupQuestionStatus } from './common/group_question.status';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:3000', 'http://164.160.187.141:9011'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get('Reflector')));

  // if in case the server crushed the group question evaluation cronjobs sheduler will restart here
  const groupQuestionService = app.get(GroupQuestionService);
  const currentGroupQuestion = await groupQuestionService.getCurrentGroupQue();
  if (currentGroupQuestion && currentGroupQuestion.status != groupQuestionStatus.CLOSED) {
    const { cronJobsMessage } = groupQuestionService.forceCloseWithCronJobs(currentGroupQuestion.id as UUID, currentGroupQuestion.evaluation_ends_at)
    console.log(`[GroupQuestion CronJob Restart] Detected an open group question (ID: ${currentGroupQuestion.id}). Force closing due to server restart at ${new Date().toISOString()}.`);
    console.log(` Details: ${cronJobsMessage}`);
  }

  await app.listen(process.env.PORT ?? 3399);
}
bootstrap();
