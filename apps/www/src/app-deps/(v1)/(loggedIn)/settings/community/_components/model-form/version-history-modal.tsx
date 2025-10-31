import Modal from "@/components/common/modal";
import { GetCommunityTemplate } from "../home-template";
import { TableCol } from "@/components/common/data-table/table-cells";

interface Props {
    data: GetCommunityTemplate;
}
export default function TemplateHistoryModal({ data }: Props) {
    return (
        <Modal.Content>
            <Modal.Header title="Version History" subtitle={data.modelName} />
            <div className="">
                <span>{data.history.length}</span>
                {data.history?.map((history) => (
                    <div key={history.id}>
                        <span>
                            {"Date: "}{" "}
                            <TableCol.Date>{history.createdAt}</TableCol.Date>
                        </span>
                    </div>
                ))}
            </div>
        </Modal.Content>
    );
}
