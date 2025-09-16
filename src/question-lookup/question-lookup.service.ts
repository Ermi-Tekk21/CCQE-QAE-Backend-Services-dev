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
                throw new HttpException('duplicate entry', 400)
            }
            const ansOP = this.questionLookupRepo.create(createQuestionLookupDto)
            await this.questionLookupRepo.save(ansOP)
            return { message: "question lookup created successfully", ansOP }
        } catch (error) {
            if (error instanceof HttpException) {
                throw error
            }
            console.error(error)
            throw new InternalServerErrorException("Error ocucured during creating question lookup")
        }
    }

    async findAll() {
        return await this.questionLookupRepo.find()
    }

    async findOne(id: string) {
        try {
            const questionL = await this.questionLookupRepo.findOne({ where: { id: id } })
            if (!questionL) {
                throw new NotFoundException("question lookup not found")
            }
            return questionL
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error
            }
            throw new InternalServerErrorException("Error occurred during finding the question lookup");
        }
    }


    async update(id: string, updateQuestionLookupDto: UpdateQuestionLookupDto) {
        try {
            const questionL = await this.findOne(id)
            const updated = this.questionLookupRepo.merge(questionL, updateQuestionLookupDto)

            updated.updated_at = new Date()

            await this.questionLookupRepo.save(updated)

            return { message: "question lookup updated successfully", updated }
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException("Error occured during updeting question lookup")
        }
    }



    async softDelete(id: string) {
        try {
            const questionL = await this.findOne(id);

            if (questionL.is_deleted) {
                throw new BadRequestException("question lookup is already deleted");
            }

            await this.questionLookupRepo.softDelete(id)
            questionL.is_deleted = true;
            questionL.deleted_at = new Date();

            await this.questionLookupRepo.save(questionL);

            return {
                message: "question lookup soft-deleted successfully",
                questionL,
            };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException("Error occurred during soft deletion");
        }
    }

    async restoreSoftDelete(id: string) {
        try {
            const questionL = await this.findOne(id)
            if (!questionL.is_deleted) {
                throw new BadRequestException("restored or non-deleted question lookup")
            }
            questionL.is_deleted = false
            questionL.deleted_at = null
            await this.questionLookupRepo.save(questionL)
            return { message: "question lookup is restored successfully", questionL }
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new HttpException("error happend during restoring soft delete", 500)
        }
    }

    async remove(id: string) {
        try {
            await this.findOne(id)
            await this.questionLookupRepo.delete(id)
            return { message: "question lookup successfully deleted" }
        } catch (error) {
            if (error instanceof NotFoundException) { throw error }
            throw new HttpException('Failed to delete question lookup', error.status);
        }
    }
}