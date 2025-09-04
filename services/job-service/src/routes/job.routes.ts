import { Router } from 'express';

import { JobController } from '@job-service/controllers/job.controller';

const jobRouter = Router();
const jobController = new JobController();

jobRouter.post('/jobs', jobController.createJob);
jobRouter.post('/jobs/:mediaId/retry', jobController.retryJob);

export { jobRouter };
