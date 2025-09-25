import 'reflect-metadata';

import { container } from 'tsyringe';

import { setupDI } from '../config/di.config';
import { TranscodingUseCase } from './transcoding.usecase';

describe('TranscodingUseCase', () => {
  beforeAll(() => {
    setupDI();
  });

  it('should be defined', () => {
    const useCase = container.resolve(TranscodingUseCase);
    expect(useCase).toBeDefined();
  });
});
