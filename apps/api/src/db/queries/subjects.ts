import type { TRPCContext } from "@api/trpc/init";
import type {
  GetAllSubjects,
  GetClassroomSubjects,
} from "@api/trpc/schemas/students";
import { prisma, type Database } from "@school-clerk/db";

export async function getAllSubjects(
  { db, profile }: TRPCContext,
  params: GetAllSubjects,
) {
  const subjects = await db.subject.findMany({
    where: {
      schoolProfileId: profile.schoolId,
    },
    select: {
      id: true,
      title: true,
      schoolProfileId: true,
    },
  });
  return subjects;
}
export async function getClassroomSubjects(
  db: Database,
  params: GetClassroomSubjects,
) {
  const subjects = await db.departmentSubject.findMany({
    where: {
      classRoomDepartmentId: params?.departmentId,
    },
    select: {
      id: true,
      subject: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
  return subjects;
}
