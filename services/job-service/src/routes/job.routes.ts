import { Router } from 'express';
import { container } from 'tsyringe';

import { JobController } from '@job-service/controllers/job.controller';

const jobRouter: Router = Router();

const jobController = container.resolve(JobController);

jobRouter.post('/jobs', jobController.createJob);
jobRouter.post('/jobs/:mediaId/retry', jobController.retryJob);

export { jobRouter };
