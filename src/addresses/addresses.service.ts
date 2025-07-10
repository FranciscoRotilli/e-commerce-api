import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddressStatus, Prisma } from 'generated/prisma';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createAddressDto: CreateAddressDto, userId: string) {
    const { isPrimary, ...addressData } = createAddressDto;

    if (isPrimary) {
      return this.prisma.$transaction(async (tx) => {
        await tx.address.updateMany({
          where: {
            userId: userId,
          },
          data: {
            isPrimary: false,
          },
        });

        const newAddress = await tx.address.create({
          data: {
            ...addressData,
            isPrimary: true,
            userId: userId,
          },
        });
        return newAddress;
      });
    } else {
      return this.prisma.address.create({
        data: {
          ...addressData,
          isPrimary: false,
          userId: userId,
        },
      });
    }
  }

  async findAll(userId: string) {
    return await this.prisma.address.findMany({
      where: { userId: userId },
    });
  }

  async findOne(id: string, userId: string) {
    const address = await this.prisma.address.findUnique({
      where: { id, userId: userId },
    });
    if (!address) {
      throw new NotFoundException(`Address with ID "${id}" not found.`);
    }
    return address;
  }

  async update(id: string, updateAddressDto: UpdateAddressDto, userId: string) {
    const addresExists = await this.prisma.address.findUnique({
      where: { id, userId },
    });

    if (!addresExists) {
      throw new NotFoundException(`Address with ID "${id}" not found.`);
    }

    const { isPrimary, ...addressData } = updateAddressDto;
    if (isPrimary) {
      return this.prisma.$transaction(async (tx) => {
        await tx.address.updateMany({
          where: {
            userId: userId,
          },
          data: {
            isPrimary: false,
          },
        });

        const newAddress = await tx.address.update({
          where: { id, userId },
          data: {
            ...addressData,
            isPrimary: true,
          },
        });
        return newAddress;
      });
    } else {
      return this.prisma.address.update({
        where: { id, userId: userId },
        data: {
          ...addressData,
          isPrimary: false,
        },
      });
    }
  }

  async disable(id: string, userId: string) {
    try {
      return await this.prisma.address.update({
        where: { id, userId: userId },
        data: {
          status: AddressStatus.INACTIVE,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Address with ID "${id}" not found or does not belong to the user.`,
        );
      }
      throw error;
    }
  }
}
