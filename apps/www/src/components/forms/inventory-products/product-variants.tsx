import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { useProductVariant } from "./context";

export function ProductVariants() {
    const ctx = useProductVariant();
    return (
        <div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Variant</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ctx.data?.attributeMaps?.map((fd, i) => (
                        <Row key={i} data={fd}></Row>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function Row({ data }) {
    return (
        <>
            <TableRow>
                <TableCell>{data?.title}</TableCell>
            </TableRow>
        </>
    );
}

