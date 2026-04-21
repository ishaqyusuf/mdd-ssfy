import { Icons } from "@gnd/ui/icons";
import { useJobOverviewContext } from "@/contexts/job-overview-context";
import { Badge } from "@gnd/ui/badge";
import { Card, Table } from "@gnd/ui/namespace";

export function JobScope() {
    const ctx = useJobOverviewContext();
    const { overview: job } = ctx;
    const tasks = job?.tasks || [];
    const description = String(job?.description || "").trim();

    return (
        <Card className="overflow-hidden">
            {/* Header */}
            <Card.Header className="flex flex-row items-center justify-between border-b bg-muted/20">
                <Card.Title className="flex items-center gap-2 text-base">
                    <Icons.FileText className="h-4 w-4 text-primary" />
                    Scope of Work
                </Card.Title>

                {job?.isCustom ? (
                    <span className="text-[10px] font-black uppercase tracking-widest bg-purple-100 text-purple-700 px-2 py-1 rounded border border-purple-200">
                        Custom Job
                    </span>
                ) : (
                    <Badge variant="outline">{tasks.length} Items</Badge>
                )}
            </Card.Header>

            {/* Description */}
            <Card.Content className="border-b bg-muted/10">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        <Icons.FileText className="h-3.5 w-3.5" />
                        Work Description
                    </div>
                    <div className="rounded-lg border bg-background px-4 py-3">
                        {description ? (
                            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                                {description}
                            </p>
                        ) : (
                            <p className="text-sm italic text-muted-foreground">
                                No scope description was added to this job.
                            </p>
                        )}
                    </div>
                </div>
            </Card.Content>

            {/* Table */}
            {job?.isCustom ? (
                <>
                    <Card>
                        <Card.Content className="py-12 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-primary">
                                <Icons.PackageOpen className="h-8 w-8" />
                            </div>

                            <h4 className="text-lg font-bold text-foreground">
                                Ad-hoc Custom Job
                            </h4>

                            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                                This job was created as a custom task without
                                standard itemized quantities. The total payout
                                is calculated based on the negotiated flat fee
                                listed in the financial summary.
                            </p>
                        </Card.Content>
                    </Card>
                </>
            ) : (
                <div className="">
                    <Table>
                        <Table.Header>
                            <Table.Row>
                                <Table.Head>Task / Item</Table.Head>
                                <Table.Head className="text-right">
                                    Rate
                                </Table.Head>
                                <Table.Head className="text-center">
                                    Qty
                                </Table.Head>
                                <Table.Head className="text-right">
                                    Total
                                </Table.Head>
                            </Table.Row>
                        </Table.Header>

                        <Table.Body>
                            {tasks?.map((task, id) => (
                                <Table.Row
                                    key={id}
                                    className="hover:bg-muted/50"
                                >
                                    <Table.Cell className="font-bold">
                                        {task.title}
                                    </Table.Cell>

                                    <Table.Cell className="text-right font-mono text-muted-foreground">
                                        ${task.rate}
                                    </Table.Cell>

                                    <Table.Cell className="text-center">
                                        <Badge variant="secondary">
                                            {task.qty}
                                            {task.maxQty && (
                                                <span className="ml-1 font-normal text-muted-foreground">
                                                    / {task.maxQty}
                                                </span>
                                            )}
                                        </Badge>
                                    </Table.Cell>

                                    <Table.Cell className="text-right font-bold">
                                        ${task.total}
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table>
                </div>
            )}
        </Card>
    );
}
