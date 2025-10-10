import { colorsObject } from "@gnd/utils/colors";
import { Text, View } from "@react-pdf/renderer";

export function Header() {
  return (
    <View
      style={{
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: 700,
          lineHeight: "28px",
        }}
      >
        GND Millwork Corp.
      </Text>
      <Text
        style={{
          fontSize: 10,
          lineHeight: 1,
        }}
      >
        13285 SW 131 St Miami, Fl 33186
      </Text>
      <View
        style={{
          flex: 1,
          height: "1px",
          backgroundColor: colorsObject.black,
        }}
      />
    </View>
  );
}
