import { HttpException, Injectable, NotFoundException, BadRequestException, InternalServerErrorException, HttpStatus } from '@nestjs/common';
import { CreateCatagoryDto } from './dto/create-catagory.dto';
import { UpdateCatagoryDto } from './dto/update-catagory.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Catagory } from './entities/catagory.entity';
import { Repository } from 'typeorm';
import { paginate } from 'src/utils/paginate';
import { QuestionLookup } from 'src/question-lookup/entities/question-lookup.entity';

@Injectable()
export class CatagoryService {
  constructor(
    @InjectRepository(Catagory)
    private readonly catagoryRepo: Repository<Catagory>,

    @InjectRepository(QuestionLookup)
    private readonly questionLookupRepo: Repository<QuestionLookup>
  ) { }

  async create(createCatagoryDto: CreateCatagoryDto) {
    try {
      const doesExist = await this.catagoryRepo.findOne({ where: { name: createCatagoryDto.name } })
      if (doesExist) {
        throw new HttpException(`Duplicate entry: The category with name '${createCatagoryDto.name}' already exists. Please use a different name.`, 400)
      }
      const catagory = this.catagoryRepo.create(createCatagoryDto)
      catagory.updated_at = null
      await this.catagoryRepo.save(catagory)
      return {
        success: true,
        message: `Category '${catagory.name}' created successfully with ID '${catagory.id}'.`,
        catagory
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      } else {
        throw new InternalServerErrorException(`Error occurred during creating category: ${error?.message || error}`)
      }
    }
  }

  async findAll(page: number, limit: number, sortOrder: 'ASC' | 'DESC' = 'DESC') {
    try {
      const paginatedCatagories = await paginate(this.catagoryRepo, page, limit, {
        order: { created_at: sortOrder },
      });
      return {
        success: true,
        catagories: paginatedCatagories.data,
        meta: paginatedCatagories.meta,
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('An error occurred while retrieving categories. Please try again later.');
    }
  }

  async findOne(id: string) {
    try {
      const catagory = await this.catagoryRepo.findOne({ where: { id: id }, withDeleted: true })
      if (!catagory) {
        throw new NotFoundException(`Category with id '${id}' not found. Please verify the provided id and try again.`)
      } else if (catagory.is_deleted) {
        throw new BadRequestException(`Category with id '${id}' has been soft deleted. Please restore it before accessing or modifying.`)
      }
      return {
        success: true,
        catagory
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error
      } else if (error.code == "22P02") {
        throw new HttpException("Invalid category UUID format. Please provide a valid UUID string for the category id.", 400)
      } else {
        console.error(error);
        throw new InternalServerErrorException(`Error occurred while retrieving category with id '${id}': ${error?.message || error}`);
      }
    }
  }

  async getAllQuesPerCatagory(id: string, page: number, limit: number, sortOrder: 'ASC' | 'DESC' = 'DESC') {
    const paginatedQuestions = await paginate(this.questionLookupRepo, page, limit, {
      where: {
        catagory: {
          id: id,
        },
      },
      order: {
        created_at: sortOrder
      },
    });

    return {
      success: true,
      questions: paginatedQuestions.data,
      meta: paginatedQuestions.meta,
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
        message: `Category '${updated.name}' (ID: '${updated.id}') updated successfully.`,
        "updated catagory": updated
      }
    }
    catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else {
        console.error(error);
        throw new InternalServerErrorException(`Error occurred during updating category with id '${id}': ${error?.message || error}`)
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
      throw new InternalServerErrorException(`Error occurred during soft deletion of category with id '${id}': ${error?.message || error}`);
    }
  }

  async restoreSoftDelete(id: string) {
    try {
      const catagory = await this.catagoryRepo.findOne({ where: { id }, withDeleted: true })

      if (!catagory) {
        throw new NotFoundException(`Category with id '${id}' not found. Please verify the provided id and try again.`)
      } else if (!catagory.is_deleted) {
        throw new BadRequestException("Category with id '${id}' is not soft deleted or has already been restored. No restoration is needed.")
      }

      await this.catagoryRepo.restore(id);
      catagory.is_deleted = false
      catagory.deleted_at = null
      await this.catagoryRepo.save(catagory)

      return {
        success: true,
        message: `Category '${catagory.name}' (ID: '${catagory.id}') has been successfully restored.`,
        "restored catagory": catagory
      }
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      } else if (error.code == "22P02") {
        throw new HttpException("Invalid category UUID format. Please provide a valid UUID string for the category id when restoring soft deleted categories.", 400)
      } else {
        throw new HttpException(`An error occurred while restoring the soft deleted category with id '${id}': ${error?.message || error}`, 500)
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
        message: `Category '${deletedCatagory.catagory.name}' (ID: '${deletedCatagory.catagory.id}') has been permanently deleted.`,
        "deleted catagory": deletedCatagory.catagory
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error
      } else if (error.code == "22P02") {
        throw new HttpException("Invalid category UUID format. Please provide a valid UUID string for the category id when deleting a category.", 400)
      } else if (error.code == 23503) {
        throw new BadRequestException("Cannot delete this category because it is referenced by one or more questions. Please remove or reassign the related questions before deleting the category.")
      } else {
        throw new InternalServerErrorException(`An unexpected error occurred while deleting category with id '${id}': ${error?.message || error}. Please try again later or contact support if the issue persists.`);
      }
    }
  }
}
