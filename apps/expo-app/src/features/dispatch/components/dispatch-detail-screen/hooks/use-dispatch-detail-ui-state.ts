import { useState } from "react";

export function useDispatchDetailUiState() {
  const [isPackingSlipOpen, setPackingSlipOpen] = useState(false);
  const [isDispatchConfirmOpen, setDispatchConfirmOpen] = useState(false);
  const [isStartTripConfirmOpen, setStartTripConfirmOpen] = useState(false);
  const [isIssueReportOpen, setIssueReportOpen] = useState(false);
  const [selectedIssueReason, setSelectedIssueReason] = useState<string | null>(
    null,
  );
  const [issueDetails, setIssueDetails] = useState("");

  return {
    isPackingSlipOpen,
    setPackingSlipOpen,
    isDispatchConfirmOpen,
    setDispatchConfirmOpen,
    isStartTripConfirmOpen,
    setStartTripConfirmOpen,
    isIssueReportOpen,
    setIssueReportOpen,
    selectedIssueReason,
    setSelectedIssueReason,
    issueDetails,
    setIssueDetails,
  };
}
