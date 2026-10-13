import { useMediaQuery } from '@ui/libs/dom/useMediaQuery';
import {
    cloneElement,
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type FocusEvent,
    type MouseEvent,
    type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';
import { styles } from './tooltip.styles';
import type { TooltipProps, TooltipSide } from './tooltip.types';

const DEFAULT_DELAY_MS = 350;
const OFFSET_PX = 6;
/** Triggers wider than this anchor to the pointer (or leading edge), not the center. */
const COMPACT_TRIGGER_MAX_PX = 40;
const HOVER_MEDIA_QUERY = '(hover: hover) and (pointer: fine)';

type Coords = { top: number; left: number; side: TooltipSide };

function hasTooltipContent(content: TooltipProps['content']): boolean {
    if (content == null || content === false) return false;
    if (typeof content === 'string') return content.trim().length > 0;
    return true;
}

function clampLeft(left: number, bubbleWidth: number): number {
    return Math.min(Math.max(OFFSET_PX, left), window.innerWidth - bubbleWidth - OFFSET_PX);
}

function positionFor(trigger: DOMRect, bubble: DOMRect, preferred: TooltipSide, anchorX: number | null): Coords {
    const spaceAbove = trigger.top;
    const spaceBelow = window.innerHeight - trigger.bottom;
    let side = preferred;
    if (preferred === 'bottom' && spaceBelow < bubble.height + OFFSET_PX && spaceAbove > spaceBelow) {
        side = 'top';
    } else if (preferred === 'top' && spaceAbove < bubble.height + OFFSET_PX && spaceBelow > spaceAbove) {
        side = 'bottom';
    }

    const top = side === 'bottom' ? trigger.bottom + OFFSET_PX : trigger.top - bubble.height - OFFSET_PX;

    let left: number;
    if (anchorX != null) {
        // Stay under the pointer for wide rows / truncated labels.
        left = clampLeft(anchorX - bubble.width / 2, bubble.width);
    } else if (trigger.width > COMPACT_TRIGGER_MAX_PX) {
        // Keyboard focus on a wide control: lead edge, not geometric center.
        left = clampLeft(trigger.left, bubble.width);
    } else {
        left = clampLeft(trigger.left + trigger.width / 2 - bubble.width / 2, bubble.width);
    }

    return { top, left, side };
}

export function Tooltip({
    content,
    children,
    side = 'bottom',
    delayMs = DEFAULT_DELAY_MS,
    disabled = false,
}: TooltipProps) {
    const tooltipId = useId();
    const canHover = useMediaQuery(HOVER_MEDIA_QUERY);
    const triggerRef = useRef<HTMLElement | null>(null);
    const bubbleRef = useRef<HTMLSpanElement | null>(null);
    const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const anchorXRef = useRef<number | null>(null);
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<Coords | null>(null);

    const enabled = !disabled && hasTooltipContent(content) && canHover;

    const clearShowTimer = useCallback(() => {
        if (showTimerRef.current != null) {
            clearTimeout(showTimerRef.current);
            showTimerRef.current = null;
        }
    }, []);

    const hide = useCallback(() => {
        clearShowTimer();
        anchorXRef.current = null;
        setOpen(false);
        setCoords(null);
    }, [clearShowTimer]);

    const scheduleShow = useCallback(() => {
        if (!enabled) return;
        clearShowTimer();
        showTimerRef.current = setTimeout(() => setOpen(true), delayMs);
    }, [clearShowTimer, delayMs, enabled]);

    const updatePosition = useCallback(() => {
        if (!triggerRef.current || !bubbleRef.current) return;
        setCoords(
            positionFor(
                triggerRef.current.getBoundingClientRect(),
                bubbleRef.current.getBoundingClientRect(),
                side,
                anchorXRef.current,
            ),
        );
    }, [side]);

    useEffect(() => () => clearShowTimer(), [clearShowTimer]);

    useEffect(() => {
        if (!open) return;
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') hide();
        }
        function onScroll() {
            hide();
        }
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', hide);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', hide);
        };
    }, [hide, open]);

    useLayoutEffect(() => {
        if (!open) return;
        updatePosition();
    }, [open, updatePosition, content]);

    if (!enabled) {
        return children;
    }

    const child = children as ReactElement<{
        ref?: ((node: HTMLElement | null) => void) | { current: HTMLElement | null } | null;
        onMouseEnter?: (event: MouseEvent) => void;
        onMouseMove?: (event: MouseEvent) => void;
        onMouseLeave?: (event: MouseEvent) => void;
        onFocus?: (event: FocusEvent) => void;
        onBlur?: (event: FocusEvent) => void;
        'aria-describedby'?: string;
    }>;

    const trigger = cloneElement(child, {
        ref: (node: HTMLElement | null) => {
            triggerRef.current = node;
            const { ref } = child.props;
            if (typeof ref === 'function') ref(node);
            else if (ref && typeof ref === 'object') ref.current = node;
        },
        'aria-describedby': open ? tooltipId : child.props['aria-describedby'],
        onMouseEnter: (event: MouseEvent) => {
            child.props.onMouseEnter?.(event);
            anchorXRef.current = event.clientX;
            scheduleShow();
        },
        onMouseMove: (event: MouseEvent) => {
            child.props.onMouseMove?.(event);
            // Track pointer only until shown so the bubble stays put once open.
            if (!open) anchorXRef.current = event.clientX;
        },
        onMouseLeave: (event: MouseEvent) => {
            child.props.onMouseLeave?.(event);
            hide();
        },
        onFocus: (event: FocusEvent) => {
            child.props.onFocus?.(event);
            // No pointer for keyboard focus — use trigger geometry.
            anchorXRef.current = null;
            scheduleShow();
        },
        onBlur: (event: FocusEvent) => {
            child.props.onBlur?.(event);
            hide();
        },
    });

    const bubbleStyle: CSSProperties | undefined = coords
        ? { top: coords.top, left: coords.left }
        : { top: 0, left: 0, visibility: 'hidden' };

    return (
        <>
            {trigger}
            {open
                ? createPortal(
                      <span ref={bubbleRef} id={tooltipId} role='tooltip' className={styles.bubble} style={bubbleStyle}>
                          {content}
                      </span>,
                      document.body,
                  )
                : null}
        </>
    );
}
