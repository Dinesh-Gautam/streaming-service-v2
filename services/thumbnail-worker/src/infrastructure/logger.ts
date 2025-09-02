import { container } from 'tsyringe';

import { WinstonLogger } from '@monorepo/logger';

export const logger = container.resolve(WinstonLogger);
