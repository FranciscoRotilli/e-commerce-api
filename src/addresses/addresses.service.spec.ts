/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressStatus, AddressType, Prisma } from 'generated/prisma';

describe('AddressesService', () => {
  let service: AddressesService;

  const mockPrismaService = {
    address: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUserId = 'user-123';
  const mockAddressId = 'address-123';

  const mockAddress = {
    id: mockAddressId,
    name: 'Home',
    type: AddressType.RESIDENTIAL,
    status: AddressStatus.ACTIVE,
    street: 'Main Street',
    number: '123',
    complement: 'Apt 4',
    neighborhood: 'Downtown',
    city: 'Test City',
    state: 'Test State',
    zipCode: '12345-678',
    isPrimary: true,
    userId: mockUserId,
    orders: [],
  };

  const mockCreateAddressDto: CreateAddressDto = {
    name: 'Home',
    type: AddressType.RESIDENTIAL,
    street: 'Main Street',
    number: '123',
    complement: 'Apt 4',
    neighborhood: 'Downtown',
    city: 'Test City',
    state: 'Test State',
    zipCode: '12345-678',
    isPrimary: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AddressesService>(AddressesService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a primary address and update existing primary addresses', async () => {
      const transactionMock = jest
        .fn()
        .mockImplementation(async (callback: any) => {
          const mockTx = {
            address: {
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
              create: jest.fn().mockResolvedValue(mockAddress),
            },
          };
          return await callback(mockTx);
        });

      mockPrismaService.$transaction = transactionMock;

      const result = await service.create(mockCreateAddressDto, mockUserId);

      expect(transactionMock).toHaveBeenCalled();
      expect(result).toEqual(mockAddress);
    });

    it('should create a non-primary address when isPrimary is false and user has existing primary', async () => {
      const nonPrimaryDto = { ...mockCreateAddressDto, isPrimary: false };
      const nonPrimaryAddress = { ...mockAddress, isPrimary: false };

      mockPrismaService.address.findFirst.mockResolvedValue(mockAddress); // Has primary address
      mockPrismaService.address.create.mockResolvedValue(nonPrimaryAddress);

      const result = await service.create(nonPrimaryDto, mockUserId);

      expect(mockPrismaService.address.findFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          isPrimary: true,
          status: AddressStatus.ACTIVE,
        },
      });
      expect(mockPrismaService.address.create).toHaveBeenCalledWith({
        data: {
          name: 'Home',
          type: AddressType.RESIDENTIAL,
          street: 'Main Street',
          number: '123',
          complement: 'Apt 4',
          neighborhood: 'Downtown',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345-678',
          isPrimary: false,
          userId: mockUserId,
        },
      });
      expect(result).toEqual(nonPrimaryAddress);
    });

    it('should create a primary address when isPrimary is false but user has no existing primary', async () => {
      const nonPrimaryDto = { ...mockCreateAddressDto, isPrimary: false };

      mockPrismaService.address.findFirst.mockResolvedValue(null); // No primary address
      mockPrismaService.address.create.mockResolvedValue(mockAddress);

      const result = await service.create(nonPrimaryDto, mockUserId);

      expect(mockPrismaService.address.create).toHaveBeenCalledWith({
        data: {
          name: 'Home',
          type: AddressType.RESIDENTIAL,
          street: 'Main Street',
          number: '123',
          complement: 'Apt 4',
          neighborhood: 'Downtown',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345-678',
          isPrimary: true, // Should be set to true since no primary exists
          userId: mockUserId,
        },
      });
      expect(result).toEqual(mockAddress);
    });
  });

  describe('findAll', () => {
    it('should return all active addresses ordered by primary first', async () => {
      const addresses = [
        mockAddress,
        { ...mockAddress, id: 'address-456', isPrimary: false },
      ];
      mockPrismaService.address.findMany.mockResolvedValue(addresses);

      const result = await service.findAll(mockUserId);

      expect(mockPrismaService.address.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          status: AddressStatus.ACTIVE,
        },
        orderBy: {
          isPrimary: 'desc',
        },
      });
      expect(result).toEqual(addresses);
    });
  });

  describe('findOne', () => {
    it('should return an address when found', async () => {
      mockPrismaService.address.findFirst.mockResolvedValue(mockAddress);

      const result = await service.findOne(mockAddressId, mockUserId);

      expect(mockPrismaService.address.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockAddressId,
          userId: mockUserId,
          status: AddressStatus.ACTIVE,
        },
      });
      expect(result).toEqual(mockAddress);
    });

    it('should throw NotFoundException when address not found', async () => {
      mockPrismaService.address.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockAddressId, mockUserId)).rejects.toThrow(
        new NotFoundException(`Address with ID "${mockAddressId}" not found.`),
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateAddressDto = {
      name: 'Updated Home',
      street: 'Updated Street',
    };

    it('should throw NotFoundException when address not found', async () => {
      mockPrismaService.address.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockAddressId, updateDto, mockUserId),
      ).rejects.toThrow(
        new NotFoundException(`Address with ID "${mockAddressId}" not found.`),
      );
    });

    it('should update address to primary and unset other primary addresses', async () => {
      const updateDtoWithPrimary = { ...updateDto, isPrimary: true };
      const updatedAddress = { ...mockAddress, ...updateDto };

      mockPrismaService.address.findFirst.mockResolvedValue(mockAddress);

      const transactionMock = jest.fn().mockImplementation(async (callback) => {
        return await callback({
          address: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            update: jest.fn().mockResolvedValue(updatedAddress),
          },
        });
      });

      mockPrismaService.$transaction = transactionMock;

      const result = await service.update(
        mockAddressId,
        updateDtoWithPrimary,
        mockUserId,
      );

      expect(transactionMock).toHaveBeenCalled();
      expect(result).toEqual(updatedAddress);
    });

    it('should update primary address to non-primary and assign another address as primary', async () => {
      const updateDtoWithNonPrimary = { ...updateDto, isPrimary: false };
      const primaryAddress = { ...mockAddress, isPrimary: true };
      const anotherAddress = {
        ...mockAddress,
        id: 'address-456',
        isPrimary: false,
      };
      const updatedAddress = { ...mockAddress, ...updateDto, isPrimary: false };

      mockPrismaService.address.findFirst.mockResolvedValue(primaryAddress);

      const transactionMock = jest.fn().mockImplementation(async (callback) => {
        return await callback({
          address: {
            findFirst: jest.fn().mockResolvedValue(anotherAddress),
            update: jest
              .fn()
              .mockResolvedValueOnce({ ...anotherAddress, isPrimary: true })
              .mockResolvedValueOnce(updatedAddress),
          },
        });
      });

      mockPrismaService.$transaction = transactionMock;

      const result = await service.update(
        mockAddressId,
        updateDtoWithNonPrimary,
        mockUserId,
      );

      expect(transactionMock).toHaveBeenCalled();
      expect(result).toEqual(updatedAddress);
    });

    it('should update address without changing primary status when isPrimary not provided', async () => {
      const updatedAddress = { ...mockAddress, ...updateDto };

      mockPrismaService.address.findFirst.mockResolvedValue(mockAddress);
      mockPrismaService.address.update.mockResolvedValue(updatedAddress);

      const result = await service.update(mockAddressId, updateDto, mockUserId);

      expect(mockPrismaService.address.update).toHaveBeenCalledWith({
        where: { id: mockAddressId },
        data: updateDto,
      });
      expect(result).toEqual(updatedAddress);
    });
  });

  describe('disable', () => {
    it('should throw NotFoundException when address not found', async () => {
      mockPrismaService.address.findFirst.mockResolvedValue(null);

      await expect(service.disable(mockAddressId, mockUserId)).rejects.toThrow(
        new NotFoundException(
          `Address with ID "${mockAddressId}" not found or does not belong to the user.`,
        ),
      );
    });

    it('should disable primary address and assign another address as primary', async () => {
      const primaryAddress = { ...mockAddress, isPrimary: true };
      const anotherAddress = {
        ...mockAddress,
        id: 'address-456',
        isPrimary: false,
      };
      const disabledAddress = {
        ...primaryAddress,
        status: AddressStatus.INACTIVE,
        isPrimary: false,
      };

      mockPrismaService.address.findFirst.mockResolvedValue(primaryAddress);

      const transactionMock = jest.fn().mockImplementation(async (callback) => {
        return await callback({
          address: {
            findFirst: jest.fn().mockResolvedValue(anotherAddress),
            update: jest
              .fn()
              .mockResolvedValueOnce({ ...anotherAddress, isPrimary: true })
              .mockResolvedValueOnce(disabledAddress),
          },
        });
      });

      mockPrismaService.$transaction = transactionMock;

      const result = await service.disable(mockAddressId, mockUserId);

      expect(transactionMock).toHaveBeenCalled();
      expect(result).toEqual(disabledAddress);
    });

    it('should disable non-primary address without affecting other addresses', async () => {
      const nonPrimaryAddress = { ...mockAddress, isPrimary: false };
      const disabledAddress = {
        ...nonPrimaryAddress,
        status: AddressStatus.INACTIVE,
      };

      mockPrismaService.address.findFirst.mockResolvedValue(nonPrimaryAddress);
      mockPrismaService.address.update.mockResolvedValue(disabledAddress);

      const result = await service.disable(mockAddressId, mockUserId);

      expect(mockPrismaService.address.update).toHaveBeenCalledWith({
        where: { id: mockAddressId },
        data: {
          status: AddressStatus.INACTIVE,
        },
      });
      expect(result).toEqual(disabledAddress);
    });

    it('should handle Prisma errors and throw NotFoundException', async () => {
      mockPrismaService.address.findFirst.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '4.0.0',
        }),
      );

      await expect(service.disable(mockAddressId, mockUserId)).rejects.toThrow(
        new NotFoundException(
          `Address with ID "${mockAddressId}" not found or does not belong to the user.`,
        ),
      );
    });

    it('should re-throw non-Prisma errors', async () => {
      const genericError = new Error('Database connection failed');
      mockPrismaService.address.findFirst.mockRejectedValue(genericError);

      await expect(service.disable(mockAddressId, mockUserId)).rejects.toThrow(
        genericError,
      );
    });
  });
});
