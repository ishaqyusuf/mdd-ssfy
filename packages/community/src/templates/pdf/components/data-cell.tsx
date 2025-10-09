import { Text, View } from "@react-pdf/renderer";
import { Info } from "../../../generate-print-data";

interface Props {
  cell: Info;
}
export function DataCell(props: Props) {
  return (
    <View
      style={{
        width: `${props.cell.cells * 25}%`,
        flexDirection: "row",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          width: "100px",
        }}
      >
        <Text
          style={{
            fontWeight: "700",
            fontSize: 9,
          }}
        >
          {props.cell.label}
        </Text>
      </View>
      <View
        style={{
          flex: 1,
          fontSize: 9,
        }}
      >
        <Text>{props.cell.value}</Text>
      </View>
    </View>
  );
}
