import { Text, View } from "@react-pdf/renderer";
import { Info } from "../../../generate-print-data";
import { colorsObject } from "@gnd/utils/colors";

interface Props {
  cell: Info;
}
export function DataCell(props: Props) {
  if (props.cell.section)
    return (
      <View
        style={{
          width: `${props.cell.cells * 25}%`,
          flexDirection: "row",
          // margin: "5px",
          justifyContent: "center",
          padding: "4px",
          paddingHorizontal: "9px",
          backgroundColor: colorsObject.gray,
          fontWeight: 700,
        }}
      >
        <Text
          style={{
            fontWeight: "700",
            fontSize: 12,
            textTransform: "uppercase",
            marginRight: "10px",
          }}
        >
          {props.cell.label}
        </Text>
      </View>
    );
  return (
    <View
      style={{
        width: `${props.cell.cells * 25}%`,
        flexDirection: "row",
        padding: "4px",
        paddingHorizontal: "5px",
        // borderBottom: "0.5px",
        // borderColor: colorsObject.gray,
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
            textTransform: "uppercase",
            marginRight: "10px",
          }}
        >
          {props.cell.label}:
        </Text>
      </View>
      <View
        style={{
          flex: 1,
          fontSize: 9,
        }}
      >
        <Text
          style={{
            textTransform: "uppercase",
            fontSize: 9,
          }}
        >
          {props.cell.value}
        </Text>
      </View>
    </View>
  );
}
