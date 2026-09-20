import Text from '@/components/app-text';
import { useLanguage } from '@/i18n/LanguageContext';
import { attachmentURL,uploadAttachment } from '@/services/attachmentService';
import { colors,radius } from '@/theme/theme';
import type { Attachment } from '@/types';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React,{ useState } from 'react';
import { ActivityIndicator,Image,Linking,Pressable,View } from 'react-native';
import Button from './Button';

export default function AttachmentPicker({
  value,
  onChange,
  providerId,
  imagesOnly = false,
  readonly = false,
  onBusyChange,
}: {
  value: Attachment[];
  onChange?: (files: Attachment[]) => void;
  providerId?: string;
  imagesOnly?: boolean;
  readonly?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  async function pick(images: boolean) {
    setError('');
    try {
      let selected: { uri: string; name: string; mimeType?: string; size?: number } | null = null;
      if (images) {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
        if (result.canceled) return;
        const file = result.assets[0];
        selected = {
          uri: file.uri,
          name: file.fileName || 'photo.jpg',
          mimeType: file.mimeType || 'image/jpeg',
          size: file.fileSize,
        };
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
          copyToCacheDirectory: true,
        });
        if (result.canceled) return;
        selected = result.assets[0];
      }
      setBusy(true);
      onBusyChange?.(true);
      const attachment = await uploadAttachment(selected, providerId);
      onChange?.([...value, attachment]);
    } catch (e) {
      setError(
        t(
          e instanceof Error && e.message === 'INVALID_FILE'
            ? 'File is too large or unsupported.'
            : 'Could not upload the file. Please try again.',
        ),
      );
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  async function open(file: Attachment) {
    try {
      const url = await attachmentURL(file);
      if (file.contentType.startsWith('image/')) setPreview(url);
      else await Linking.openURL(url);
    } catch {
      setError(t('Could not load. Please try again.'));
    }
  }
  if (readonly && !value.length) return null;
  return (
    <View style={{ gap: 12, marginVertical: 16 }}>
      <Text style={{ color: colors.textSecondary }}>
        {t(imagesOnly ? 'Problem photos' : 'Attachments')}
      </Text>
      {value.map((file) => (
        <View
          key={file.id}
          style={{
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
            backgroundColor: colors.surface,
            padding: 12,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('Open')} ${file.name}`}
            onPress={() => open(file)}
            style={{ flex: 1 }}
          >
            <Text style={{ color: colors.primaryDark }}>{file.name}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {Math.ceil(file.size / 1024)} KB
            </Text>
          </Pressable>
          {!readonly && (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => onChange?.(value.filter((item) => item.id !== file.id))}
            >
              <Text style={{ color: colors.danger }}>{t('Remove')}</Text>
            </Pressable>
          )}
        </View>
      ))}
      {preview && (
        <View>
          <Image
            source={{ uri: preview }}
            style={{ width: '100%', height: 260 }}
            resizeMode="contain"
          />
          <Button label={t('Close')} variant="secondary" onPress={() => setPreview(null)} />
        </View>
      )}
      {!readonly && value.length < 4 && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            label={t('Add photos')}
            disabled={busy}
            onPress={() => pick(true)}
            variant="secondary"
          />
          {!imagesOnly && (
            <Button
              label={t('Add document')}
              disabled={busy}
              onPress={() => pick(false)}
              variant="secondary"
            />
          )}
        </View>
      )}
      {!readonly && (
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
          {t('Up to 4 files, 5 MB each. Images or PDF.')}
        </Text>
      )}
      {busy && <ActivityIndicator color={colors.primary} />}
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      )}
    </View>
  );
}
