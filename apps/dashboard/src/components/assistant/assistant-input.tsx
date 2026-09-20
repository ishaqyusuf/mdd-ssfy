"use client";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@gnd/ui/input-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@gnd/ui/dropdown-menu";
import { Field, FieldGroup } from "@gnd/ui/field";
import { Alert, AlertDescription } from "@gnd/ui/alert";
import { Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent, AttachmentTitle, AttachmentActions, AttachmentAction } from "@gnd/ui/attachment";
import { ArrowUp, FileText, ImageIcon, LoaderCircle, Plus, Square, X, MessageSquareText } from "lucide-react";
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
	onSalesRequestSubmit: () => void;
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
	salesRequestMode: boolean;
	onToggleSalesRequest: () => void;
};

export function AssistantInput(props: AssistantInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFiles = (files: File[]) => {
    if (props.salesRequestMode) props.onToggleSalesRequest();
    props.onAddFiles(files);
  };
  const submit = () => {
    if (props.isStreaming) { props.onStop?.(); return; }
    if (!props.disabled) {
      if (props.salesRequestMode) props.onSalesRequestSubmit();
      else props.onSubmit();
    }
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
      onDrop={event => { event.preventDefault(); event.stopPropagation(); if (!props.uploading) addFiles(Array.from(event.dataTransfer.files)); }}>
      <input ref={fileInputRef} type="file" hidden multiple accept={assistantAttachmentMimeTypes.join(",")}
        onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
      <FieldGroup>
        <Field>
          <InputGroup>
            <InputGroupTextarea aria-label="Message the assistant" placeholder={props.placeholder}
              value={props.value} onChange={event => props.onChange(event.target.value)}
              rows={2} autoFocus={props.autoFocus} className="max-h-48 min-h-20"
              onKeyDown={onKeyDown}
              onPaste={event => {
                const files = Array.from(event.clipboardData.files);
                if (files.length) { event.preventDefault(); if (!props.uploading) addFiles(files); }
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <InputGroupButton type="button" variant="ghost" size="icon-sm" aria-label="Add to message" disabled={props.uploading}>
                    {props.uploading ? <LoaderCircle className="animate-spin" /> : <Plus />}
                  </InputGroupButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-60">
                  <DropdownMenuItem onSelect={() => fileInputRef.current?.click()} className="gap-2">
                    <FileText className="size-4" aria-hidden="true" /> Upload/select image or file
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={props.onToggleSalesRequest} className="gap-2">
                    <MessageSquareText className="size-4" aria-hidden="true" />
                    <span>Sales request</span>
                    <span className="ml-auto text-xs text-muted-foreground">{props.salesRequestMode ? "On" : "Off"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {props.salesRequestMode ? (
                <button type="button" className="group inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground transition-colors hover:bg-secondary"
                  aria-label="Exit Sales request mode" title="Create sales request" onClick={props.onToggleSalesRequest}>
                  <MessageSquareText className="size-3.5 group-hover:hidden" aria-hidden="true" />
                  <X className="hidden size-3.5 group-hover:block" aria-hidden="true" />
                  Sales request
                </button>
              ) : null}
              {props.uploading ? <output>Attaching files…</output> : null}
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
