import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Appeal } from './entities/appeal.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { UpdateAppealDto } from './dto/update-appeal.dto';
import { EvalPerAudio } from 'src/evaluation/entities/evaluationPerAudio.entity';
import { appealStatus } from 'src/common/appeal.status';
import { paginate } from 'src/common/utils/paginate';
import { AppealComplain } from './entities/appealComplain.entity';
import { AgentEvaluation } from 'src/evaluation/entities/evaluation.entity';
import { agentEvalStatus } from 'src/common/agent_evaluation.status';

@Injectable()
export class AppealService {
  constructor(
    @InjectRepository(Appeal)
    private readonly appealRepo: Repository<Appeal>,

    private readonly datasource: DataSource,
  ) { }

  async create(id: string, createAppealDto: CreateAppealDto) {
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager: EntityManager = queryRunner.manager;
    try {
      let agentEvaluation = await entityManager.findOne(AgentEvaluation, {
        where: {
          id: id
        }, relations: ['eval_per_audio', 'eval_per_audio.appeal']
      })
      if (!agentEvaluation) {
        throw new BadRequestException(`Agent evaluation with id ${id} not found. Unable to create appeal.`);
      }

      const newComplain: AppealComplain = entityManager.create(AppealComplain, {
        complain: createAppealDto.complain
      })
      await entityManager.save(AppealComplain, newComplain)

      agentEvaluation.complain = newComplain
      await entityManager.save(AgentEvaluation, agentEvaluation)

      for (const audioEvalId of createAppealDto.audio_evaluation_ids) {
        const audioEvaluation = await entityManager.findOne(EvalPerAudio, {
          where: {
            id: audioEvalId
          }, relations: ['appeal', 'agent_evaluation']
        })
        if (!audioEvaluation) {
          throw new BadRequestException(`audio evaluation with id ${audioEvalId} not found under agent valuation with id ${id}`)
        }
        if (audioEvaluation.agent_evaluation.id !== agentEvaluation.id) {
          throw new BadRequestException(`Audio evaluation with id ${audioEvalId} does not belong to agent evaluation with id ${id}.`)
        }
        const newAppeal = entityManager.create(Appeal, {
          evaluation_per_audio: audioEvaluation
        })
        await entityManager.save(Appeal, newAppeal)
      }

      await queryRunner.commitTransaction();

      const updatedEvaluation = await entityManager.findOne(AgentEvaluation, {
        where: {
          id: id
        }, relations: ['complain', 'eval_per_audio', 'eval_per_audio.appeal']
      })
      return {
        success: true,
        message: "appeal successfully created.",
        complain: createAppealDto.complain ? createAppealDto.complain : 'no complain text exist',
        "agent evaluation": updatedEvaluation
      }
    }

    catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error
      } else if (error.code == 23505) {
        throw new ConflictException("Duplicate entry error: An appeal with the provided audio evaluation already exists.")
      } else {
        console.error(error);
        throw new InternalServerErrorException(`An unexpected error occurred while creating a new appeal: ${error?.message || error}`);
      }
    } finally {
      await queryRunner.release()
    }
  }

  async findAll(page: number, limit: number, sortOrder: 'ASC' | 'DESC' = 'DESC') {
    try {
      const paginatedAppeals = await paginate(this.appealRepo, page, limit,
        {
          order: { created_at: sortOrder },
          relations: ['evaluation_per_audio']
        }
      )
      return {
        success: true,
        appeals: paginatedAppeals.data,
        meta: paginatedAppeals.meta
      }
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException("error occured during fetching appeals");
    }
  }

  async findAllDraftedAppeal(page: number, limit: number, sortOrder: 'ASC' | 'DESC' = 'DESC') {
    try {
      const paginatedAppeals = await paginate(this.appealRepo, page, limit,
        {
          where: {
            status: appealStatus.DRAFT
          },
          order: { created_at: sortOrder },
          relations: ['evaluation_per_audio']
        }
      )
      return {
        success: true,
        appeals: paginatedAppeals.data,
        meta: paginatedAppeals.meta
      }
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException("error occured during fetching appeals");
    }
  }

  // agent-evaluation id
  async findAppealsPerAgentEvaluationId(id: string, sortOrder: 'ASC' | 'DESC' = 'DESC') {
    try {
      const appeals = await this.appealRepo.find({
        where: {
          evaluation_per_audio: {
            agent_evaluation: {
              id: id
            }
          }
        },
        relations: ['evaluation_per_audio', 'evaluation_per_audio.agent_evaluation'],
        order: { created_at: sortOrder }
      });

      return {
        success: true,
        appeals: appeals
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      } else {
        console.error(error);
        throw new InternalServerErrorException("something bad happend durring fetching this appeal")
      }
    }
  }

  // appealsId
  async findOne(id: string) {
    try {
      const appeal = await this.appealRepo.findOne({
        where: { id },
        relations: ['evaluation_per_audio', 'evaluation_per_audio.agent_evaluation']
      });
      if (!appeal) {
        throw new NotFoundException(`appeal with id ${id} not found.`)
      }

      return {
        success: true,
        appeal
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      } else {
        console.error(error);
        throw new InternalServerErrorException("something bad happend durring fetching this appeal")
      }
    }
  }

  // agent-evaluation id
  async update(id: string, updateAppealDto: UpdateAppealDto) {
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager: EntityManager = queryRunner.manager;

    try {
      const agentEvaluation = await entityManager.findOne(AgentEvaluation, {
        where: {
          id: id
        }, relations: ['eval_per_audio', 'eval_per_audio.appeal', 'complain']
      })
      if (!agentEvaluation) {
        throw new BadRequestException(`Agent evaluation with id ${id} not found. Unable to update appeal.`);
      }
      console.log("agent evaluation: ", agentEvaluation);

      const appeals = agentEvaluation.eval_per_audio.map(audioEval => audioEval.appeal).filter(Boolean);
      if (appeals.length == 0) {
        throw new BadRequestException(`No appeals found under agent evaluation with id ${id}. Update operation is not permitted because there are no appeals to update.`)
      }
      const existingAudioEvalId = agentEvaluation.eval_per_audio.map(audioEval => audioEval.id)
      if (updateAppealDto.audio_evaluation_ids.some(audioEvalId => !existingAudioEvalId.includes(audioEvalId))) {
        throw new BadRequestException(
          `One or more audio evaluation IDs provided in the update request do not exist under the agent evaluation with id ${id}. ` +
          `Invalid audio evaluation IDs: ${updateAppealDto.audio_evaluation_ids.filter(audioEvalId => !existingAudioEvalId.includes(audioEvalId)).join(', ')}. ` +
          `Please ensure all audio evaluation IDs belong to the specified agent evaluation before updating the appeal.`
        );
      }
      const existingAppealedAudioEvalId = (await entityManager.find(Appeal, {
        where: {
          evaluation_per_audio: {
            agent_evaluation: {
              id: id
            }
          }
        }, relations: ['evaluation_per_audio', 'evaluation_per_audio.agent_evaluation']
      })).map(appeal => appeal.evaluation_per_audio.id)

      const toBeAdded = updateAppealDto.audio_evaluation_ids.filter(audioEvalId => !existingAppealedAudioEvalId.includes(audioEvalId))
      const toBeDeleted = existingAppealedAudioEvalId.filter(appealedAudioId => !updateAppealDto.audio_evaluation_ids.includes(appealedAudioId))

      //create new appeal
      for (const audioEvalId of toBeAdded) {
        const audioEval = await entityManager.findOne(EvalPerAudio, {
          where: {
            id: audioEvalId
          }
        })
        if (!audioEval) {
          throw new NotFoundException(`Audio evaluation with id ${audioEvalId} not found.`);
        }
        const newAppeal = entityManager.create(Appeal, {
          evaluation_per_audio: audioEval
        })
        await entityManager.save(Appeal, newAppeal)
      }

      for (const audioEvalId of toBeDeleted) {
        const appealToBeDeleted = await entityManager.findOne(Appeal, {
          where: {
            evaluation_per_audio: {
              id: audioEvalId
            }
          }, relations: ['evaluation_per_audio']
        })
        await entityManager.delete(Appeal, appealToBeDeleted?.id)
      }

      const updatedAgentEval = await this.updateAgentComplain(entityManager, agentEvaluation, updateAppealDto)
      await entityManager.save(AgentEvaluation, updatedAgentEval)
      await queryRunner.commitTransaction()

      const updatedEvaluation = await entityManager.findOne(AgentEvaluation, {
        where: {
          id: id
        }, relations: ['complain', 'eval_per_audio', 'eval_per_audio.appeal']
      })

      return {
        success: true,
        message: 'Appeal(s) and complain text updated successfully for the specified agent evaluation.',
        agentEvaluation: updatedEvaluation
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error
      } else {
        console.error(error);
        throw new InternalServerErrorException("error occured during updating the appeal")
      }
    }
    finally {
      queryRunner.release()
    }
  }

  private async updateAgentComplain(entityManager: EntityManager, agentEval: AgentEvaluation, updateAppealDto: UpdateAppealDto) {
    if (updateAppealDto.audio_evaluation_ids.length === 0) {
      const id = agentEval.complain?.id;
      if (id) {
        agentEval.complain = null;
        await entityManager.save(AgentEvaluation, agentEval)
        await entityManager.delete(AppealComplain, id);
      }
    } else {
      if (agentEval.complain == null) {
        const newComplain = entityManager.create(AppealComplain, {
          complain: updateAppealDto.complain
        })
        agentEval.complain = newComplain
      } else {
        const updatedComplain = entityManager.merge(AppealComplain, agentEval.complain, {
          complain: updateAppealDto.complain
        })
        await entityManager.save(AppealComplain, updatedComplain)
      }
      await entityManager.save(AgentEvaluation, agentEval)
    }
    return agentEval;
  }

  // specific audio appeal id
  async remove(id: string) {
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager: EntityManager = queryRunner.manager;
    try {
      const { appeal: appealToBeDeleted } = await this.findOne(id)

      await this.appealRepo.delete(appealToBeDeleted.id)
      const { id: agentEvaluationId } = appealToBeDeleted.evaluation_per_audio.agent_evaluation
      const agentEvaluation = await entityManager.findOne(AgentEvaluation, {
        where: {
          id: agentEvaluationId
        }, relations: ['complain', 'eval_per_audio', 'eval_per_audio.appeal']
      })

      const appealMap = agentEvaluation?.eval_per_audio?.map(evalPerAudio => evalPerAudio.appeal).filter(Boolean);
      console.log(appealMap?.length);

      if (appealMap?.length === 0 && agentEvaluation) {
        const complainId = agentEvaluation.complain?.id
        agentEvaluation.complain = null
        await entityManager.save(AgentEvaluation, agentEvaluation)
        await entityManager.delete(AppealComplain, complainId)
      }
      await queryRunner.commitTransaction()
      return {
        success: true,
        message: "deleted successfully",
        "deleted appeals": appealToBeDeleted
      }
    }
    catch (error) {
      await queryRunner.rollbackTransaction()
      if (error instanceof NotFoundException) {
        throw error
      } else {
        console.error(error);
        throw new InternalServerErrorException("error occured during deleting this appeal")
      }
    } finally {
      await queryRunner.release()
    }
  }

  // //agent-evaluation id
  async removeAllApealsUnderAgent(id: string) {
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager: EntityManager = queryRunner.manager;
    try {
      const agentEvaluation = await entityManager.findOne(AgentEvaluation, {
        where: {
          id: id
        }, relations: ['complain', 'eval_per_audio', 'eval_per_audio.appeal']
      });
      if (!agentEvaluation) {
        throw new NotFoundException(`Agent evaluation with id ${id} not found.`);
      }

      // Delete complain if exists
      if (agentEvaluation.complain) {
        const complainId = agentEvaluation.complain.id;
        agentEvaluation.complain = null;
        await entityManager.save(AgentEvaluation, agentEvaluation);
        if (complainId) {
          await entityManager.delete(AppealComplain, complainId);
        }
      }

      // Delete all appeals under this agent evaluation
      for (const audioEval of agentEvaluation.eval_per_audio) {
        if (audioEval.appeal) {
          await entityManager.delete(Appeal, audioEval.appeal.id);
        }
      }

      await queryRunner.commitTransaction();

      const updatedEvaluation = await entityManager.findOne(AgentEvaluation, {
        where: {
          id: id
        }, relations: ['complain', 'eval_per_audio', 'eval_per_audio.appeal']
      })
      return {
        success: true,
        message: `all appeals of agent ${id} deleted successfully`,
        agentEvaluation: updatedEvaluation
      }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      if (error instanceof NotFoundException) {
        throw error
      } else {
        console.error(error);
        throw new InternalServerErrorException("error occured during deleting this appeal")
      }
    } finally {
      await queryRunner.release()
    }
  }

  // performed by admin
  async acceptAppeal(id: string) {
    try {
      const { appeal } = await this.findOne(id)
      if (appeal.status !== appealStatus.DRAFT) {
        throw new ConflictException('this specified appeal status should be draft to be changed to under review.')
      }

      appeal.is_accepted = true
      appeal.status = appealStatus.UNDER_REVIEW
      await this.appealRepo.save(appeal)

      return {
        success: true,
        message: `appeal with id ${id} status is successfully changed to ${appeal.status}`,
        appeal
      }
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error
      } else {
        console.error(error);
        throw new InternalServerErrorException("error occured during changing status to under review.")
      }
    }
  }

  // should be performed by admin
  async rejectAppeal(id: string) {
    try {
      const { appeal } = await this.findOne(id)
      if (appeal.status !== appealStatus.DRAFT) {
        throw new ConflictException('this specified appeal status should be draft to be reject the appeal.')
      }
      appeal.status = appealStatus.CLOSED
      appeal.is_rejected = true
      await this.appealRepo.save(appeal)

      return {
        success: true,
        message: `appeal with id ${id} status is successfully rejected and it's status changed to ${appeal.status}`,
        appeal
      }
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error
      } else {
        console.error(error);
        throw new InternalServerErrorException("error occured during changing status to under review.")
      }
    }
  }

  // should be performed by evaluator
  async closeAppeal(id: string, changes: { from: number, to: number }) {
    try {
      const { appeal } = await this.findOne(id)
      if (appeal.status !== appealStatus.UNDER_REVIEW) {
        throw new ConflictException('this specified appeal status should be underreview to be closed.')
      }

      appeal.changes = changes
      appeal.status = appealStatus.CLOSED
      await this.appealRepo.save(appeal)

      // find agentevaluation here then if no appeal under it close agent evaluation
      const agentEval = appeal.evaluation_per_audio.agent_evaluation
      const appeals = agentEval.eval_per_audio.map(appeal => appeal).filter(Boolean);
      if (appeals.length == 0) {
        agentEval.status = agentEvalStatus.CLOSED
      }

      return {
        success: true,
        message: `Appeal with id ${id} has been successfully closed. Its status is now '${appeal.status}'. The changes applied are: from ${changes.from} to ${changes.to}.`,
        appeal
      }
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error
      } else {
        console.error(error);
        throw new InternalServerErrorException("error occured during changing status to under review.")
      }
    }
  }
}
