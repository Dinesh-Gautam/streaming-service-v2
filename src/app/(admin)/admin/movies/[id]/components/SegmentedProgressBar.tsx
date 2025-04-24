import type React from 'react';
import { useMemo } from 'react';

import { type MediaProcessingStatus } from '@/app/(admin)/admin/movies/_action';
import { TextAnimate } from '@/components/magicui/text-animate';

interface SegmentedProgressBarProps {
  tasks: MediaProcessingStatus['tasks'];
  jobStatus: MediaProcessingStatus['jobStatus'];
}

const TaskNames: Record<string, string> = {
  AIEngine: 'Generating Metadata',
  SubtitleEngine: 'Generating Subtitles',
  TranscodingEngine: 'Transcoding',
  ThumbnailEngine: 'Generating Thumbnails',
};

export const SparkelIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M7.45275 11.625C7.38579 11.3655 7.2505 11.1286 7.06096 10.939C6.87142 10.7495 6.63455 10.6142 6.375 10.5473L1.77375 9.36075C1.69525 9.33847 1.62616 9.29119 1.57696 9.22609C1.52776 9.16098 1.50114 9.08161 1.50114 9C1.50114 8.9184 1.52776 8.83902 1.57696 8.77392C1.62616 8.70882 1.69525 8.66154 1.77375 8.63925L6.375 7.452C6.63446 7.38511 6.87127 7.24993 7.0608 7.06053C7.25034 6.87113 7.38567 6.63442 7.45275 6.375L8.63925 1.77375C8.66131 1.69494 8.70854 1.62551 8.77374 1.57605C8.83894 1.52659 8.91854 1.49982 9.00038 1.49982C9.08221 1.49982 9.16181 1.52659 9.22701 1.57605C9.29221 1.62551 9.33945 1.69494 9.3615 1.77375L10.5473 6.375C10.6142 6.63456 10.7495 6.87143 10.939 7.06097C11.1286 7.25051 11.3654 7.3858 11.625 7.45275L16.2263 8.6385C16.3054 8.66033 16.3752 8.70751 16.4249 8.77281C16.4746 8.83811 16.5015 8.91792 16.5015 9C16.5015 9.08208 16.4746 9.1619 16.4249 9.2272C16.3752 9.2925 16.3054 9.33968 16.2263 9.3615L11.625 10.5473C11.3654 10.6142 11.1286 10.7495 10.939 10.939C10.7495 11.1286 10.6142 11.3655 10.5473 11.625L9.36075 16.2263C9.33869 16.3051 9.29146 16.3745 9.22626 16.424C9.16106 16.4734 9.08147 16.5002 8.99963 16.5002C8.91779 16.5002 8.83819 16.4734 8.77299 16.424C8.70779 16.3745 8.66056 16.3051 8.6385 16.2263L7.45275 11.625Z"
      fill="url(#paint0_linear_2_12)"
    />
    <path
      d="M15 2.25V5.25Z"
      fill="url(#paint1_linear_2_12)"
    />
    <path
      d="M16.5 3.75H13.5Z"
      fill="url(#paint2_linear_2_12)"
    />
    <path
      d="M15 2.25V5.25M16.5 3.75H13.5"
      stroke="url(#paint3_linear_2_12)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 12.75V14.25Z"
      fill="url(#paint4_linear_2_12)"
    />
    <path
      d="M3.75 13.5H2.25Z"
      fill="url(#paint5_linear_2_12)"
    />
    <path
      d="M3 12.75V14.25M3.75 13.5H2.25"
      stroke="url(#paint6_linear_2_12)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <defs>
      <linearGradient
        id="paint0_linear_2_12"
        x1="9.00134"
        y1="1.49982"
        x2="9.00134"
        y2="16.5002"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#D130B9" />
        <stop
          offset="1"
          stopColor="#DC3639"
        />
      </linearGradient>
      <linearGradient
        id="paint1_linear_2_12"
        x1="15"
        y1="3.75"
        x2="15"
        y2="5.25"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#D130B9" />
        <stop
          offset="1"
          stopColor="#EA171B"
        />
      </linearGradient>
      <linearGradient
        id="paint2_linear_2_12"
        x1="15"
        y1="3.75"
        x2="15"
        y2="5.25"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#D130B9" />
        <stop
          offset="1"
          stopColor="#EA171B"
        />
      </linearGradient>
      <linearGradient
        id="paint3_linear_2_12"
        x1="15"
        y1="3.75"
        x2="15"
        y2="5.25"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#D130B9" />
        <stop
          offset="1"
          stopColor="#EA171B"
        />
      </linearGradient>
      <linearGradient
        id="paint4_linear_2_12"
        x1="3"
        y1="13.5"
        x2="3"
        y2="15"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#D130B9" />
        <stop
          offset="1"
          stopColor="#DC3639"
        />
      </linearGradient>
      <linearGradient
        id="paint5_linear_2_12"
        x1="3"
        y1="13.5"
        x2="3"
        y2="15"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#D130B9" />
        <stop
          offset="1"
          stopColor="#DC3639"
        />
      </linearGradient>
      <linearGradient
        id="paint6_linear_2_12"
        x1="3"
        y1="13.5"
        x2="3"
        y2="15"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#D130B9" />
        <stop
          offset="1"
          stopColor="#DC3639"
        />
      </linearGradient>
    </defs>
  </svg>
);

