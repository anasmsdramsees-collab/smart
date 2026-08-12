import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building, Property } from '../database/entities';
import { CreateBuildingDto } from './dto/create-building.dto';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectRepository(Building) private readonly buildings: Repository<Building>,
    @InjectRepository(Property) private readonly properties: Repository<Property>,
  ) {}

  private async assertPropertyInOrg(organizationId: string, propertyId: string): Promise<void> {
    const property = await this.properties.findOne({ where: { id: propertyId, organizationId } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
  }

  async list(organizationId: string, propertyId: string): Promise<Building[]> {
    await this.assertPropertyInOrg(organizationId, propertyId);
    return this.buildings.find({ where: { propertyId } });
  }

  async create(organizationId: string, propertyId: string, dto: CreateBuildingDto): Promise<Building> {
    await this.assertPropertyInOrg(organizationId, propertyId);
    return this.buildings.save(this.buildings.create({ propertyId, ...dto }));
  }
}
