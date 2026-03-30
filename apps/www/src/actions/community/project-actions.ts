"use server";

import { prisma } from "@/db";
import { revalidatePath } from "next/cache";

type SupervisorInput = {
  name?: string | null;
  email?: string | null;
};

function cleanSupervisor(supervisor: SupervisorInput) {
  const name = supervisor.name?.trim();
  const email = supervisor.email?.trim();

  if (!name && !email) return undefined;

  return {
    name: name || "",
    email: email || "",
  };
}

export async function updateProjectSupervisorAction(input: {
  projectId: number;
  supervisor: SupervisorInput;
}) {
  const project = await prisma.projects.findUniqueOrThrow({
    where: {
      id: input.projectId,
    },
    select: {
      id: true,
      slug: true,
      meta: true,
    },
  });

  const meta = ((project.meta as Record<string, any> | null) || {}) as Record<
    string,
    any
  >;
  const supervisor = cleanSupervisor(input.supervisor);

  if (supervisor) meta.supervisor = supervisor;
  else delete meta.supervisor;

  await prisma.projects.update({
    where: {
      id: project.id,
    },
    data: {
      meta,
    },
  });

  revalidatePath("/community");
  revalidatePath("/community/projects");
  if (project.slug) {
    revalidatePath(`/community/projects/${project.slug}`);
  }
}

export async function updateProjectArchivedAction(input: {
  projectIds: number[];
  archived: boolean;
}) {
  if (!input.projectIds.length) return;

  const projects = await prisma.projects.findMany({
    where: {
      id: {
        in: input.projectIds,
      },
    },
    select: {
      slug: true,
    },
  });

  await prisma.projects.updateMany({
    where: {
      id: {
        in: input.projectIds,
      },
    },
    data: {
      archived: input.archived,
    },
  });

  revalidatePath("/community");
  revalidatePath("/community/projects");
  projects.forEach((project) => {
    if (project.slug) {
      revalidatePath(`/community/projects/${project.slug}`);
    }
  });
}

export async function markProjectProductionCompletedAction(input: {
  projectId: number;
}) {
  const project = await prisma.projects.findUniqueOrThrow({
    where: {
      id: input.projectId,
    },
    select: {
      slug: true,
    },
  });

  const now = new Date();

  await prisma.homeTasks.updateMany({
    where: {
      projectId: input.projectId,
      deletedAt: null,
      produceable: true,
      producedAt: null,
    },
    data: {
      prodStartedAt: now,
      producedAt: now,
      productionStatus: "Completed",
      productionStatusDate: now,
    },
  });

  revalidatePath("/community");
  revalidatePath("/community/projects");
  revalidatePath("/community/unit-productions");
  if (project.slug) {
    revalidatePath(`/community/projects/${project.slug}`);
  }
}
