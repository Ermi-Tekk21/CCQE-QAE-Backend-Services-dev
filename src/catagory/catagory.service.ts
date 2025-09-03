import { HttpException, Injectable, NotFoundException, BadRequestException, InternalServerErrorException, HttpStatus } from '@nestjs/common';
import { CreateCatagoryDto } from './dto/create-catagory.dto';
import { UpdateCatagoryDto } from './dto/update-catagory.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Catagory } from './entities/catagory.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CatagoryService {
  constructor(
    @InjectRepository(Catagory)
    private readonly catagoryRepo: Repository<Catagory>
  ) { }

  async create(createCatagoryDto: CreateCatagoryDto) {
    try {
      const doesExist = await this.catagoryRepo.findOne({ where: { name: createCatagoryDto.name } })
      if (doesExist) {
        throw new HttpException("duplicate entry", 400)
      }
      const catagory = this.catagoryRepo.create(createCatagoryDto)
      await this.catagoryRepo.save(catagory)
      return { message: "Catagory successfully created", catagory }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new InternalServerErrorException("Error occured during creating catagory")
    }
  }

  async findAll() {
    try {
      return await this.catagoryRepo.find()
    } catch {
      throw new InternalServerErrorException("somthing bad happend")
    }
  }

  async findOne(id: string) {
    try {
      const catagory = await this.catagoryRepo.findOne({ where: { id: id } })
      if (!catagory) {
        const isDeleted = await this.catagoryRepo.findOne({ where: { id }, withDeleted: true })
        if (isDeleted) {
          throw new BadRequestException("Category is already soft deleted");
        } else {
          throw new NotFoundException("Category not found")
        }
      }
      return catagory;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error
      }
      throw new InternalServerErrorException("Error occurred during looking for specified catagory");
    }
  }

  async update(id: string, updateCatagoryDto: UpdateCatagoryDto) {
    try {
      const catagory = await this.findOne(id)
      const updated = this.catagoryRepo.merge(catagory, updateCatagoryDto)

      updated.updated_at = new Date()

      await this.catagoryRepo.save(updated);

      return { message: "Catagory updated successfully", updated }
    }
    catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException("Error occured during updeting catagories")
    }
  }

  async softDelete(id: string) {
    try {
      const category = await this.findOne(id);

      await this.catagoryRepo.softDelete(id)

      category.is_deleted = true
      category.deleted_at = new Date()

      await this.catagoryRepo.save(category);

      return {
        success: true,
        message: "Category soft-deleted successfully",
        "temp deleted catagory": category,
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

      if (!catagory?.is_deleted) {
        throw new BadRequestException("already restored or not soft deleted catagory")
      }
      await this.catagoryRepo.restore(id);

      const restoredCatagoryEntity = await this.catagoryRepo.findOne({ where: { id } });

      if (restoredCatagoryEntity) {
        restoredCatagoryEntity.is_deleted = false;
        restoredCatagoryEntity.deleted_at = null;
        await this.catagoryRepo.save(restoredCatagoryEntity);
      }

      return {
        success: true,
        message: "Catagory is restored successfully",
        "restored catagory": restoredCatagoryEntity
      }
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException("error happend during restoring soft delete", 500)
    }
  }

  async remove(id: string): Promise<{
    success: boolean,
    message: string,
  }> {
    try {
      await this.findOne(id);

      await this.catagoryRepo.delete(id);

      return {
        success: true,
        message: "Category successfully deleted",
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      } else if (error.code == 23503) {
        throw new BadRequestException("this catagory id is referenced in question table")
      }
      throw new HttpException('Failed to delete catagory', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
