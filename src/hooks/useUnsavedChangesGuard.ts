import { useDialog } from '@/components/AppDialog';
import { Platform } from 'react-native';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Stops a form screen from being dismissed while it contains unsaved changes.
 * Header back, gestures, Android back, and React Navigation back actions all
 * go through the same warning dialog.
 */
export default function useUnsavedChangesGuard(
  navigation: {
    addListener: (event: 'beforeRemove', callback: (event: any) => void) => () => void;
    dispatch: (action: any) => void;
  },
  hasUnsavedChanges: boolean,
) {
  const dialog = useDialog();
  const bypassNext = useRef(false);

  const allowNextNavigation = useCallback(() => {
    bypassNext.current = true;
  }, []);

  useEffect(() => {
    return navigation.addListener('beforeRemove', (event: any) => {
      if (!hasUnsavedChanges || bypassNext.current) return;

      event.preventDefault();
      dialog
        .confirm({
          title: 'Leave without saving?',
          message: 'You have unsaved changes. Do you want to leave without saving?',
          tone: 'warning',
          confirmLabel: 'Leave',
          cancelLabel: 'Keep editing',
          destructive: true,
        })
        .then((leave) => {
          if (!leave) return;
          bypassNext.current = true;
          navigation.dispatch(event.data.action);
        });
    });
  }, [dialog, hasUnsavedChanges, navigation]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges || bypassNext.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  return allowNextNavigation;
}
