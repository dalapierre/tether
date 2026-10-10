export type CommentDialogProps = {
    fileName: string;
    startLine: number;
    endLine: number;
    onCancel: () => void;
    onConfirm: (comment: string) => void;
};
