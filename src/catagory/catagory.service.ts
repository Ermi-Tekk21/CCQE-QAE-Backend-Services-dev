import { HttpException, Injectable } from '@nestjs/common';
import { CreateCatagoryDto } from './dto/create-catagory.dto';
import { UpdateCatagoryDto } from './dto/update-catagory.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Catagory } from './entities/catagory.entity';
import { Repository } from 'typeorm';
import { error } from 'console';

@Injectable()
export class CatagoryService {
  constructor(
    @InjectRepository(Catagory)
    private readonly catagoryRepo: Repository<Catagory>
  ) { }

  async create(createCatagoryDto: CreateCatagoryDto) {
    try {
      const catagory = this.catagoryRepo.create(createCatagoryDto)
      // catagory.created_by = "5fdcf88e-4ad1-4dd5-b257-de76aac8aab1" // request ums service for active session and fetch user_id
      await this.catagoryRepo.save(catagory)
      return { message: "Catagory successfully created", catagory }
    } catch (error) {
      console.error(error)
      throw new HttpException('Failed to create category', 500)
    }
  }

  async findAll() {
    try {
      return await this.catagoryRepo.find()
    } catch {
      throw new HttpException("somthing bad happend", 500)
    }
  }

  async findOne(id: string) {
    try {
      const catagory = await this.catagoryRepo.findOne({ where: { id: id } })
      if (!catagory) {
        throw new HttpException(`catagory with this ${id} not found.`, 404)
      }
      return { message: "" };
    } catch {
      console.error(error)
      throw new HttpException("somthing bad happend", 500)
    }
  }

  async update(id: string, updateCatagoryDto: UpdateCatagoryDto) {
    try {
      const catagory = await this.catagoryRepo.findOne({ where: { id } })
      if (!catagory) {
        throw new HttpException(`catagory with this ${id} not found.`, 404)
      }
      const updated = this.catagoryRepo.merge(catagory, updateCatagoryDto)
      updated.updated_at = new Date()
      await this.catagoryRepo.save(updated);

      return { message: "Catagory updated successfully", updated }
    }
    catch (error) {
      console.error(error)
    }
  }

  async remove(id: string) {
    try {
      await this.findOne(id)
      await this.catagoryRepo.delete(id)
      return { message: "Category successfully deleted" }
    } catch (error) {
      throw new HttpException('Failed to delete catagory', error.status);
    }
  }
}
