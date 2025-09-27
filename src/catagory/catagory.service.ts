import { HttpException, Injectable, NotFoundException, BadRequestException, InternalServerErrorException, HttpStatus } from '@nestjs/common';
import { CreateCatagoryDto } from './dto/create-catagory.dto';
import { UpdateCatagoryDto } from './dto/update-catagory.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Catagory } from './entities/catagory.entity';
import { Repository } from 'typeorm';
import { Question } from 'src/group-question/entities/question-entities/question.entity';
import { paginate } from 'src/common/utils/paginate';

@Injectable()
export class CatagoryService {
  constructor(
    @InjectRepository(Catagory)
    private readonly catagoryRepo: Repository<Catagory>,

    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>
  ) { }

  async create(createCatagoryDto: CreateCatagoryDto) {
    try {
      const doesExist = await this.catagoryRepo.findOne({ where: { name: createCatagoryDto.name } })
      if (doesExist) {
        throw new HttpException("duplicate entry, this catagory already created", 400)
      }
      const catagory = this.catagoryRepo.create(createCatagoryDto)
      catagory.updated_at = null
      await this.catagoryRepo.save(catagory)
      return {
        success: true,
        message: "Catagory successfully created",
        catagory
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      } else {
        throw new InternalServerErrorException("Error occured during creating catagory")
      }
    }
  }

  async findAll(page: number, limit: number, sortOrder: string) {
    try {
      const sorting = (sortOrder === 'ASC' || sortOrder === 'DESC') ? sortOrder : 'DESC';
      const paginatedCatagories = await paginate(this.catagoryRepo, page, limit, sorting)
      return {
        success: true,
        catagories: paginatedCatagories.data,
        meta: paginatedCatagories.meta
      }
    } catch (error) {
      console.error(error);

      throw new InternalServerErrorException("somthing bad happend")
    }
  }

  async findOne(id: string) {
    try {
      const catagory = await this.catagoryRepo.findOne({ where: { id: id }, withDeleted: true })
      if (!catagory) {
        throw new NotFoundException("Category not found")
      } else if (catagory.is_deleted) {
        throw new BadRequestException(`catagory with id ${id} is soft deleted`)
      }
      return {
        success: true,
        catagory
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error
      } else if (error.code == "22P02") {
        throw new HttpException("invalid catagory uuid", 400)
      } else {
        console.error(error);
        throw new InternalServerErrorException("Error occurred during looking for specified catagory");
      }
    }
  }

  async getAllQuesPerCatagory(id: string) {
    const questionCount = await this.questionRepo.count({
      where: {
        catagory: {
          id: id,
        },
      },
    });

    const questions = await this.questionRepo.find({
      where: {
        catagory: {
          id: id,
        },
      }, relations: ['question_lookup']
    });
    return {
      success: true,
      questionCount,
      questions
    };
  }

  async update(id: string, updateCatagoryDto: UpdateCatagoryDto) {
    try {
      const { catagory } = await this.findOne(id)
      const updated = this.catagoryRepo.merge(catagory, updateCatagoryDto)

      updated.updated_at = new Date()

      await this.catagoryRepo.save(updated);

      return {
        success: true,
        message: "Catagory updated successfully",
        "updated catagory": updated
      }
    }
    catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else {
        console.error(error);
        throw new InternalServerErrorException("Error occured during updeting catagories")
      }
    }
  }

  async softDelete(id: string) {
    try {
      const { catagory } = await this.findOne(id);

      await this.catagoryRepo.softDelete(id)
      catagory.is_deleted = true
      catagory.deleted_at = new Date()

      await this.catagoryRepo.save(catagory);

      return {
        success: true,
        message: "Category soft-deleted successfully",
        "soft deleted catagory": catagory,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException("Error occurred during soft deletion");
    }
  }

  async restoreSoftDelete(id: string) {
    try {
      const catagory = await this.catagoryRepo.findOne({ where: { id }, withDeleted: true })

      if (!catagory) {
        throw new NotFoundException("catagory not found")
      } else if (!catagory.is_deleted) {
        throw new BadRequestException("already restored or not soft deleted catagory")
      }

      await this.catagoryRepo.restore(id);
      catagory.is_deleted = false
      catagory.deleted_at = null
      await this.catagoryRepo.save(catagory)

      return {
        success: true,
        message: "Catagory is restored successfully",
        "restored catagory": catagory
      }
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      } else if (error.code == "22P02") {
        throw new HttpException("invalid catagory uuid", 400)
      } else {
        throw new HttpException("error happend during restoring soft delete", 500)
      }
    }
  }

  async remove(id: string): Promise<{
    success: boolean,
    message: string,
    "deleted catagory": object
  }> {
    try {
      const deletedCatagory = await this.findOne(id);
      await this.catagoryRepo.delete(id);
      return {
        success: true,
        message: "Category successfully deleted",
        "deleted catagory": deletedCatagory.catagory
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error
      } else if (error.code == "22P02") {
        throw new HttpException("invalid catagory uuid", 400)
      } else if (error.code == 23503) {
        throw new BadRequestException("this catagory id is referenced in question table")
      } else {
        throw new HttpException('Failed to delete catagory', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
}
