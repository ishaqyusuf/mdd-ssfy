import { SafeArea } from "@/components/safe-area";
import { JobV2Footer } from "@/components/forms/job-v2/job-v2-footer";
import { JobV2Header } from "@/components/forms/job-v2/job-v2-header";
import { JobV2Shell } from "@/components/forms/job-v2/job-v2-shell";
import { JobV2StepContent } from "@/components/forms/job-v2/job-v2-step-content";
import {
  JobFormV2Props,
  JobFormV2Provider,
  useCreateJobFormV2Context,
  useJobFormV2Context,
} from "@/hooks/use-job-form-v2";
import { useFocusEffect, useNavigation } from "expo-router";
import { useCallback, useEffect } from "react";
import { BackHandler } from "react-native";

export function JobFormV2Screen(props: JobFormV2Props) {
  const ctx = useCreateJobFormV2Context(props);

  return (
    <JobFormV2Provider value={ctx}>
      <Content />
    </JobFormV2Provider>
  );
}

function Content() {
  const { step, completed, prevStep } = useJobFormV2Context();
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      const shouldGoPrevStep = completed || step > 1;
      if (!shouldGoPrevStep) return;
      event.preventDefault();
      prevStep();
    });

    return unsubscribe;
  }, [completed, navigation, prevStep, step]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        const shouldGoPrevStep = completed || step > 1;
        if (!shouldGoPrevStep) return false;
        prevStep();
        return true;
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [completed, prevStep, step]),
  );

  return (
    <SafeArea>
      <JobV2Shell header={<JobV2Header />} footer={<JobV2Footer />}>
        <JobV2StepContent />
      </JobV2Shell>
    </SafeArea>
  );
}
