"use client";

import {
  OpenPanelComponent,
  useOpenPanel,
} from "@openpanel/nextjs";
import { useCallback } from "react";

const isProd = process.env.NODE_ENV === "production";
const clientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;
type TrackProperties = Record<string, unknown>;

const Provider = () =>
  clientId ? (
    <OpenPanelComponent
      clientId={clientId}
      trackAttributes={true}
      trackScreenViews={isProd}
      trackOutgoingLinks={isProd}
    />
  ) : null;

const useTrack = () => {
  const { track: openTrack } = useOpenPanel();

  return useCallback(
    (options: { event: string } & TrackProperties) => {
      if (!isProd) {
        return;
      }

      const { event, ...rest } = options;

      openTrack(event, rest);
    },
    [openTrack],
  );
};

export { Provider, useTrack };
