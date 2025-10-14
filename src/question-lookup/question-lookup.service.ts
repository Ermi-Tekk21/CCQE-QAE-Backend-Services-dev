import { BadRequestException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateQuestionLookupDto } from './dto/create-question-lookup.dto';
import { UpdateQuestionLookupDto } from './dto/update-question-lookup.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { QuestionLookup } from './entities/question-lookup.entity';
import { Repository } from 'typeorm';
import { paginate } from 'src/utils/paginate';
import { Catagory } from 'src/catagory/entities/catagory.entity';

@Injectable()
export class QuestionLookupService {

    constructor(
        @InjectRepository(QuestionLookup)
        private readonly questionLookupRepo: Repository<QuestionLookup>,

        @InjectRepository(Catagory)
        private readonly catagoryRepo: Repository<Catagory>
    ) { }

    async create(createQuestionLookupDto: CreateQuestionLookupDto) {
        try {
            const doesExist = await this.questionLookupRepo.findOne({ where: { content: createQuestionLookupDto.content } })
            if (doesExist) {
                throw new HttpException('duplicate entry, this question already created', 400)
            }
            const catagory = await this.catagoryRepo.findOne({
                where: {
                    id: createQuestionLookupDto.catagoryId
                }
            })
            if (!catagory) {
                throw new NotFoundException(`Category with the provided ID ${createQuestionLookupDto.catagoryId} does not exist`)
            }
            const newQ = this.questionLookupRepo.create(createQuestionLookupDto)
            newQ.catagory = catagory
            newQ.updated_at = null
            await this.questionLookupRepo.save(newQ)
            return {
                success: true,
                message: `Question lookup '${newQ.content}' created successfully in category '${catagory.name}'.`,
                questionLookup: newQ
            }
        } catch (error) {
            if (error instanceof HttpException || error instanceof NotFoundException) {
                throw error
            } else {
                console.error(error)
                throw new InternalServerErrorException(`Error occurred during creating question lookup: ${error.message || error}`)
            }

        }
    }

    async findAll(page: number, limit: number, sortOrder: 'ASC' | 'DESC' = 'DESC') {
        const paginatedQuestions = await paginate(this.questionLookupRepo, page, limit, {
            relations: ['catagory'],
            order: { created_at: sortOrder }
        })
        return {
            success: true,
            questions: paginatedQuestions.data,
            meta: paginatedQuestions.meta
        }
    }

    async findOne(id: string) {
        try {
            const questionL = await this.questionLookupRepo.findOne({ where: { id: id }, relations: ['catagory'], withDeleted: true })
            if (!questionL) {
                throw new NotFoundException(`Question lookup with ID '${id}' not found`)
            } else if (questionL.is_deleted) {
                throw new BadRequestException(`Question lookup with ID '${id}' has been soft deleted. Please restore it before accessing.`);
            }
            return {
                success: true,
                "question lookup": questionL
            }
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error
            } else {
                console.error(error);
                throw new InternalServerErrorException(`Unexpected error occurred while retrieving question lookup with ID '${id}': ${error.message || error}`);
            }
        }
    }


    async update(id: string, updateQuestionLookupDto: UpdateQuestionLookupDto) {
        try {
            const { ['question lookup']: questionL } = await this.findOne(id)
            const catagory = await this.catagoryRepo.findOne({
                where: {
                    id: updateQuestionLookupDto.catagoryId
                }
            })
            if (!catagory) {
                throw new NotFoundException(`Category with the provided ID ${updateQuestionLookupDto.catagoryId} does not exist`)
            }
            const updated = this.questionLookupRepo.merge(questionL, updateQuestionLookupDto)

            updated.updated_at = new Date()
            updated.catagory = catagory
            await this.questionLookupRepo.save(updated)

            return {
                success: true,
                message: `Question lookup '${updated.content}' updated successfully in category '${catagory.name}'.`,
                updated
            }
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            } else {
                throw new InternalServerErrorException(`An unexpected error occurred while updating the question lookup with ID '${id}'. Possible reasons could include database connectivity issues, invalid data, or server errors. Details: ${error.message || error}`);
            }
        }
    }

    async softDelete(id: string) {
        try {
            const { ['question lookup']: questionL } = await this.findOne(id)

            await this.questionLookupRepo.softDelete(id)
            questionL.is_deleted = true;
            questionL.deleted_at = new Date();

            await this.questionLookupRepo.save(questionL);

            return {
                success: true,
                message: `Question lookup '${questionL.content}' (ID: ${questionL.id}) has been soft-deleted successfully from category '${questionL.catagory.name ?? "N/A"}'.`,
                questionLookup: questionL,
            };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            } else {
                throw new InternalServerErrorException(`An unexpected error occurred while soft deleting the question lookup with ID '${id}'. Possible reasons could include database connectivity issues, invalid data, or server errors. Details: ${error.message || error}`);
            }
        }
    }

    async restoreSoftDelete(id: string) {
        try {
            const questionL = await this.questionLookupRepo.findOne({ where: { id: id }, withDeleted: true })
            if (!questionL) {
                throw new NotFoundException("question lookup not found")
            } else if (!questionL.is_deleted) {
                throw new BadRequestException("Cannot restore: the question lookup is not deleted or has already been restored.")
            }

            await this.questionLookupRepo.restore(id)
            questionL.is_deleted = false
            questionL.deleted_at = null
            await this.questionLookupRepo.save(questionL)
            return {
                success: true,
                message: `Question lookup '${questionL.content}' (ID: ${questionL.id}) has been successfully restored to category '${questionL.catagory?.name ?? "N/A"}'.`,
                questionLookup: questionL
            }
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            } else {
                throw new InternalServerErrorException(`An unexpected error occurred while restoring the question lookup with ID '${id}'. Possible reasons could include database connectivity issues, invalid data, or server errors. Details: ${error.message || error}`);
            }
        }
    }

    async remove(id: string) {
        try {
            const deletedquestionLookup = await this.findOne(id)
            await this.questionLookupRepo.delete(id)
            return {
                success: true,
                message: `Question lookup '${deletedquestionLookup["question lookup"].content}' (ID: ${id}) has been permanently deleted from category '${deletedquestionLookup["question lookup"].catagory?.name ?? "N/A"}'.`,
                deletedQuestionLookup: deletedquestionLookup["question lookup"]
            }
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error
            } else if (error.code == 23503) {
                throw new BadRequestException('Cannot delete this question lookup because it is linked to one or more group questions. Please remove or update the related group questions before attempting to delete this question lookup.')
            } else {
                console.error(error);
                throw new HttpException(
                    `Failed to delete question lookup with ID '${id}'. Reason: ${error.message || 'Unknown error'}`,
                    error.status || 500
                );
            }
        }
    }
}