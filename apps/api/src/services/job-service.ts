import { JobStatus } from "@prisma/client";

import { prisma } from "../db/prisma.js";

export async function enqueueJob(type: string, payloadJson: unknown, runAt = new Date()) {
  return prisma.job.create({
    data: {
      type,
      payloadJson: payloadJson as never,
      runAt,
    },
  });
}

export async function claimDueJobs(limit = 5) {
  const jobs = await prisma.job.findMany({
    where: {
      status: JobStatus.pending,
      runAt: { lte: new Date() },
    },
    orderBy: { runAt: "asc" },
    take: limit,
  });

  const claimed = [];
  for (const job of jobs) {
    claimed.push(
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.running,
          attempts: { increment: 1 },
        },
      }),
    );
  }

  return claimed;
}

export async function completeJob(jobId: string) {
  return prisma.job.update({
    where: { id: jobId },
    data: { status: JobStatus.completed },
  });
}

export async function failJob(jobId: string, error: string) {
  return prisma.job.update({
    where: { id: jobId },
    data: {
      status: JobStatus.failed,
      lastError: error,
    },
  });
}
