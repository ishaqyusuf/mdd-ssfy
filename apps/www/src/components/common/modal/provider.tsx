"use client";

import {
    ReactNode,
    createContext,
    useContext,
    useState,
    useTransition,
} from "react";
import Modal, { openSecondaryPane } from ".";

export interface ModalContextProps {
    openModal: (content: ReactNode, type?: ModalType) => void;
    openSheet: (content: ReactNode, type?: ModalType) => void;
    close: (callBack?) => void;
    data: DataType;
    opened?: boolean;
    setShowModal;
    loading;
    startTransition;
    secondaryPaneIds?: string[];
    closeSecondaryPane;
    closeSecondaryPanes;
    openSecondaryPane;
}
export type ModalType = "modal" | "sheet";
const ModalContext = createContext<ModalContextProps | undefined>(undefined);
type DataType = { type?: ModalType; _data? };

function fn() {
    throw new Error("Modal Context not initialized");
}

const modalUtil: ModalContextProps = {
    openModal: fn,
    openSheet: fn,
    close: fn,
    data: null,
    setShowModal: null,
    loading: false,
    startTransition: null,
    secondaryPaneIds: [],
    closeSecondaryPane: null,
    closeSecondaryPanes: null,
    openSecondaryPane: null,
};
export function ModalProvider({ children }: { children: ReactNode }) {
    const [modalContent, setModalContent] = useState<ReactNode | null>(null);
    const [secondaryModalContent, setSecondaryModalContent] =
        useState<ReactNode | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [data, setData] = useState<DataType>({
        type: "modal",
    });
    const [loading, startTransition] = useTransition();
    const [secondaryPaneIds, setSeconPanesIds] = useState([]);

    const show = (
        content: ReactNode,
        type: ModalType = "modal",
        extras = {}
    ) => {
        setModalContent(content);
        setShowModal(true);
        setData({
            type,
            ...extras,
        });
    };

    const close = (callBack?) => {
        setShowModal(false);
        setTimeout(() => {
            setModalContent(null);
            callBack && callBack();
            document.body.style.pointerEvents = "";
        }, 1000); // Adjust this timeout as per your transition duration
    };
    const value = {
        loading,
        startTransition,
        close,
        setShowModal,
        data,
        opened: showModal,
        openModal(content: ReactNode, extras: any = {}) {
            show(content, "modal", extras);
        },
        openSheet(content: ReactNode, extras: any = {}) {
            show(content, "sheet", extras);
        },
        openSecondaryPane(paneId) {
            setSeconPanesIds([paneId]);
        },
        secondaryPaneIds,
        closeSecondaryPane(id) {
            setSeconPanesIds((current) => {
                return [...current].filter((a) => a != id);
            });
        },
        closeSecondaryPanes() {
            setSeconPanesIds((current) => {
                return [];
            });
        },
    };
    Object.keys(value).map((k) => {
        modalUtil[k] = value[k];
    });

    return (
        <ModalContext.Provider value={value}>
            {children}
            {showModal && (
                <Modal
                    showModal={showModal}
                    type={data.type || "modal"}
                    setShowModal={setShowModal}
                >
                    {modalContent}
                </Modal>
            )}
        </ModalContext.Provider>
    );
}

export function useModal() {
    // if (modalUtil.openModal) return _modal;
    const context = useContext<ModalContextProps>(ModalContext as any);
    if (!context) throw new Error("useModal must be within a ModalProvider");
    return context;
}
export const _modal = modalUtil;
