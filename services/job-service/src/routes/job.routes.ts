import { Router } from 'express';
import { container } from 'tsyringe';

import { JobController } from '@job-service/controllers/job.controller';

const jobRouter: Router = Router();

const jobController = container.resolve(JobController);

jobRouter.post('/jobs', jobController.createJob);
jobRouter.get('/jobs/:id', jobController.getJobById);
jobRouter.post('/jobs/:mediaId/retry', jobController.retryJob);
jobRouter.get('/jobs/by-media/:mediaId', jobController.getJobByMediaId);

export { jobRouter };
