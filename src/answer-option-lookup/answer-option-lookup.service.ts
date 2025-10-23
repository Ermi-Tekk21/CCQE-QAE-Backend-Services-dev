import { BadRequestException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateAnswerOptionLookupDto } from './dto/create-answer-option-lookup.dto';
import { UpdateAnswerOptionLookupDto } from './dto/update-answer-option-lookup.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { AnswerOptionLookup } from './entities/answer-option-lookup.entity';
import { ILike, Repository } from 'typeorm';
import { paginate } from 'src/utils/paginate';

@Injectable()
export class AnswerOptionLookupService {
    constructor(
        @InjectRepository(AnswerOptionLookup)
        private readonly answerOptionLookupRepo: Repository<AnswerOptionLookup>
    ) { }

    async create(createAnswerOptionLookupDto: CreateAnswerOptionLookupDto, user_id: string) {
        try {
            const doesExist = await this.answerOptionLookupRepo.findOne({ where: { content: createAnswerOptionLookupDto.content } })
            if (doesExist) {
                throw new HttpException('duplicate entry, this answer option already created', 400)
            }
            const ansOP = this.answerOptionLookupRepo.create(createAnswerOptionLookupDto)
            ansOP.created_by = user_id;
            ansOP.updated_at = null
            await this.answerOptionLookupRepo.save(ansOP)
            return {
                success: true,
                message: "Answer option lookup created successfully",
                "answer option": ansOP
            }
        } catch (error) {
            if (error instanceof HttpException) {
                throw error
            } else {
                console.error(error)
                throw new InternalServerErrorException("Error ocucured during creating answer option lookup")
            }

        }
    }

    async findAll(params: {
        page: number,
        limit: number,
        search: string,
        sortOrder: 'asc' | 'desc'
    }) {
        const {
            page,
            limit,
            sortOrder = 'desc',
            search
        } = params;

        const baseConditions: any = {};
        let where: any = baseConditions;

        if (search) {
            where = { ...baseConditions, content: ILike(`%${search}%`) };
        }

        const paginatedAnsOPs = await paginate(this.answerOptionLookupRepo, page, limit, {
            order: { created_at: sortOrder },
            where,
        });
        return {
            success: true,
            "lookup answer options": paginatedAnsOPs.data,
            meta: paginatedAnsOPs.meta
        }
    }

    async findOne(id: string) {
        try {
            const ansOP = await this.answerOptionLookupRepo.findOne({ where: { id: id }, withDeleted: true })
            if (!ansOP) {
                throw new NotFoundException("answer option lookup not found")
            } else if (ansOP.is_deleted) {
                throw new BadRequestException("answer option lookup is soft deleted");
            }
            return {
                success: true,
                "lookup answer option": ansOP
            }
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error
            } else {
                console.error(error);
                throw new InternalServerErrorException("Error occurred during finding the answer option lookup");
            }
        }
    }

    async update(id: string, updateAnswerOptionLookupDto: UpdateAnswerOptionLookupDto, user_id: string) {
        try {
            const { ['lookup answer option']: ansOP } = await this.findOne(id);
            const updated = this.answerOptionLookupRepo.merge(ansOP, updateAnswerOptionLookupDto);
            updated.updated_by = user_id;
            updated.updated_at = new Date();

            await this.answerOptionLookupRepo.save(updated)

            return {
                sucess: true,
                message: "answer option lookup updated successfully",
                updated
            }
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            } else {
                console.error(error);
                throw new InternalServerErrorException("Error occured during updeting answer option lookup")
            }
        }
    }


    async softDelete(id: string, user_id: string) {
        try {
            const { ['lookup answer option']: ansOP } = await this.findOne(id);

            await this.answerOptionLookupRepo.softDelete(id)
            ansOP.is_deleted = true;
            ansOP.deleted_by = user_id;
            ansOP.deleted_at = new Date();

            await this.answerOptionLookupRepo.save(ansOP);

            return {
                success: true,
                message: "answeroption lookup soft-deleted successfully",
                "soft deleted ansOP": ansOP,
            };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            } else {
                console.error(error)
                throw new InternalServerErrorException("Error occurred during soft deletion");
            }
        }
    }

    async restoreSoftDelete(id: string) {
        try {
            const ansOP = await this.answerOptionLookupRepo.findOne({ where: { id: id }, withDeleted: true })
            if (!ansOP) {
                throw new NotFoundException("answer option lookup not found")
            } else if (!ansOP.is_deleted) {
                throw new BadRequestException("restored or non-deleted answer option lookup")
            }

            await this.answerOptionLookupRepo.restore(id)
            ansOP.is_deleted = false;
            ansOP.deleted_at = null;
            ansOP.deleted_by = null;
            await this.answerOptionLookupRepo.save(ansOP)
            return {
                success: true,
                message: "answer option lookup is restored successfully",
                "answer option": ansOP
            }
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            } else {
                console.error(error);
                throw new HttpException("error happend during restoring soft delete", 500)
            }
        }
    }

    async remove(id: string) {
        try {
            const deletedAnswerOptionLookUp = await this.findOne(id)
            await this.answerOptionLookupRepo.delete(id)
            return {
                success: true,
                message: "answer option lookup successfully deleted",
                "deleted answer option lookup": deletedAnswerOptionLookUp['lookup answer option']
            }
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error
            } else if (error.code == 23503) {
                throw new BadRequestException('this answer option lookup is linked to group question created before.')
            } else {
                console.error(error);
                throw new InternalServerErrorException('Failed to delete answer option lookup');
            }
        }
    }
}