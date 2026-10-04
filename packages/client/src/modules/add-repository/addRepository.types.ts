export type AddRepositoryProps = {
    onClose: () => void;
    onAdded: (repository: { id: string; name: string; path: string }) => void;
};
