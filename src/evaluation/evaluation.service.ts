import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEvaluationDto } from './dto/agent-evaluation-dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/agent-evaluation-dto/update-evaluation.dto';
import { DataSource, EntityManager } from 'typeorm';
import { GroupQuestion } from 'src/group-question/entities/group-question-entities/group-question.entity';
import { AgentEvaluation } from './entities/evaluation.entity';
import { EvalPerAudio } from './entities/evaluationPerAudio.entity';
import { EvalPerQuestion } from './entities/evaluationPerQuestion.entity';
import { Question } from 'src/group-question/entities/question-entities/question.entity';
import { QuestionAnswerOp } from 'src/group-question/entities/question-answer-option-entities/question_answerOP.entity';

@Injectable()
export class EvaluationService {

  constructor(
    private readonly dataSource: DataSource,
  ) { }

  async create(createEvaluationDto: CreateEvaluationDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager: EntityManager = queryRunner.manager;

    try {
      const { agent_assignment_id, audios } = createEvaluationDto;
      const groupQuestion = await entityManager.findOne(GroupQuestion, {
        where: {
          is_active: false // later i will change it to true
        }
      })

      if (!groupQuestion) {
        throw new NotFoundException("no active group question is found !")
      }

      const createdAgentEvaluation = new AgentEvaluation()
      createdAgentEvaluation.agent_assignment_id = agent_assignment_id
      createdAgentEvaluation.group_question = groupQuestion
      entityManager.save(AgentEvaluation, createdAgentEvaluation)

      let agentResult = 0

      // loop through audios
      for (const audio of audios) {
        const createdAudioEvaluation = new EvalPerAudio()
        createdAudioEvaluation.agent_evaluation = createdAgentEvaluation
        createdAudioEvaluation.audio_id = audio.audio_id;
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

          const foundQuestionAnswerOption = await entityManager.findOne(QuestionAnswerOp, { where: { id: question.selected_question_answer_option_id } });
          if (!foundQuestionAnswerOption) {
            throw new NotFoundException(`Question answer option with id ${question.selected_question_answer_option_id} not found`);
          }
          createdQuestionEvaluation.question_answerOP = foundQuestionAnswerOption
          audioResult += foundQuestionAnswerOption.weight
          await entityManager.save(EvalPerQuestion, createdQuestionEvaluation)
        }
        createdAudioEvaluation.result = audioResult
        agentResult += audioResult
        await entityManager.save(EvalPerAudio, createdAudioEvaluation)
      }
      createdAgentEvaluation.result = agentResult
      entityManager.save(AgentEvaluation, createdAgentEvaluation)
      await entityManager.queryRunner?.commitTransaction()

      return {
        success: true,
        message: "Evaluation is successfully created.",
        "created assignment": createdAgentEvaluation
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  findAll() {
    return `This action returns all evaluation`;
  }

  findOne(id: number) {
    return `This action returns a #${id} evaluation`;
  }

  update(id: number, updateEvaluationDto: UpdateEvaluationDto) {
    return `This action updates a #${id} evaluation`;
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
      console.error(error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
