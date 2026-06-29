import { Test, TestingModule } from '@nestjs/testing';
import { PhotoboothGateway } from './photobooth.gateway';

describe('PhotoboothGateway', () => {
  let gateway: PhotoboothGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PhotoboothGateway],
    }).compile();

    gateway = module.get<PhotoboothGateway>(PhotoboothGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
