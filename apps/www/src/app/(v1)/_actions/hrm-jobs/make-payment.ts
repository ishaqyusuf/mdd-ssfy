"use server";

import { JobPayments, Jobs, prisma } from "@/db";
import { sum, transformData } from "@/lib/utils";

import { _notifyProdStarted, _notifyWorkerPaymentPaid } from "../notifications";
import { userId } from "../utils";

export async function getPayableUsers(userId, single = false) {
    const users = await prisma.users.findMany({
        where: {
            id: {
                in: userId && single ? [userId] : undefined,
            },
        },
        include: {
            employeeProfile: true,
            jobs: {
                where: {
                    deletedAt: null,
                    status: {
                        not: "Assigned",
                    },
                    paymentId: {
                        equals: null,
                    },
                },
            },
        },
    });
    const payables = users
        .filter((user) => user.jobs.length > 0)

        .map((user) => {
            const vjobs: Jobs[] = user.jobs.filter((j) => !j.paymentId);

            let total = !vjobs ? 0 : +(sum(vjobs, "amount") || 0);
            //   if(!total)return null;
            if (user.employeeProfile) {
            }
            let chargePercentage = user.employeeProfile?.discount || 0;
            let charge = 0;
            if (chargePercentage > 0)
                charge = (total || 0) * (chargePercentage / 100);
            return {
                jobIds: vjobs.map((v) => v.id),
                id: user.id,
                pid: user.employeeProfileId,
                name: user.name,
                subTotal: total,
                charge,
                chargePercentage,
                total: total - charge,
                profile: user.employeeProfile,
            };
        })
        .filter((u) => u != null);

    const jobs = !userId
        ? []
        : await prisma.jobs.findMany({
              where: {
                  paymentId: null,
                  userId: Number(userId),
              },
          });
    return {
        payables,
        payable: single ? payables[0] : null,
        jobs: {
            data: jobs,
            pageInfo: {},
        },
    };
}
interface Props {
    jobIds: number[];
    payment: Partial<JobPayments>;
}
export async function makePayment({ payment, jobIds }: Props) {
    payment.paidBy = await userId();

    const p = await prisma.jobPayments.create({
        data: transformData(payment) as any,
    });
    const jobs = await prisma.jobs.updateMany({
        where: {
            id: {
                in: jobIds,
            },
        },
        data: {
            status: "Paid",
            paymentId: p.id,
            statusDate: new Date(),
        },
    });
    //   jobs.
    await _notifyWorkerPaymentPaid(p, jobs.count);
}
