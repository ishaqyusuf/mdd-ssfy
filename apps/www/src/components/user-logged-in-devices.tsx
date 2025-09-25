"use client";

import { Fragment } from "react";
import { Icons } from "@/components/_v1/icons";
import { Menu } from "@/components/(clean-code)/menu";
import { DataSkeleton } from "@/components/data-skeleton";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { timeout } from "@/lib/timeout";
import { formatDate } from "@/lib/use-day";
import { skeletonListData } from "@/utils/format";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import {
    DataSkeletonProvider,
    useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";

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

export function UserLoggedInDevices() {
    // const loader = useLoadingToast();

    const logOutDevice = async (id: string) => {
        // loader.loading("Logging out....");
        await timeout(500);
        // TODO: Implement actual logout logic
        // loader.success("Logged out!.");
    };

    return (
        <DataSkeletonProvider
            value={useCreateDataSkeletonCtx({
                defaultState: false,
            })}
        >
            <div className="rounded-md border">
                {!mockDevices.length ? (
                    <EmptyDeviceList />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Device</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>IP Address</TableHead>
                                <TableHead>Last Login</TableHead>
                                <TableHead className="text-right"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {skeletonListData(mockDevices, 2, {})?.map(
                                (device, index) => (
                                    <Fragment key={index}>
                                        <TableRow>
                                            <TableCell className="font-medium">
                                                <DataSkeleton pok="textSm">
                                                    {device.device}
                                                </DataSkeleton>
                                            </TableCell>
                                            <TableCell>
                                                <DataSkeleton pok="textSm">
                                                    {device.location}
                                                </DataSkeleton>
                                            </TableCell>
                                            <TableCell>
                                                <DataSkeleton pok="textSm">
                                                    {device.ipAddress}
                                                </DataSkeleton>
                                            </TableCell>
                                            <TableCell>
                                                <DataSkeleton pok="date">
                                                    {formatDate(
                                                        device.lastLogin,
                                                    )}
                                                </DataSkeleton>
                                            </TableCell>
                                            <TableCell className="w-8 text-right">
                                                <DataSkeleton pok="date">
                                                    <Menu>
                                                        <Menu.Item
                                                            icon="logout"
                                                            onClick={async () =>
                                                                await logOutDevice(
                                                                    device.id,
                                                                )
                                                            }
                                                        >
                                                            Log out
                                                        </Menu.Item>
                                                    </Menu>
                                                </DataSkeleton>
                                            </TableCell>
                                        </TableRow>
                                    </Fragment>
                                ),
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>
        </DataSkeletonProvider>
    );
}

function EmptyDeviceList() {
    return (
        <div className="flex h-36 items-center justify-center">
            <div className="flex flex-col items-center">
                <Icons.laptop className="mb-4" />
                <div className="mb-6 space-y-2 text-center">
                    <h2 className="text-lg font-medium">
                        No Logged-in Devices
                    </h2>
                    <p className="text-sm text-[#606060]">
                        {"There are no logged-in devices to display."}
                    </p>
                </div>
            </div>
        </div>
    );
}

