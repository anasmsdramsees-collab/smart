import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building, Room } from '../database/entities';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    @InjectRepository(Building) private readonly buildings: Repository<Building>,
  ) {}

  private async assertBuildingInOrg(organizationId: string, buildingId: string): Promise<void> {
    const building = await this.buildings
      .createQueryBuilder('building')
      .innerJoin('building.property', 'property')
      .where('building.id = :buildingId', { buildingId })
      .andWhere('property.organizationId = :organizationId', { organizationId })
      .getOne();
    if (!building) {
      throw new NotFoundException('Building not found');
    }
  }

  async list(organizationId: string, buildingId: string): Promise<Room[]> {
    await this.assertBuildingInOrg(organizationId, buildingId);
    return this.rooms.find({ where: { buildingId } });
  }

  async create(organizationId: string, buildingId: string, dto: CreateRoomDto): Promise<Room> {
    await this.assertBuildingInOrg(organizationId, buildingId);
    return this.rooms.save(this.rooms.create({ buildingId, ...dto }));
  }
}
