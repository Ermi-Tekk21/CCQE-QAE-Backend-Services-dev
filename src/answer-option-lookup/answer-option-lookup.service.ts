import { BadRequestException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateAnswerOptionLookupDto } from './dto/create-answer-option-lookup.dto';
import { UpdateAnswerOptionLookupDto } from './dto/update-answer-option-lookup.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { AnswerOptionLookup } from './entities/answer-option-lookup.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AnswerOptionLookupService {
  constructor(
    @InjectRepository(AnswerOptionLookup)
    private readonly answerOptionLookupRepo: Repository<AnswerOptionLookup>
  ) { }

  async create(createAnswerOptionLookupDto: CreateAnswerOptionLookupDto) {
    try {
      const doesExist = await this.answerOptionLookupRepo.findOne({ where: { content: createAnswerOptionLookupDto.content } })
      if (doesExist) {
        throw new HttpException('duplicate entry', 400)
      }
      const ansOP = this.answerOptionLookupRepo.create(createAnswerOptionLookupDto)
      await this.answerOptionLookupRepo.save(ansOP)
      return { message: "Answer option lookup created successfully", ansOP }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      console.error(error)
      throw new InternalServerErrorException("Error ocucured during creating answer option lookup")
    }
  }

  async findAll() {
    return await this.answerOptionLookupRepo.find()
  }

  async findOne(id: string) {
    try {
      const ansOP = await this.answerOptionLookupRepo.findOne({ where: { id: id } })
      if (!ansOP) {
        throw new NotFoundException("answer option lookup not found")
      }
      return ansOP
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      throw new InternalServerErrorException("Error occurred during finding the answer option lookup");
    }
  }

  async update(id: string, updateAnswerOptionLookupDto: UpdateAnswerOptionLookupDto) {
    try {
      const ansOP = await this.findOne(id)
      const updated = this.answerOptionLookupRepo.merge(ansOP, updateAnswerOptionLookupDto)

      updated.updated_at = new Date()

      await this.answerOptionLookupRepo.save(updated)

      return { message: "answer option lookup updated successfully", updated }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException("Error occured during updeting answer option lookup")
    }
  }


  async softDelete(id: string) {
    try {
      const ansOP = await this.findOne(id);

      if (ansOP.is_deleted) {
        throw new BadRequestException("answer option lookup is already deleted");
      }

      ansOP.is_deleted = true;
      ansOP.deleted_at = new Date();

      await this.answerOptionLookupRepo.save(ansOP);

      return {
        message: "answeroption lookup soft-deleted successfully",
        ansOP,
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
      const ansOP = await this.findOne(id)
      if (!ansOP.is_deleted) {
        throw new BadRequestException("restored or non-deleted answer option lookup")
      }
      ansOP.is_deleted = false
      ansOP.deleted_at = null
      await this.answerOptionLookupRepo.save(ansOP)
      return { message: "answer option lookup is restored successfully", ansOP }
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
      await this.answerOptionLookupRepo.delete(id)
      return { message: "answer option lookup successfully deleted" }
    } catch (error) {
      if (error instanceof NotFoundException) { throw error }
      throw new HttpException('Failed to delete answer option lookup', error.status);
    }
  }
}
