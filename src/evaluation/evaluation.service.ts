import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotAcceptableException, NotFoundException } from '@nestjs/common';
import { CreateEvaluationDto } from './dto/agent-evaluation-dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/agent-evaluation-dto/update-evaluation.dto';
import { DataSource, EntityManager, Like, Repository } from 'typeorm';
import { GroupQuestion } from 'src/group-question/entities/group-question-entities/group-question.entity';
import { AgentEvaluation } from './entities/evaluation.entity';
import { EvalPerAudio } from './entities/evaluationPerAudio.entity';
import { EvalPerQuestion } from './entities/evaluationPerQuestion.entity';
import { Question } from 'src/group-question/entities/question-entities/question.entity';
import { QuestionAnswerOp } from 'src/group-question/entities/question-answer-option-entities/question_answerOP.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { agentEvalStatus } from 'src/common/agent_evaluation.status';
import { appealStatus } from 'src/common/appeal.status';
import { GroupQuestionService } from 'src/group-question/group-question.service';
import { paginate } from 'src/utils/paginate';
import { ClientKafka } from '@nestjs/microservices';
import { audioStatus } from 'src/common/audio.status';
import { AppealService } from 'src/appeal/appeal.service';

@Injectable()
export class EvaluationService {

  constructor(
    @InjectRepository(AgentEvaluation)
    private readonly agentEvaluationRepo: Repository<AgentEvaluation>,

    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,

    private readonly groupQuestionService: GroupQuestionService,
    private readonly appealService: AppealService,
    private readonly dataSource: DataSource,
  ) { }

  private async validateEvalCreation(groupQuestion: GroupQuestion, createEvaluationDto: CreateEvaluationDto | UpdateEvaluationDto) {
    if (createEvaluationDto instanceof CreateEvaluationDto) {
      //validate current date and group question ends@date
      const current_time = new Date()
      if (new Date(groupQuestion.evaluation_ends_at) < current_time) {
        console.error('evaluation end\'s at time passed.please communicate to the admin');
        throw new BadRequestException(`The evaluation deadline for "${groupQuestion.name}" has already passed. The deadline was ${groupQuestion.evaluation_ends_at}. Please contact the administrator for further assistance.`)
      }


      // validate the dto
      const { audios } = createEvaluationDto;
      const quesUnderGroupQue: string[] = groupQuestion.question.map(ques => ques.id)

      for (const audio of audios) {
        const questionsDto: string[] = audio.questions.map(ques => ques.question_id)

        const missedQuestion: string[] = quesUnderGroupQue.filter(question => !questionsDto.includes(question))
        if (missedQuestion.length > 0) {
          throw new NotAcceptableException(`audio with id ${audio.audio_id} not evaluated with these questions; ${missedQuestion} `)
        }
      }
    }
  }

