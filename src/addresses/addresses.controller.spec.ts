import { Test, TestingModule } from '@nestjs/testing';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressStatus, AddressType, UserRole } from 'generated/prisma';
import { JwtPayload } from '../auth/interfaces/jwtPayload.interface';

describe('AddressesController', () => {
  let controller: AddressesController;
  let service: AddressesService;

  const mockAddressesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    disable: jest.fn(),
  };

  const mockPrismaService = {
    address: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUser: JwtPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    role: UserRole.USER,
  };

  const mockAddress = {
    id: 'address-123',
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
    userId: 'user-123',
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

  const mockUpdateAddressDto: UpdateAddressDto = {
    name: 'Updated Home',
    street: 'Updated Street',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressesController],
      providers: [
        {
          provide: AddressesService,
          useValue: mockAddressesService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<AddressesController>(AddressesController);
    service = module.get<AddressesService>(AddressesService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have AddressesService injected', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an address', async () => {
      mockAddressesService.create.mockResolvedValue(mockAddress);

      const result = await controller.create(mockCreateAddressDto, mockUser);

      expect(mockAddressesService.create).toHaveBeenCalledWith(
        mockCreateAddressDto,
        mockUser.sub,
      );
      expect(result).toEqual(mockAddress);
    });
  });

  describe('findAll', () => {
    it('should return all user addresses', async () => {
      const addresses = [mockAddress];
      mockAddressesService.findAll.mockResolvedValue(addresses);

      const result = await controller.findAll(mockUser);

      expect(mockAddressesService.findAll).toHaveBeenCalledWith(mockUser.sub);
      expect(result).toEqual(addresses);
    });
  });

  describe('findOne', () => {
    it('should return a single address', async () => {
      mockAddressesService.findOne.mockResolvedValue(mockAddress);

      const result = await controller.findOne(mockAddress.id, mockUser);

      expect(mockAddressesService.findOne).toHaveBeenCalledWith(
        mockAddress.id,
        mockUser.sub,
      );
      expect(result).toEqual(mockAddress);
    });
  });

  describe('update', () => {
    it('should update an address', async () => {
      const updatedAddress = { ...mockAddress, ...mockUpdateAddressDto };
      mockAddressesService.update.mockResolvedValue(updatedAddress);

      const result = await controller.update(
        mockAddress.id,
        mockUpdateAddressDto,
        mockUser,
      );

      expect(mockAddressesService.update).toHaveBeenCalledWith(
        mockAddress.id,
        mockUpdateAddressDto,
        mockUser.sub,
      );
      expect(result).toEqual(updatedAddress);
    });
  });

  describe('disable', () => {
    it('should disable an address', async () => {
      const disabledAddress = {
        ...mockAddress,
        status: AddressStatus.INACTIVE,
      };
      mockAddressesService.disable.mockResolvedValue(disabledAddress);

      const result = await controller.disable(mockAddress.id, mockUser);

      expect(mockAddressesService.disable).toHaveBeenCalledWith(
        mockAddress.id,
        mockUser.sub,
      );
      expect(result).toEqual(disabledAddress);
    });
  });
});
