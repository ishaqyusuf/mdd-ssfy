"use client";

import { UserLoggedInDevicesColumnVisibility } from "@/components/tables-2/user-logged-in-devices/column-visibility";
import { DataTable as UserLoggedInDevicesDataTable } from "@/components/tables-2/user-logged-in-devices/data-table";
import { timeout } from "@/lib/timeout";
import type { TableSettings } from "@/utils/table-settings";
import { useState } from "react";

const mockDevices = [
	{
		id: "1",
		device: "Chrome on macOS",
		location: "New York, NY",
		ipAddress: "192.168.1.1",
		lastLogin: new Date(),
	},
	{
		id: "2",
		device: "Safari on iOS",
		location: "San Francisco, CA",
		ipAddress: "10.0.0.1",
		lastLogin: new Date(),
	},
];

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function UserLoggedInDevices({ initialSettings }: Props) {
	const [loggingOutDeviceId, setLoggingOutDeviceId] = useState<string | null>(
		null,
	);

	const logOutDevice = async (id: string) => {
		setLoggingOutDeviceId(id);
		await timeout(500);
		// TODO: Implement actual logout logic.
		setLoggingOutDeviceId(null);
	};

	return (
		<div className="space-y-2">
			<div className="flex justify-end">
				<UserLoggedInDevicesColumnVisibility />
			</div>
			<UserLoggedInDevicesDataTable
				data={mockDevices}
				initialSettings={initialSettings}
				loggingOutDeviceId={loggingOutDeviceId}
				onLogOutDevice={(device) => logOutDevice(device.id)}
			/>
		</div>
	);
}
