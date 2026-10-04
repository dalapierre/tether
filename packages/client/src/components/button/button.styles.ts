import type { ButtonVariant } from './button.types';

const base = 'rounded-md px-3 py-2.5 font-medium disabled:opacity-60';

const variants: Record<ButtonVariant, string> = {
    primary: `${base} bg-zinc-100 text-zinc-950`,
    secondary: `${base} border border-zinc-700 bg-transparent text-zinc-100`,
};

export const styles = {
    variant: (variant: ButtonVariant, fullWidth: boolean) =>
        `${variants[variant]}${fullWidth ? ' w-full' : ' shrink-0'}`,
};
