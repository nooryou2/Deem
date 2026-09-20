// src/hooks/useCompanyId.ts
import { useAuth } from '@/context/AuthContext';

/**
 * Returns the id of the company (provider account) whose data should be shown.
 * - For a provider, that's their own uid.
 * - For a manager (an employee with manager privilege viewing the provider
 *   interface), that's their employer's id.
 * Returns null while auth is still resolving.
 */
export function useCompanyId(): string | null {
  const { user, role, employerId } = useAuth();
  if (!user) return null;
  if (role === 'provider') return user.uid;
  if (role === 'employee') return employerId ?? null;
  return user.uid;
}
