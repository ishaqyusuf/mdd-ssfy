import { _trpc } from "@/components/static-trpc";
import { useMutation } from "@tanstack/react-query";

export function useDispatchDocuments() {
  const uploadDocument = useMutation(
    _trpc.dispatch.uploadDispatchDocument.mutationOptions(),
  );

  return {
    uploadDocument,
    async uploadBase64(input: {
      filename: string;
      contentType?: string;
      folder?: string;
      base64: string;
    }) {
      return uploadDocument.mutateAsync({
        filename: input.filename,
        folder: input.folder,
        contentType: input.contentType,
        kind: "base64",
        content: input.base64,
      });
    },
    async uploadText(input: {
      filename: string;
      contentType?: string;
      folder?: string;
      text: string;
    }) {
      return uploadDocument.mutateAsync({
        filename: input.filename,
        folder: input.folder,
        contentType: input.contentType,
        kind: "text",
        content: input.text,
      });
    },
  };
}
