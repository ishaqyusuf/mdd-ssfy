import { Redirect, useLocalSearchParams } from "expo-router";

export default function CreateJob() {
  const { jobType } = useLocalSearchParams();
  return (
    <Redirect
      href={{
        pathname: "/job-form",
        params: {
          admin: "true",
          action: "create",
          jobType: String(jobType || "installation"),
        },
      }}
    />
  );
}
