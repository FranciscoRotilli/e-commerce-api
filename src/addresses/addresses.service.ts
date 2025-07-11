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
            status: AddressStatus.ACTIVE,
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
      const hasPrimaryAddress = await this.prisma.address.findFirst({
        where: {
          userId: userId,
          isPrimary: true,
          status: AddressStatus.ACTIVE,
        },
      });

      return this.prisma.address.create({
        data: {
          ...addressData,
          isPrimary: !hasPrimaryAddress,
          userId: userId,
        },
      });
    }
  }

  async findAll(userId: string) {
    return await this.prisma.address.findMany({
      where: {
        userId: userId,
        status: AddressStatus.ACTIVE,
      },
      orderBy: {
        isPrimary: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const address = await this.prisma.address.findFirst({
      where: {
        id,
        userId: userId,
        status: AddressStatus.ACTIVE,
      },
    });
    if (!address) {
      throw new NotFoundException(`Address with ID "${id}" not found.`);
    }
    return address;
  }

  async update(id: string, updateAddressDto: UpdateAddressDto, userId: string) {
    const addressExists = await this.prisma.address.findFirst({
      where: {
        id,
        userId,
        status: AddressStatus.ACTIVE,
      },
    });

    if (!addressExists) {
      throw new NotFoundException(`Address with ID "${id}" not found.`);
    }

    const { isPrimary, ...addressData } = updateAddressDto;

    if (isPrimary === true) {
      return this.prisma.$transaction(async (tx) => {
        await tx.address.updateMany({
          where: {
            userId: userId,
            status: AddressStatus.ACTIVE,
            id: { not: id },
          },
          data: {
            isPrimary: false,
          },
        });

        const updatedAddress = await tx.address.update({
          where: { id },
          data: {
            ...addressData,
            isPrimary: true,
          },
        });
        return updatedAddress;
      });
    } else if (isPrimary === false && addressExists.isPrimary) {
      return this.prisma.$transaction(async (tx) => {
        const anotherAddress = await tx.address.findFirst({
          where: {
            userId: userId,
            status: AddressStatus.ACTIVE,
            id: { not: id },
          },
        });

        if (anotherAddress) {
          await tx.address.update({
            where: { id: anotherAddress.id },
            data: { isPrimary: true },
          });
        }

        const updatedAddress = await tx.address.update({
          where: { id },
          data: {
            ...addressData,
            isPrimary: false,
          },
        });
        return updatedAddress;
      });
    } else {
      return this.prisma.address.update({
        where: { id },
        data: addressData,
      });
    }
  }

  async disable(id: string, userId: string) {
    try {
      const address = await this.prisma.address.findFirst({
        where: {
          id,
          userId,
          status: AddressStatus.ACTIVE,
        },
      });

      if (!address) {
        throw new NotFoundException(
          `Address with ID "${id}" not found or does not belong to the user.`,
        );
      }

      if (address.isPrimary) {
        return this.prisma.$transaction(async (tx) => {
          const anotherAddress = await tx.address.findFirst({
            where: {
              userId: userId,
              status: AddressStatus.ACTIVE,
              id: { not: id },
            },
          });

          if (anotherAddress) {
            await tx.address.update({
              where: { id: anotherAddress.id },
              data: { isPrimary: true },
            });
          }

          return await tx.address.update({
            where: { id },
            data: {
              status: AddressStatus.INACTIVE,
              isPrimary: false,
            },
          });
        });
      } else {
        return await this.prisma.address.update({
          where: { id },
          data: {
            status: AddressStatus.INACTIVE,
          },
        });
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
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
