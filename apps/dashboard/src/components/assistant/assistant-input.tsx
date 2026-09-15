"use client";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@gnd/ui/input-group";
import { Field, FieldGroup } from "@gnd/ui/field";
import { Alert, AlertDescription } from "@gnd/ui/alert";
import { Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent, AttachmentTitle, AttachmentActions, AttachmentAction } from "@gnd/ui/attachment";
import { ArrowUp, FileText, ImageIcon, LoaderCircle, Plus, Square, X } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import type { AssistantAttachment } from "./assistant-attachments";
import { assistantAttachmentMimeTypes } from "./assistant-attachments";
import { shouldSubmitAssistantComposerKey } from "./assistant-chat-state";
import { AssistantOutcomeHelp } from "./assistant-outcome-help";

export type AssistantInputSuggestion = {
	id:
		| "find-order-status"
		| "customer-summary"
		| "inventory-availability"
		| "create-document";
	title: string;
	description: string;
	prompt: string;
};

export type AssistantInputApp = {
	id: string;
	name: string;
};

type AssistantInputProps = {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	onStop?: () => void;
	isStreaming?: boolean;
	disabled?: boolean;
	autoFocus?: boolean;
	placeholder: string;
	attachments: AssistantAttachment[];
	uploading: boolean;
	attachmentError: string | null;
	attachmentErrorReference?: string | null;
	onAddFiles: (files: File[]) => void;
	onRemoveAttachment: (attachment: AssistantAttachment) => void;
	suggestions: AssistantInputSuggestion[];
	onSuggestion: (suggestion: AssistantInputSuggestion) => void;
	connectedApps: AssistantInputApp[];
	mentionedIntegrationIds: string[];
	onToggleIntegration: (id: string) => void;
	onOpenSources: () => void;
};

export function AssistantInput(props: AssistantInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submit = () => {
    if (props.isStreaming) { props.onStop?.(); return; }
    if (!props.disabled) props.onSubmit();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (shouldSubmitAssistantComposerKey({ key: event.key, shiftKey: event.shiftKey, isComposing: event.nativeEvent.isComposing })) {
      event.preventDefault();
      // Enter must not stop an active response while the user drafts a reply.
      if (!props.isStreaming) submit();
    }
  };
  return (
    <form onSubmit={event => { event.preventDefault(); submit(); }}
      onDragOver={event => event.preventDefault()}
      onDrop={event => { event.preventDefault(); event.stopPropagation(); if (!props.uploading) props.onAddFiles(Array.from(event.dataTransfer.files)); }}>
      <input ref={fileInputRef} type="file" hidden multiple accept={assistantAttachmentMimeTypes.join(",")}
        onChange={event => { props.onAddFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
      <FieldGroup>
        <Field>
          <InputGroup>
            <InputGroupTextarea aria-label="Message the assistant" placeholder={props.placeholder}
              value={props.value} onChange={event => props.onChange(event.target.value)}
              rows={2} autoFocus={props.autoFocus} className="max-h-48 min-h-20"
              onKeyDown={onKeyDown}
              onPaste={event => {
                const files = Array.from(event.clipboardData.files);
                if (files.length) { event.preventDefault(); if (!props.uploading) props.onAddFiles(files); }
              }} />
            {props.attachments.length ? <InputGroupAddon align="block-start">
              <AttachmentGroup className="w-full">
                {props.attachments.map(attachment => <Attachment key={attachment.id} size="sm">
                  <AttachmentMedia>{attachment.mimeType.startsWith("image/") ? <ImageIcon /> : <FileText />}</AttachmentMedia>
                  <AttachmentContent><AttachmentTitle>{attachment.name}</AttachmentTitle></AttachmentContent>
                  <AttachmentActions><AttachmentAction type="button" aria-label={`Remove ${attachment.name}`} onClick={() => props.onRemoveAttachment(attachment)}><X /></AttachmentAction></AttachmentActions>
                </Attachment>)}
              </AttachmentGroup>
            </InputGroupAddon> : null}
            <InputGroupAddon align="block-end">
              <InputGroupButton type="button" variant="ghost" size="icon-sm" aria-label="Add photos & files"
                disabled={props.uploading} onClick={() => fileInputRef.current?.click()}>
                {props.uploading ? <LoaderCircle className="animate-spin" /> : <Plus />}
              </InputGroupButton>
              {props.uploading ? <span role="status">Attaching files…</span> : null}
              <InputGroupButton type={props.isStreaming ? "button" : "submit"} variant="default" size="icon-sm" className="ml-auto"
                disabled={!props.isStreaming && props.disabled} aria-label={props.isStreaming ? "Stop response" : "Send message"}
                data-track={props.isStreaming ? "Assistant Stopped" : "Assistant Message Sent"} onClick={props.isStreaming ? props.onStop : undefined}>
                {props.isStreaming ? <Square /> : <ArrowUp />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {props.attachmentError ? <Alert variant="destructive"><AlertDescription>
            {props.attachmentError}
            {props.attachmentErrorReference ? <AssistantOutcomeHelp reference={props.attachmentErrorReference} /> : null}
          </AlertDescription></Alert> : null}
        </Field>
      </FieldGroup>
    </form>
  );
}
