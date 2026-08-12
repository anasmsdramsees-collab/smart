import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from '../database/entities';
import { CreatePropertyDto } from './dto/create-property.dto';

@Injectable()
export class PropertiesService {
  constructor(@InjectRepository(Property) private readonly properties: Repository<Property>) {}

  list(organizationId: string): Promise<Property[]> {
    return this.properties.find({ where: { organizationId } });
  }

  async getOne(organizationId: string, propertyId: string): Promise<Property> {
    const property = await this.properties.findOne({ where: { id: propertyId, organizationId } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  create(organizationId: string, dto: CreatePropertyDto): Promise<Property> {
    return this.properties.save(this.properties.create({ organizationId, ...dto }));
  }
}
