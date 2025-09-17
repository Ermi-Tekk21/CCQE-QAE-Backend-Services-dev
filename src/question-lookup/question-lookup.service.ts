import { BadRequestException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateQuestionLookupDto } from './dto/create-question-lookup.dto';
import { UpdateQuestionLookupDto } from './dto/update-question-lookup.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { QuestionLookup } from './entities/question-lookup.entity';
import { Repository } from 'typeorm';

@Injectable()
export class QuestionLookupService {

    constructor(
        @InjectRepository(QuestionLookup)
        private readonly questionLookupRepo: Repository<QuestionLookup>
    ) { }

    async create(createQuestionLookupDto: CreateQuestionLookupDto) {
        try {
            const doesExist = await this.questionLookupRepo.findOne({ where: { content: createQuestionLookupDto.content } })
            if (doesExist) {
                throw new HttpException('duplicate entry, this question already created', 400)
            }
            const ansOP = this.questionLookupRepo.create(createQuestionLookupDto)
            ansOP.updated_at = null
            await this.questionLookupRepo.save(ansOP)
            return {
                success: true,
                message: "question lookup created successfully",
                ansOP
            }
        } catch (error) {
            if (error instanceof HttpException) {
                throw error
            } else {
                console.error(error)
                throw new InternalServerErrorException("Error ocucured during creating question lookup")
            }

        }
    }

    async findAll() {
        const questions = await this.questionLookupRepo.find()
        return {
            success: true,
            questions
        }
    }

    async findOne(id: string) {
        try {
            const questionL = await this.questionLookupRepo.findOne({ where: { id: id }, withDeleted: true })
            if (!questionL) {
                throw new NotFoundException("question lookup not found")
            } else if (questionL.is_deleted) {
                throw new BadRequestException("question lookup is soft deleted");
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
                throw new InternalServerErrorException("Error occurred during finding the question lookup");
            }
        }
    }


    async update(id: string, updateQuestionLookupDto: UpdateQuestionLookupDto) {
        try {
            const { ['question lookup']: questionL } = await this.findOne(id)
            const updated = this.questionLookupRepo.merge(questionL, updateQuestionLookupDto)

            updated.updated_at = new Date()

            await this.questionLookupRepo.save(updated)

            return {
                success: true,
                message: "question lookup updated successfully",
                updated
            }
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            } else {
                throw new InternalServerErrorException("Error occured during updeting question lookup")
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
                message: "question lookup soft-deleted successfully",
                questionL,
            };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            } else {
                throw new InternalServerErrorException("Error occurred during soft deletion");
            }
        }
    }

    async restoreSoftDelete(id: string) {
        try {
            const questionL = await this.questionLookupRepo.findOne({ where: { id: id }, withDeleted: true })
            if (!questionL) {
                throw new NotFoundException("question lookup not found")
            } else if (!questionL.is_deleted) {
                throw new BadRequestException("restored or non-deleted question lookup")
            }
            questionL.is_deleted = false
            questionL.deleted_at = null
            await this.questionLookupRepo.save(questionL)
            return { message: "question lookup is restored successfully", questionL }
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            } else {
                throw new HttpException("error happend during restoring soft delete", 500)
            }
        }
    }

    async remove(id: string) {
        try {
            const deletedquestionLookup = await this.findOne(id)
            await this.questionLookupRepo.delete(id)
            return {
                success: true,
                message: "question lookup successfully deleted",
                "deleted question lookup": deletedquestionLookup
            }
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error
            } else if (error.code == 23503) {
                throw new BadRequestException('this question lookup is linked to group question created before.')
            } else {
                console.error(error);
                throw new HttpException('Failed to delete question lookup', error.status);
            }
        }
    }
}