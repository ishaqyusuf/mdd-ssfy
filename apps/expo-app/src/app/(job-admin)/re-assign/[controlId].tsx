import { Redirect, useLocalSearchParams } from "expo-router";

export default function ReassignJob() {
  const { controlId } = useLocalSearchParams();
  return (
    <Redirect
      href={{
        pathname: "/job-form",
        params: {
          admin: "true",
          action: "re-assign",
          _jobId: String(controlId || ""),
        },
      }}
    />
  );
}
