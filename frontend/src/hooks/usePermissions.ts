import { useUser } from '../context/UserContext';
import { ROLE_PERMISSIONS, Permission, Role } from '../types/permissions';

export const usePermissions = () => {
  const { role } = useUser();

  const can = (permission: Permission | string) => {
    if (!role) return false;
    const list = ROLE_PERMISSIONS[role as Role];
    return list?.includes(permission as Permission) ?? false;
  };

  return { can };
};
