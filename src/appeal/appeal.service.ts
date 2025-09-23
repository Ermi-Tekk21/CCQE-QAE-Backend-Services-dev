import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { UpdateAppealDto } from './dto/update-appeal.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Appeal } from './entities/appeal.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EvalPerAudio } from 'src/evaluation/entities/evaluationPerAudio.entity';

@Injectable()
export class AppealService {
  constructor(
    @InjectRepository(Appeal)
    private readonly appealRepo: Repository<Appeal>,

    @InjectRepository(EvalPerAudio)
    private readonly evalPerAudioRepo: Repository<EvalPerAudio>,

    private readonly datasource: DataSource,
  ) { }

  async create(createAppealDto: CreateAppealDto) {
    try {
      const newAppeals: Appeal[] = []
      for (const audioAppealId of createAppealDto.audio_evaluation_ids) {
        console.log(audioAppealId);

        const audioEval = await this.evalPerAudioRepo.findOne({ where: { id: audioAppealId } });
        if (!audioEval) {
          throw new NotFoundException(`audio evaluation with id ${audioAppealId} not found.`);
        }
        const newAppeal = this.appealRepo.create({
          agent_id: createAppealDto.agent_id,
          evaluation_per_audio: audioEval
        });
        newAppeals.push(newAppeal)
      }

      await this.appealRepo.save(newAppeals);
      return {
        success: true,
        message: "appeal successfully created.",
        newAppeals
      }
    }
    catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      } else if (error.code == 23505) {
        throw new ConflictException("dubliacte entry error")
      } else {
        console.error(error);
        throw new InternalServerErrorException("error occured during creating new appeal");
      }
    }
  }

  async findAll() {
    try {
      const appeals = await this.appealRepo.find({ relations: ['evaluation_per_audio'] });
      return {
        success: true,
        appeals
      }
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException("error occured during fetching appeals");
    }
  }

  // agentid
  async findAppealsPerAgentId(id: string) {
    try {
      const appeals = await this.appealRepo.find({
        where: {
          agent_id: id
        }, relations: ['evaluation_per_audio', 'evaluation_per_audio.agent_evaluation']
      });
      if (!appeals || appeals.length == 0) {
        throw new NotFoundException(`appeal with id ${id} not found.`)
      }

      return {
        success: true,
        appeals
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
      const appeal = await this.appealRepo.findOne({ where: { id } });
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


  async update(id: string, updateAppealDto: UpdateAppealDto) {
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager: EntityManager = queryRunner.manager;

    try {
      const appeals = await entityManager.find(Appeal, {
        where: { agent_id: id.toString() },
        relations: ['evaluation_per_audio']
      })

      if (appeals.length == 0 || !appeals) {
        throw new NotFoundException(`appeals with agent id `)
      }
      const toBeAddedAudioEvalIds = updateAppealDto.audio_evaluation_ids.filter(audioEvalId =>
        !appeals.some(appeal => appeal.evaluation_per_audio?.id == audioEvalId)
      );

      const toBeDeleted: Appeal[] = appeals.filter(appeal =>
        !updateAppealDto.audio_evaluation_ids.some(audioEvalId => audioEvalId == appeal.evaluation_per_audio?.id)
      );


      const createDto: CreateAppealDto = {
        agent_id: id,
        audio_evaluation_ids: toBeAddedAudioEvalIds
      }

      const { newAppeals } = await this.create(createDto)
      const toBeDeletedIds = toBeDeleted.map(appeal => appeal.id);
      if (toBeDeletedIds.length > 0) {
        await this.appealRepo.delete(toBeDeletedIds);
      }
      return {
        success: true,
        agent_id: id,
        newAppeals
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      } else {
        console.error(error);
        throw new InternalServerErrorException("error occured during updating the appeal")
      }
    } finally {
      queryRunner.release()
    }
  }

  // specific audio appeal
  async remove(id: string) {
    try {
      const { appeal: appealToBeDeleted } = await this.findOne(id)
      await this.appealRepo.delete(appealToBeDeleted.id)

      return {
        success: true,
        message: "deleted successfully",
        "deleted appeals": appealToBeDeleted
      }
    }
    catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      } else {
        console.error(error);
        throw new InternalServerErrorException("error occured during deleting this appeal")
      }
    }
  }

  async removeAllApealsUnderAgent(id: string) {
    try {
      const { appeals } = await this.findAppealsPerAgentId(id)
      // If appeal is an array, map to ids; if it's a single object, wrap in array
      const appealIds = appeals.map((a) => a.id);
      await this.appealRepo.delete(appealIds)

      return {
        success: true,
        message: `all appeals of agent ${id} deleted successfully`
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      } else {
        console.error(error);
        throw new InternalServerErrorException("error occured during deleting this appeal")
      }
    }
  }
}
