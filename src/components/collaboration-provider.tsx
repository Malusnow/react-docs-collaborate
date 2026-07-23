"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

import { LEFT_MARGIN_DEFAULT, RIGHT_MARGIN_DEFAULT } from "@/constants/margins";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface CollaborationContextValue {
  ydoc: Y.Doc;
  provider: HocuspocusProvider | null;
  isReady: boolean;
  isSynced: boolean;
  connectionError: string | null;
  connectionStatus: ConnectionStatus;
  leftMargin: number;
  rightMargin: number;
  setLeftMargin: (position: number) => void;
  setRightMargin: (position: number) => void;
}

type CollaborationResources = {
  remote: HocuspocusProvider;
  local: IndexeddbPersistence;
};

const CollaborationContext = createContext<CollaborationContextValue | null>(
  null,
);

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error(
      "useCollaboration must be used within a CollaborationProvider",
    );
  }
  return context;
}

interface CollaborationProviderProps {
  documentId: string;
  children: ReactNode;
}

export function CollaborationProvider({
  documentId,
  children,
}: CollaborationProviderProps) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [leftMargin, setLeftMarginState] = useState(LEFT_MARGIN_DEFAULT);
  const [rightMargin, setRightMarginState] = useState(RIGHT_MARGIN_DEFAULT);

  const resourcesRef = useRef<CollaborationResources | null>(null);
  const destroyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutMap = useMemo(() => ydoc.getMap<number>("layout"), [ydoc]);

  const setLeftMargin = useCallback(
    (position: number) => layoutMap.set("leftMargin", position),
    [layoutMap],
  );
  const setRightMargin = useCallback(
    (position: number) => layoutMap.set("rightMargin", position),
    [layoutMap],
  );

  useEffect(() => {
    const syncMarginsFromDoc = () => {
      const nextLeft = layoutMap.get("leftMargin");
      const nextRight = layoutMap.get("rightMargin");

      setLeftMarginState(
        typeof nextLeft === "number" ? nextLeft : LEFT_MARGIN_DEFAULT,
      );
      setRightMarginState(
        typeof nextRight === "number" ? nextRight : RIGHT_MARGIN_DEFAULT,
      );
    };

    syncMarginsFromDoc();
    layoutMap.observe(syncMarginsFromDoc);
    return () => layoutMap.unobserve(syncMarginsFromDoc);
  }, [layoutMap]);

  useEffect(() => {
    if (destroyTimeoutRef.current) {
      clearTimeout(destroyTimeoutRef.current);
      destroyTimeoutRef.current = null;
    }

    const collaborationUrl = process.env.NEXT_PUBLIC_COLLABORATION_URL;
    if (!collaborationUrl) {
      setConnectionStatus("disconnected");
      setConnectionError("Collaboration service is not configured.");
      return () => {
        destroyTimeoutRef.current = setTimeout(() => ydoc.destroy(), 0);
      };
    }

    if (!resourcesRef.current) {
      const remote = new HocuspocusProvider({
        name: `document.${documentId}`,
        url: collaborationUrl,
        document: ydoc,
        token: async () =>
          (await getTokenRef.current({ template: "convex" })) ?? "",
        onAuthenticated: () => setConnectionError(null),
        onAuthenticationFailed: () => {
          setIsSynced(false);
          setConnectionStatus("disconnected");
          setConnectionError("You no longer have access to this document.");
        },
        onStatus: ({ status }) => {
          setConnectionStatus(status as ConnectionStatus);
          if (status !== "connected") setIsSynced(false);
        },
        onSynced: ({ state }) => {
          if (!state) return;
          setIsSynced(true);
          setIsReady(true);
          setConnectionError(null);
        },
      });
      const local = new IndexeddbPersistence(`document.${documentId}`, ydoc);

      local.on("synced", () => {
        if (ydoc.getXmlFragment("default").length > 0) {
          setIsReady(true);
        }
      });

      resourcesRef.current = { remote, local };
    }

    const resources = resourcesRef.current;
    setProvider(resources.remote);
    setConnectionStatus("connecting");

    const tokenRefreshInterval = window.setInterval(
      () => {
        void resources.remote.sendToken();
      },
      4 * 60 * 1000,
    );

    return () => {
      window.clearInterval(tokenRefreshInterval);

      destroyTimeoutRef.current = setTimeout(() => {
        resources.remote.disconnect();
        resources.remote.destroy();
        resources.local.destroy();
        ydoc.destroy();
        resourcesRef.current = null;
      }, 0);
    };
  }, [documentId, ydoc]);

  const value = useMemo(
    () => ({
      ydoc,
      provider,
      isReady,
      isSynced,
      connectionError,
      connectionStatus,
      leftMargin,
      rightMargin,
      setLeftMargin,
      setRightMargin,
    }),
    [
      ydoc,
      provider,
      isReady,
      isSynced,
      connectionError,
      connectionStatus,
      leftMargin,
      rightMargin,
      setLeftMargin,
      setRightMargin,
    ],
  );

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}
