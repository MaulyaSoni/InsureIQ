import { useAuth } from '@/lib/auth-context';

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg';
}

export function UserAvatar({ size = 'md' }: UserAvatarProps) {
  const { user } = useAuth();
  const initials = (user?.name || user?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center shrink-0 font-semibold`}
      style={{
        backgroundColor: 'rgba(83,74,183,0.15)',
        color: 'var(--text-brand)',
      }}
      title={user?.name || user?.email || ''}
    >
      {initials}
    </div>
  );
}
