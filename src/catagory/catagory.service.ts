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
        throw new NotFoundException("Category not found")
      }
      return catagory;
    } catch (error) {
      if (error instanceof NotFoundException) {
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

      if (category.is_deleted) {
        throw new BadRequestException("Category is already deleted");
      }

      category.is_deleted = true;
      category.deleted_at = new Date();

      await this.catagoryRepo.save(category);

      return {
        message: "Category soft-deleted successfully",
        category,
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
      const catagory = await this.findOne(id)
      if (!catagory.is_deleted) {
        throw new BadRequestException("restored or non-deleted catagory")
      }
      catagory.is_deleted = false
      catagory.deleted_at = null
      await this.catagoryRepo.save(catagory)
      return { message: "Catagory is restored successfully", catagory }
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
      } else if(error.code == 23503 ){
        throw new BadRequestException("this catagory id is referenced in question table")
      }
      throw new HttpException('Failed to delete catagory', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
