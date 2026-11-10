import { useRef } from 'react';
import { Avatar, Button } from 'antd';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useToast } from '../common/toast/ToastProvider';
import { getInitials } from '../../utils/profile';
import type { UserProfile } from '../../types';
import { palette } from '../../theme/palette';

const MAX_PHOTO_SIZE = 1_500_000;

export default function ProfilePhotoField({
  profile,
  photo,
  onChange,
}: {
  profile: UserProfile | null;
  photo?: string | null;
  onChange: (photo: string | null) => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const currentPhoto = photo === null ? undefined : photo || profile?.photo;

  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar
        size={72}
        src={currentPhoto}
        style={
          !currentPhoto
            ? { backgroundColor: palette.primary, color: palette.avatarOnPrimary, fontWeight: 600 }
            : undefined
        }
      >
        {!currentPhoto && profile ? getInitials(profile) : null}
      </Avatar>

      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.gif,.avif,.svg,image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
        hidden
        tabIndex={-1}
        aria-hidden="true"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          if (file.size > MAX_PHOTO_SIZE) {
            toast.error(t('profile.photo.tooLarge'));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') onChange(reader.result);
            else toast.error(t('profile.photo.readError'));
          };
          reader.onerror = () => {
            toast.error(t('profile.photo.readError'));
          };
          reader.readAsDataURL(file);
        }}
      />

      <div className="flex flex-wrap justify-center gap-2">
        <Button size="small" icon={<ImagePlus size={13} />} onClick={() => inputRef.current?.click()}>
          {t('profile.photo.change')}
        </Button>
        {currentPhoto && (
          <Button size="small" danger icon={<Trash2 size={13} />} onClick={() => onChange(null)}>
            {t('profile.photo.remove')}
          </Button>
        )}
      </div>
    </div>
  );
}
