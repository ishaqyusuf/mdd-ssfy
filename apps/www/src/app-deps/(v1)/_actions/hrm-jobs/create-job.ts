"use server";

import { Jobs, type Prisma, prisma } from "@/db";
import { transformData } from "@/lib/utils";
import type { IJobType, IJobs } from "@/types/hrm";
import { generateControlId } from "@gnd/community/utils/job";
import { _notifyAdminJobSubmitted } from "../notifications";
import { userId } from "../utils";
import { getInsuranceStatusForUser } from "./get-insurance-status";

export async function createJobAction(data: IJobs) {
	data.status = "Submitted";
	data.statusDate = new Date();
	if (!data.userId) data.userId = await userId();
	if (!data.userId) {
		throw new Error("Unable to determine contractor for this job.");
	}
	const insuranceStatus = await getInsuranceStatusForUser(data.userId);
	if (insuranceStatus.blocking) {
		throw new Error(insuranceStatus.message);
	}
	data.controlId = generateControlId();
	// let amount = data.amount;
	// if (data.coWorkerId) amount /= 2;
	// const unitJobs = await prisma
	const job = await prisma.jobs.create({
		data: {
			...data,
			...(transformData({ meta: data.meta }) as any),
			// amount
		},
		include: {
			user: true,
			coWorker: true,
		},
	});
	_notifyAdminJobSubmitted(job as any);
	if (job.coWorkerId) {
		const job2 = await prisma.jobs.create({
			data: {
				...data,
				...(transformData({ meta: data.meta }) as any),
				// amount,
				userId: data.coWorkerId,
				coWorkerId: data.userId,
			},
			include: {
				user: true,
				coWorker: true,
			},
		});
		_notifyAdminJobSubmitted(job2 as any);
	}
	const type: IJobType = data.type as any;
	if (data.homeId) {
		const where: Prisma.HomeTasksWhereInput = {
			homeId: data.homeId,
		};
		if (type == "installation") where.installable = true;
		if (type == "Deco-Shutter") where.deco = true;
		if (type == "punchout") where.punchout = true;
		await prisma.homeTasks.updateMany({
			where,
			data: {
				status: "Completed",
				statusDate: new Date(),
			},
		});
	}
}
export async function updateJobAction({ id, ...jdata }: IJobs) {
	if (jdata.status?.toLowerCase() == "assigned") {
		jdata.status = "Submitted";
	}
	const {
		meta,
		adminNote,
		amount,
		coWorkerId,
		description,
		status,
		note,
		type,
		userId,
	} = jdata;
	const job = await prisma.jobs.update({
		where: { id },
		data: {
			meta: meta as any,
			adminNote,
			amount,
			coWorkerId,
			description,
			userId,
			note,
		},
	});
	if (job.coWorkerId) {
		const job2 = await prisma.jobs.findFirst({
			where: {
				coWorkerId: job.userId,
				userId: job.coWorkerId,
				title: job.title,
			},
		});
		if (job2) {
			await prisma.jobs.update({
				where: {
					id: job2.id,
				},
				data: {
					meta: meta as any,
					adminNote,
					amount,
					description,
					note,
					userId: jdata.coWorkerId,
					coWorkerId: jdata.userId,
				},
				include: {
					user: true,
					coWorker: true,
				},
			});
		} else {
			const job2 = await prisma.jobs.create({
				data: {
					meta: meta as any,
					adminNote,
					amount,
					description,
					note,
					userId: jdata.coWorkerId,
					coWorkerId: jdata.userId,
					status,
					type,
				},
				include: {
					user: true,
					coWorker: true,
				},
			});
		}
		//  const job2 = await prisma.jobs.create({
		//    data: {
		//      ...data,
		//      ...(transformData({ meta: data.meta }) as any),
		//      amount,
		//      userId: data.coWorkerId,
		//      coWorkerId: data.userId,
		//    },
		//    include: {
		//      user: true,
		//      coWorker: true,
		//    },
		//  });
		//  _notifyAdminJobSubmitted(job2 as any);
	}
}
