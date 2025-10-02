import { Router } from 'express';
import { container } from 'tsyringe';

import { AIController } from '@ai-worker/controllers/ai.controller';

const aiRouter: Router = Router();

const aiController = container.resolve(AIController);

aiRouter.post('/images/generate', aiController.generateImage);
aiRouter.post('/images/prompt', aiController.generateImagePrompt);

export { aiRouter };
