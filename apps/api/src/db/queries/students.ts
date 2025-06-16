import { composeQueryData } from "@api/query-response";
import { composeQuery } from "@api/utils";
import type { Database, Prisma } from "@school-clerk/db";
// import { Database, Prisma } from "@school-clerk/db";

type SearchParams = {
  sessionId?: string;
  departmentId?: string;
  studentId?: string;
  size?;
  sort?;
  start?;
};
export async function getStudents(db: Database, query: SearchParams) {
  const model = db.students;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereStudents(query),
    db.students,
  );
  const list = await model.findMany({
    where,
    ...searchMeta,
  });
  return await response(
    list.map((item) => {
      return {
        ...item,
      };
    }),
  );
}

function whereStudents(query: SearchParams) {
  const where: Prisma.StudentsWhereInput[] = [
    {
      sessionForms: {
        some: {
          deletedAt: null,
          schoolSessionId: query.sessionId,
        },
      },
    },
  ];
  if (query.departmentId) {
    where.push({
      sessionForms: {
        some: {
          schoolSessionId: query.sessionId,
          classroomDepartmentId:
            query.departmentId == "undocumented" || !query?.departmentId
              ? null
              : query.departmentId,
        },
      },
    });
  }
  Object.entries(query).map(([key, value]) => {
    if (!value) return;
    switch (key as keyof SearchParams) {
      case "studentId":
        where.push({
          id: value,
        });
        break;
    }
  });
  return composeQuery(where);
}
