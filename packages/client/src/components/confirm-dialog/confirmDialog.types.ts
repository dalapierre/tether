export type ConfirmDialogProps = {
    message: string;
    cancelLabel: string;
    confirmLabel: string;
    onCancel: () => void;
    onConfirm: () => void;
    busy?: boolean;
    /** Accessible name for the dialog. Defaults to the message. */
    ariaLabel?: string;
};
