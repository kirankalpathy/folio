import { App as AntApp, Avatar, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { LogOut, Settings, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { palette } from '../../theme/palette';
import { getInitials } from '../../utils/profile';

export default function UserMenu() {
  const { profile, lock } = useAuth();
  const { modal } = AntApp.useApp();
  const { t } = useI18n();
  const navigate = useNavigate();

  if (!profile) return null;

  const items: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserRound size={15} />,
      label: t('nav.profile'),
    },
    {
      key: 'settings',
      icon: <Settings size={15} />,
      label: t('nav.settings'),
    },
    { type: 'divider' },
    {
      key: 'lock',
      icon: <LogOut size={15} />,
      label: t('userMenu.lock'),
      danger: true,
    },
  ];

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'profile') navigate('/profile');
    if (key === 'settings') navigate('/settings');
    if (key === 'lock') {
      modal.confirm({
        title: t('userMenu.lockTitle'),
        content: t('userMenu.lockBody'),
        okText: t('common.lock'),
        cancelText: t('common.stay'),
        onOk: lock,
      });
    }
  };

  return (
    <Dropdown menu={{ items, onClick: handleClick }} trigger={['click']} placement="bottomRight">
      <button
        type="button"
        className="inline-flex rounded-full border border-folio-ink/10 p-0.5 transition-colors hover:border-folio-primary/40 dark:border-white/10 dark:hover:border-folio-primary/50"
        aria-label={t('userMenu.aria')}
      >
        <Avatar
          size={32}
          src={profile.photo}
          style={!profile.photo ? { backgroundColor: palette.primary, color: palette.avatarOnPrimary, fontFamily: '"Inter Variable", Inter, system-ui, sans-serif', fontSize: 11, fontWeight: 600 } : undefined}
        >
          {!profile.photo ? getInitials(profile) : null}
        </Avatar>
      </button>
    </Dropdown>
  );
}
