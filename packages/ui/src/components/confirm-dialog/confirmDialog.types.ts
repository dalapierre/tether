export type ConfirmDialogProps = {
    message: string;
    cancelLabel: string;
    confirmLabel: string;
    onCancel: () => void;
    onConfirm: () => void;
    /** Optional third action (e.g. "Don't save"), rendered between confirm and cancel. */
    alternateLabel?: string;
    onAlternate?: () => void;
    busy?: boolean;
    /** Accessible name for the dialog. Defaults to the message. */
    ariaLabel?: string;
};
