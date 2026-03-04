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
import { useCallback, useEffect, useRef } from "react";
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
  const isHandlingExitRef = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (isHandlingExitRef.current) return;

      const shouldGoPrevStep = completed || step > 1;
      const canGoBack =
        typeof (navigation as any).canGoBack === "function"
          ? (navigation as any).canGoBack()
          : false;
      const shouldPreventAppClose = !shouldGoPrevStep && !canGoBack;

      if (!shouldGoPrevStep && !shouldPreventAppClose) return;
      event.preventDefault();
      isHandlingExitRef.current = true;
      prevStep();
    });

    return unsubscribe;
  }, [completed, navigation, prevStep, step]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (isHandlingExitRef.current) return true;

        const shouldGoPrevStep = completed || step > 1;
        const canGoBack =
          typeof (navigation as any).canGoBack === "function"
            ? (navigation as any).canGoBack()
            : false;
        if (!shouldGoPrevStep && canGoBack) return false;
        isHandlingExitRef.current = true;
        prevStep();
        return true;
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [completed, navigation, prevStep, step]),
  );

  return (
    <SafeArea>
      <JobV2Shell header={<JobV2Header />} footer={<JobV2Footer />}>
        <JobV2StepContent />
      </JobV2Shell>
    </SafeArea>
  );
}
