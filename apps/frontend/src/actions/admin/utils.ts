'use server';

const getServiceUrlInternal = (envVarName: string): string | null => {
  const serviceUrl = process.env[envVarName];
  if (!serviceUrl) {
    console.error(`${envVarName} is not configured.`);
    return null;
  }
  return serviceUrl;
};

export const getAIServiceUrl = () =>
  getServiceUrlInternal('NEXT_PUBLIC_AI_WORKER_URL');
export const getJobServiceUrl = () =>
  getServiceUrlInternal('NEXT_PUBLIC_JOB_SERVICE_URL');
export const getAuthServiceUrl = () =>
  getServiceUrlInternal('NEXT_PUBLIC_USER_SERVICE_URL');