const getTaskInfo = (tasks: MediaProcessingStatus['tasks']) => {
  const totalTasks = tasks.length;
  if (totalTasks === 0) {
    return {
      currentTaskIndex: -1,
      currentTask: null,
      taskName: '',
      isAiTask: false,
      statusText: 'Pending',
      error: null,
    };
  }

  let currentTaskIndex = tasks.findIndex((task) => task.status !== 'completed');
  if (currentTaskIndex === -1) {
    currentTaskIndex = totalTasks - 1; // All completed, show the last one
  }

  const currentTask = tasks[currentTaskIndex];
  const taskName = TaskNames[currentTask.engine] || currentTask.engine;
  const isAiTask = currentTask.engine === 'AIEngine';
  const statusText = currentTask.status;
  const error = currentTask.error;

  return {
    currentTaskIndex,
    currentTask,
    taskName,
    isAiTask,
    statusText,
    error,
  };
};

const SegmentedProgressBar: React.FC<SegmentedProgressBarProps> = ({
  tasks = [], // Default to empty array
  jobStatus,
}) => {
  const { currentTaskIndex, taskName, isAiTask, statusText, error } =
    getTaskInfo(tasks);
  const totalTasks = tasks.length;

  const Text = useMemo(() => {
    return isAiTask ?
        <TextAnimate
          startOnView={false}
          animation="blurIn"
          as="h1"
        >
          {taskName}
        </TextAnimate>
      : taskName;
  }, [taskName, isAiTask]);

  if (totalTasks === 0 || jobStatus === 'pending') {
    return null; // Don't render if no tasks or job hasn't started
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'failed':
        return 'text-red-300';
      case 'completed':
        return 'text-green-300';
      case 'running':
        return 'text-blue-300';
      default:
        return 'text-muted-foreground';
    }
  };

  const getBorderColor = (status: string) => {
    return status === 'failed' ? 'border-red-400' : 'border-secondary';
  };

  const getProgressFill = (engine: string, status: string) => {
    if (status === 'failed') return 'bg-red-200'; // Indicate failure clearly
    if (engine === 'AIEngine')
      return 'bg-gradient-to-r from-pink-500 to-red-500';
    return 'bg-primary';
  };

  return (
    <div className="space-y-2 pt-4 ">
      {/* Dynamic Title */}
      <div className="flex items-center text-sm font-medium text-muted-foreground mb-1">
        {currentTaskIndex !== -1 && (
          <div className="flex w-full gap-2 items-center mb-0.5">
            <span>
              {currentTaskIndex + 1}/{totalTasks}
            </span>
            {isAiTask && <SparkelIcon />}
            <span className="font-semibold text-primary">{Text}</span>
            <span className={`capitalize ml-1 ${getStatusColor(statusText)}`}>
              ({statusText})
            </span>
            {statusText === 'failed' && error && (
              <span className="text-red-500 font-normal ml-2 truncate">
                {error}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Segmented Bar Container */}
      <div className="flex w-full space-x-1 h-3 rounded-full">
        {tasks.map((task) => {
          const progress = task.status === 'completed' ? 100 : task.progress;
          const title = `${TaskNames[task.engine] || task.engine}: ${task.status} (${progress.toFixed(0)}%) ${task.error ? `- Error: ${task.error}` : ''}`;
          const bgColor = 'bg-secondary'; // Background for the segment container
          const outlineClass = getBorderColor(task.status);
          const progressColor = getProgressFill(task.engine, task.status);

          return (
            <div
              key={task.taskId}
              title={title}
              className={`flex-1 h-full rounded-full overflow-hidden relative border ${bgColor} ${outlineClass}`}
            >
              <div
                className={`h-full rounded-full absolute top-0 left-0 transition-width duration-300 ease-linear ${progressColor}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Optional: Display individual task errors if the job failed overall */}
      {jobStatus === 'failed' && (
        <div className="pt-2 space-y-1">
          {tasks
            .filter((t) => t.status === 'failed' && t.error)
            .map((task) => (
              <p
                key={`${task.taskId}-error`}
                className="text-xs text-red-400"
              >
                <strong>{TaskNames[task.engine] || task.engine} Error:</strong>{' '}
                {task.error}
              </p>
            ))}
        </div>
      )}
    </div>
  );
};

export default SegmentedProgressBar;