  async create(createEvaluationDto: CreateEvaluationDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager: EntityManager = queryRunner.manager;

    try {
      const { agent_assignment_id, audios } = createEvaluationDto;

      const { groupQuestion } = await this.groupQuestionService.getActiveGroupQuestion()

      await this.validateEvalCreation(groupQuestion, createEvaluationDto)

      const createdAgentEvaluation = new AgentEvaluation()
      createdAgentEvaluation.agent_assignment_id = agent_assignment_id
      createdAgentEvaluation.group_question = groupQuestion
      await entityManager.save(AgentEvaluation, createdAgentEvaluation)

      let agentResult = 0

      // loop through audios
      for (const audio of audios) {
        const createdAudioEvaluation = new EvalPerAudio()
        createdAudioEvaluation.agent_evaluation = createdAgentEvaluation
        createdAudioEvaluation.audio_id = audio.audio_id;
        createdAudioEvaluation.feedback = audio.feedback
        const questions = audio.questions
        await entityManager.save(EvalPerAudio, createdAudioEvaluation)

        let audioResult = 0
        //loop through each question and evaluate specific audio
        for (const question of questions) {
          const createdQuestionEvaluation = new EvalPerQuestion()
          createdQuestionEvaluation.eval_per_audio = createdAudioEvaluation
          const foundQuestion = await entityManager.findOne(Question, { where: { id: question.question_id } });
          if (!foundQuestion) {
            throw new NotFoundException(`Question with id ${question.question_id} not found`);
          }
          createdQuestionEvaluation.question = foundQuestion;

          const foundQuestionAnswerOption = await entityManager.findOne(QuestionAnswerOp, {
            where: { id: question.selected_question_answer_option_id },
            relations: ['question']
          });
          if (!foundQuestionAnswerOption) {
            throw new NotFoundException(`Question answer option with id ${question.selected_question_answer_option_id} not found`);
          } else if (foundQuestionAnswerOption.question.id != foundQuestion.id) {
            throw new BadRequestException(`answer option with id ${foundQuestionAnswerOption.id} is not under question with id ${foundQuestion.id}`)
          }
          createdQuestionEvaluation.question_answerOp = foundQuestionAnswerOption
          audioResult += foundQuestionAnswerOption.weight
          createdQuestionEvaluation.updated_at = null
          await entityManager.save(EvalPerQuestion, createdQuestionEvaluation)
        }
        createdAudioEvaluation.result = audioResult
        agentResult += audioResult
        createdAudioEvaluation.updated_at = null
        await entityManager.save(EvalPerAudio, createdAudioEvaluation)
      }
      createdAgentEvaluation.result = agentResult / audios.length;
      createdAgentEvaluation.updated_at = null;
      await entityManager.save(AgentEvaluation, createdAgentEvaluation);
      await entityManager.queryRunner?.commitTransaction()

      // // produce kafka for each audio to update audio status at audio service
      // for (const audio of audios) {
      //   const message = {
      //     audio_id: audio.audio_id,
      //     status: audioStatus.OPENED
      //   }
      //   const { message: audioKafkaMessage } = this.UpdateAudioStatus(message)
      //   console.log(audioKafkaMessage);
      // }


      // // produce kafka for notifing the evaluated agent
      // const notifyMessage = {
      //   assignmentId: agent_assignment_id,
      //   evaluation: createdAgentEvaluation
      // }
      // const { message: notifyKafkaMessage } = this.notifyAgentEval(notifyMessage)
      // console.log(notifyKafkaMessage);

      return {
        success: true,
        message: `Evaluation for assignment ID ${agent_assignment_id} under group question "${groupQuestion.name}" has been successfully created.`,
        evaluation: createdAgentEvaluation
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error creating evaluation:', error.code);
      if (error.code == '23505') {
        throw new BadRequestException('An evaluation for this assignment already exists.');
      }
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof NotAcceptableException) {
        throw error;
      }
      throw new InternalServerErrorException('An unexpected error occurred while creating the evaluation.');
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(page: number, limit: number, month: string, year: string, sortOrder: 'asc' | 'desc' = 'desc') {
    try {
      const where: any = {};
      if (year && month) {
        where.year_month = `${year}-${month}`;
      } else if (year) {
        where.year_month = Like(`${year}-%`);
      } else if (month) {
        where.year_month = `${month}`;
      }

      const paginatedEvaluations = await paginate(
        this.agentEvaluationRepo,
        page,
        limit,
        {
          relations: ['group_question', 'eval_per_audio', 'eval_per_audio.appeal', 'eval_per_audio.eval_per_question', 'eval_per_audio.eval_per_question.question_answerOp', 'eval_per_audio.eval_per_question.question'],
          order: { created_at: sortOrder },
          where
        }
      );
      return {
        success: true,
        evaluation: paginatedEvaluations.data,
        meta: paginatedEvaluations.meta
      }
    } catch (error) {
      console.error('Error finding all evaluations:', error);
      throw new InternalServerErrorException("An internal server error occurred while fetching evaluations.");
    }
  }

  async findOne(id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager: EntityManager = queryRunner.manager;
    try {
      const res = await entityManager.findOne(AgentEvaluation, {
        where: { id },
        relations: ['group_question', 'eval_per_audio', 'eval_per_audio.appeal', 'eval_per_audio.eval_per_question', 'eval_per_audio.eval_per_question.question_answerOp', 'eval_per_audio.eval_per_question.question']
      })
      if (!res) {
        throw new NotFoundException(`evaluation with id ${id} not found`)
      }
      return {
        success: true,
        evaluation: res
      }
    } catch (error) {
      console.error(`Error finding evaluation with ID ${id}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('An internal server error occurred while finding the evaluation.');
    } finally {
      await queryRunner.release();
    }
  }

  async findOneByAssignmentId(id: string, month: string, year: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager: EntityManager = queryRunner.manager;
    try {
      const where: any = { agent_assignment_id: id };
      if (year && month) {
        where.year_month = `${year}-${month}`;
      } else if (year) {
        where.year_month = Like(`${year}-%`);
      } else if (month) {
        where.year_month = `${month}`;
      }

      const evaluation = await entityManager.findOne(AgentEvaluation, {
        where,
        relations: ['group_question', 'eval_per_audio', 'eval_per_audio.appeal', 'eval_per_audio.eval_per_question', 'eval_per_audio.eval_per_question.question_answerOp', 'eval_per_audio.eval_per_question.question_answerOp.answer_option_lookup', 'eval_per_audio.eval_per_question.question', 'eval_per_audio.eval_per_question.question.question_lookup', 'complain']
      })
      if (!evaluation) {
        throw new NotFoundException(`evaluation with assignment id ${id} not found`)
      }
      return {
        success: true,
        evaluation: evaluation
      }
    } catch (error) {
      console.error(`Error finding evaluation with assignment ID ${id}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('An internal server error occurred while finding the evaluation.');
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, updateEvaluationDto: UpdateEvaluationDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager: EntityManager = queryRunner.manager;
    try {
      // check the agent evaluation using the incomming id
      const agentEvaluation = await entityManager.findOne(AgentEvaluation, { where: { id } })
      if (!agentEvaluation) {
        throw new NotFoundException(`agent evaluation with ${id} not found`)
      }
      await entityManager.save(AgentEvaluation, agentEvaluation)
      let newAgentResult = 0
      let isAppealUpdate = false;
      for (const updateAudioEvaluationDto of updateEvaluationDto.audios) {
        // check existance of evaluation per audio here
        const evalPerAudio = await entityManager.findOne(EvalPerAudio, {
          where: { id: updateAudioEvaluationDto.audio_evaluation_id },
          relations: ['appeal']
        })

        if (!evalPerAudio) {
          throw new NotFoundException(`evaluation per audio with ${updateAudioEvaluationDto.audio_evaluation_id} not found`)
        }
        const intialResult = evalPerAudio?.result
        let newAudioResult = 0
        for (const updateQuestionEvaluationDto of updateAudioEvaluationDto.questions) {
          // check existance of evaluation per question here
          const evalPerQue = await entityManager.findOne(EvalPerQuestion, {
            where: { id: updateQuestionEvaluationDto.question_evaluation_id },
            relations: ['eval_per_audio', 'question']
          })
          if (!evalPerQue) {
            throw new NotFoundException(`evaluation per question for audio ${updateAudioEvaluationDto.audio_evaluation_id} with id ${updateQuestionEvaluationDto.question_evaluation_id} not found`)
          } else if (evalPerQue.eval_per_audio.id != evalPerAudio.id) {
            throw new BadRequestException(`evaluation per question and evaluation per audio missmatched, allignment issue occured.`)
          }
          const questionAnswerOP = await entityManager.findOne(QuestionAnswerOp, {
            where: { id: updateQuestionEvaluationDto.updated_selected_question_answer_option_id },
            relations: ['question']
          })

          if (!questionAnswerOP) {
            throw new NotFoundException(`Question answer option with id ${updateQuestionEvaluationDto.updated_selected_question_answer_option_id} not found`);
          } else if (questionAnswerOP.question.id != evalPerQue.question.id) {
            throw new BadRequestException('answer option and question is mismatched, allignment issue occured.')
          }
          evalPerQue.question_answerOp = questionAnswerOP
          newAudioResult += questionAnswerOP.weight
          await entityManager.save(EvalPerQuestion, evalPerQue)
        }
        evalPerAudio.result = newAudioResult
        if (evalPerAudio.appeal !== null) {
          isAppealUpdate = true;
          // should throw bad request exception if new_result < intial_result
          if (newAudioResult < intialResult) {
            throw new BadRequestException(`Cannot decrease the evaluation result for audio evaluation ID ${updateAudioEvaluationDto.audio_evaluation_id} after an appeal. The updated result must be equal to or greater than the initial result.`);
          }
          await this.closeAppeal(evalPerAudio, intialResult, newAudioResult)
        }

        await entityManager.save(EvalPerAudio, evalPerAudio)
        newAgentResult += evalPerAudio.result
      }
      agentEvaluation.result = newAgentResult / updateEvaluationDto.audios.length

      await entityManager.save(AgentEvaluation, agentEvaluation)
      await entityManager.queryRunner?.commitTransaction()

      // produce kafka for notifing the evaluated agent
      const notifyMessage = {
        assignmentId: agentEvaluation.agent_assignment_id,
        evaluation: agentEvaluation,
        isAppealUpdate
      }
      const { message: notifyKafkaMessage } = this.notifyAgentEval(notifyMessage)
      console.log(notifyKafkaMessage);

      return {
        success: true,
        message: "evaluation successfully updated",
        payload: agentEvaluation
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`Error updating evaluation with ID ${id}:`, error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('An unexpected error occurred while updating the evaluation.');
    } finally {
      await queryRunner.release();
    }
  }

  async closeAppeal(evalPerAudio: EvalPerAudio, intialResult: number, newAudioResult: number) {
    const changes = {
      from: intialResult,
      to: newAudioResult
    }
    const appealId = evalPerAudio.appeal.id
    await this.appealService.closeAppeal(appealId, changes)
  }

  async remove(id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager: EntityManager = queryRunner.manager;

    try {
      const agentEvaluation = await entityManager.findOne(AgentEvaluation, { where: { id } })
      if (!agentEvaluation) {
        throw new NotFoundException(`agent evaluation with ${id} not found`)
      }

      await entityManager.delete(AgentEvaluation, { id })
      await entityManager.queryRunner?.commitTransaction()
      return {
        success: true,
        message: `agent evaluation with id ${id} successfully deleted!`
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`Error removing evaluation with ID ${id}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('An internal server error occurred while removing the evaluation.');
    } finally {
      await queryRunner.release();
    }
  }

  async softDelete(id: string) {
    try {
      const agentEvaluation = await this.agentEvaluationRepo.findOne({ where: { id }, withDeleted: true })
      if (!agentEvaluation) {
        throw new NotFoundException(`agent evaluation with ${id} not found`)
      } else if (agentEvaluation.is_deleted) {
        throw new BadRequestException(`agent evaluation with ${id} is already soft deleted`)
      }

      await this.agentEvaluationRepo.softDelete(id);
      agentEvaluation.deleted_at = new Date()
      agentEvaluation.is_deleted = true
      await this.agentEvaluationRepo.save(agentEvaluation)
      return {
        success: true,
        message: `agent evaluation with id ${id} successfully soft deleted!`,
        "temp deleted eval": agentEvaluation
      }
    } catch (error) {
      console.error(`Error soft-deleting evaluation with ID ${id}:`, error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('An internal server error occurred while soft-deleting the evaluation.');
    }
  }

  async restoreSoftDelete(id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager: EntityManager = queryRunner.manager;

    try {
      const agentEvaluation = await entityManager.findOne(AgentEvaluation, { where: { id }, withDeleted: true })
      if (!agentEvaluation) {
        throw new NotFoundException(`agent evaluation with ${id} not found`)
      } else if (!agentEvaluation.is_deleted) {
        throw new BadRequestException(`agent evaluation with ${id} is already not soft deleted`)
      }

      await entityManager.softDelete(AgentEvaluation, { id: id });
      agentEvaluation.is_deleted = false
      agentEvaluation.deleted_at = null
      await entityManager.save(AgentEvaluation, agentEvaluation)
      await entityManager.queryRunner?.commitTransaction();

      return {
        success: true,
        message: `agent evaluation with id ${id} successfully restored.`,
        "temp deleted eval": agentEvaluation
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`Error restoring evaluation with ID ${id}:`, error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('An internal server error occurred while restoring the evaluation.');
    } finally {
      await queryRunner.release();
    }
  }

  //agent evaluation id
  async close(id: string) {
    try {
      const evaluation = await this.agentEvaluationRepo.findOne({
        where: { id },
        relations: ['eval_per_audio', 'eval_per_audio.appeal']
      })

      if (!evaluation) {
        throw new NotFoundException(`evaluation with id ${id} not found.`)
      }

      const audioEvaluations: EvalPerAudio[] = evaluation.eval_per_audio
      for (const audioEvaluation of audioEvaluations) {
        if (audioEvaluation.appeal && (audioEvaluation.appeal.status != appealStatus.CLOSED)) {
          throw new BadRequestException(`Appeal for audio with ID ${audioEvaluation.audio_id} is still open. Please resolve and close all appeals before closing the agent evaluation.`)
        }
      }
      evaluation.status = agentEvalStatus.CLOSED

      await this.agentEvaluationRepo.save(evaluation)

      // produce kafka for each audio to update audio status at audio service
      const audioIds = evaluation.eval_per_audio.map(evalPerAudio => evalPerAudio.audio_id)
      for (const audioId of audioIds) {
        const message = {
          audio_id: audioId,
          status: audioStatus.CLOSED
        }
        const { message: kafkaMessage } = this.UpdateAudioStatus(message)
        console.log(kafkaMessage);
      }

      return {
        success: true,
        message: `Agent evaluation with ID ${id} has been successfully closed. Status updated to "${evaluation.status}". All related audio evaluations have been marked as CLOSED.`,
        evaluation,
      }
    } catch (error) {
      console.error(`Error closing evaluation with ID ${id}:`, error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while closing the evaluation.');
    }
  }

  UpdateAudioStatus(message: { audio_id: string, status: string }) {
    this.kafkaClient.emit('evaluation_status_updater', message);
    return {
      message: `Audio status update: Audio with ID "${message.audio_id}" has been changed to "${message.status}". The status change event has been successfully emitted to the audio service via Kafka.`
    };
  }

  notifyAgentEval(message: { assignmentId: string, evaluation: AgentEvaluation, isAppealUpdate?: boolean }) {
    this.kafkaClient.emit('notify_agent', message);
    if (message.isAppealUpdate) {
      return { message: `The evaluation for assignment ID ${message.assignmentId} has been updated following an appeal review. The changes have been successfully processed and the updated evaluation has been produced to the UMS service.` };
    }
    return { message: `evaluator-agents assignment with id ${message.assignmentId} has been evaluated and it's assignment id for this specific avaluation is produced to ums service.` };
  }
}
