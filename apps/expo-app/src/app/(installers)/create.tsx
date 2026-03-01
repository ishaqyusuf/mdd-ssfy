import { Redirect } from "expo-router";

export default function CreateJob() {
  return <Redirect href={{ pathname: "/job-form", params: { action: "create" } }} />;
}
