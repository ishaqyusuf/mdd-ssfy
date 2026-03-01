import { Redirect, useLocalSearchParams } from "expo-router";

export default function SubmitJob() {
  const { controlId } = useLocalSearchParams();
  return (
    <Redirect
      href={{
        pathname: "/job-form",
        params: {
          action: "submit",
          _jobId: String(controlId || ""),
        },
      }}
    />
  );
}
