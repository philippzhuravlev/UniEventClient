import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { onAuthUserChanged, type AuthUser } from '../services/auth';
import { isEventLiked, LIKES_CHANGED_EVENT, toggleLikedEvent } from '../services/likes';
import type { Event } from '../types';

type LikeButtonProps = {
    event: Event;
    compact?: boolean;
    iconOnly?: boolean;
    className?: string;
    likedLabel?: string;
    unlikedLabel?: string;
    onToggleChange?: (isLiked: boolean) => void;
};

export function LikeButton({
    event,
    compact = false,
    iconOnly = false,
    className = '',
    likedLabel = 'Liked',
    unlikedLabel = 'Like',
    onToggleChange,
}: LikeButtonProps) {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [isLiked, setIsLiked] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => onAuthUserChanged(setCurrentUser), []);

    useEffect(() => {
        const syncLikedState = async () => {
            if (!currentUser?.uid) {
                setIsLiked(false);
                return;
            }

            setIsLiked(await isEventLiked(currentUser.uid, event.id));
        };

        void syncLikedState();
        const handleLikesChanged = () => {
            void syncLikedState();
        };
        window.addEventListener(LIKES_CHANGED_EVENT, handleLikesChanged);

        return () => {
            window.removeEventListener(LIKES_CHANGED_EVENT, handleLikesChanged);
        };
    }, [currentUser?.uid, event.id]);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (isUpdating) {
            return;
        }

        if (!currentUser?.uid) {
            navigate('/login');
            return;
        }

        try {
            setIsUpdating(true);
            const nextLiked = await toggleLikedEvent(currentUser.uid, event.id);
            setIsLiked(nextLiked);
            onToggleChange?.(nextLiked);
        } finally {
            setIsUpdating(false);
        }
    };

    const label = isLiked ? likedLabel : unlikedLabel;
    const buttonClasses = compact
        ? 'inline-flex items-center gap-2 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors duration-200 hover:bg-[var(--button-hover)]'
        : 'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors duration-200';
    const iconOnlyClasses = iconOnly
        ? 'h-12 w-12 justify-center rounded-xl border p-0 shadow-[0_8px_18px_rgba(16,24,40,0.10)] backdrop-blur-md transition-colors duration-200'
        : '';
    const stateClasses = iconOnly
        ? isLiked
            ? 'border-[color-mix(in_srgb,var(--dtu-accent)_55%,var(--panel-border)_45%)] bg-[rgba(255,255,255,0.18)] text-[var(--dtu-accent)] hover:bg-[rgba(255,255,255,0.26)] dark:bg-[rgba(18,20,36,0.72)] dark:text-[var(--dtu-accent-light)] dark:hover:bg-[rgba(30,63,242,0.16)]'
            : 'border-[var(--panel-border)] bg-[rgba(255,255,255,0.18)] text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.26)] dark:bg-[rgba(18,20,36,0.72)] dark:text-[var(--text-primary)] dark:hover:bg-[rgba(30,63,242,0.16)]'
        : isLiked
            ? 'border-[color-mix(in_srgb,var(--dtu-accent)_55%,var(--panel-border)_45%)] bg-[color-mix(in_srgb,var(--dtu-accent)_16%,var(--panel-bg)_84%)] text-[var(--dtu-accent)] hover:bg-[color-mix(in_srgb,var(--dtu-accent)_22%,var(--panel-bg)_78%)] dark:text-[var(--dtu-accent-light)]'
            : 'border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-primary)] hover:bg-[var(--button-hover)] dark:text-[var(--text-primary)] dark:hover:bg-[rgba(30,63,242,0.16)]';
    const rootClasses = stateClasses;

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isUpdating}
            aria-pressed={isLiked}
            aria-label={label}
            className={`${buttonClasses} ${iconOnlyClasses} ${rootClasses} ${className}`.trim()}
        >
            <Heart
                size={iconOnly ? 24 : 18}
                strokeWidth={iconOnly ? 2.6 : 2.2}
                className={isLiked ? 'text-red-500' : undefined}
                fill={isLiked ? 'currentColor' : 'none'}
            />
            {!iconOnly && label}
        </button>
    );
}