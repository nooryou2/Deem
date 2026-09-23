import LanguageSwitcher from '@/components/LanguageSwitcher';
import DirectionalArrow from '@/components/DirectionalArrow';
import Text from '@/components/app-text';
import { useLanguage } from '@/i18n/LanguageContext';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { colors,radius,shadow } from '@/theme/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,{ useRef,useState } from 'react';
import { Image,Pressable,ScrollView,StyleSheet,View,useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const photos = {
  home: require('../../assets/landing/living-room.jpg'),
  kitchen: require('../../assets/landing/kitchen.jpg'),
  bathroom: require('../../assets/landing/bathroom.jpg'),
};
const services = [
  {
    title: 'التكييف وراحة المنزل',
    text: 'تابع مواعيد صيانة المكيفات، واجعل أجواء منزلك مريحة طوال العام.',
    image: photos.home,
    tag: 'راحة في كل موسم',
  },
  {
    title: 'العناية بالأجهزة',
    text: 'نظّم صيانة أجهزتك المنزلية واحتفظ بسجل أعمالها في مكان واحد.',
    image: photos.kitchen,
    tag: 'اهتمام بكل التفاصيل',
  },
  {
    title: 'أنظمة المياه',
    text: 'تذكّر مواعيد العناية بفلاتر المياه والخزانات وسخانات منزلك.',
    image: photos.bathroom,
    tag: 'عناية تدوم',
  },
];

type Props = NativeStackScreenProps<AuthStackParamList, 'Landing'>;
export default function LandingScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const compact = width < 800;
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const [servicesY, setServicesY] = useState(0);
  const [stepsY, setStepsY] = useState(0);
  const go = () => navigation.navigate('Register');
  const action = (label: string, onPress: () => void, light = false, arrow = false) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        s.button,
        light && s.buttonLight,
        (pressed || hovered) && { opacity: 0.8 },
      ]}
    >
      <View style={s.arrowRow}>
        <Text style={[s.buttonText, light && { color: colors.textPrimary }]}>{t(label)}</Text>
        {arrow ? (
          <DirectionalArrow
            kind="forward"
            color={light ? colors.textPrimary : colors.white}
          />
        ) : null}
      </View>
    </Pressable>
  );
  return (
    <ScrollView
      ref={scroll}
      style={s.page}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View style={[s.wrap, { paddingHorizontal: compact ? 22 : 48 }]}>
        <LanguageSwitcher />
        <View style={s.nav}>
          <View style={s.brand}>
            <Image
              source={require('../../assets/logo.png')}
              accessibilityLabel={t('ديم DEEM')}
              style={s.logo}
              resizeMode="contain"
            />
          </View>
          {!compact && (
            <View style={s.navLinks}>
              <Pressable
                accessibilityRole="button"
                onPress={() => scroll.current?.scrollTo({ y: servicesY, animated: true })}
              >
                <Text style={s.navText}>{t('خدماتنا')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => scroll.current?.scrollTo({ y: stepsY, animated: true })}
              >
                <Text style={s.navText}>{t('كيف يعمل ديم؟')}</Text>
              </Pressable>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Login')}
            style={s.login}
          >
            <Text style={s.navText}>{t('تسجيل الدخول ↗')}</Text>
          </Pressable>
        </View>
        <View style={[s.hero, compact && { flexDirection: 'column', gap: 32, paddingTop: 30 }]}>
          <View
            style={[
              s.heroCopy,
              compact && { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%' },
            ]}
          >
            <Text style={s.eyebrow}>{t('لأن راحة البيت تبدأ بالاهتمام')}</Text>
            <Text
              accessibilityRole="header"
              style={[s.title, compact && { fontSize: 43, lineHeight: 65 }]}
            >
              {t('بيتك بخير،')} {'\n'}
              <Text style={{ color: colors.primary }}>{t('وبالك مرتاح.')}</Text>
            </Text>
            <Text style={s.description}>
              {t(
                'كل ما يحتاجه منزلك من عناية، في مكان واحد. مع ديم، نظّم الصيانة، تابع مواعيدها، واطلب الخدمة بكل سهولة.',
              )}
            </Text>
            <View style={s.actions}>
              {action('ابدأ العناية بمنزلك', go, false, true)}
              {action(
                'اكتشف خدماتنا',
                () => scroll.current?.scrollTo({ y: servicesY, animated: true }),
                true,
              )}
            </View>
            <View style={s.heroNote}>
              <Text style={s.check}>✓</Text>
              <Text style={s.note}>{t('مواعيد منظّمة · تذكيرات بالصيانة · سجل متكامل')}</Text>
            </View>
          </View>
          <View
            style={[
              s.heroVisual,
              compact && {
                flexGrow: 0,
                flexShrink: 0,
                flexBasis: 'auto',
                width: '100%',
                height: 370,
              },
            ]}
          >
            <Image
              source={photos.home}
              accessibilityLabel={t('غرفة معيشة مشرقة بألوان دافئة وأثاث مريح')}
              style={s.heroImage}
            />
            <View style={s.imageLabel}>
              <Text style={s.imageLabelText}>{t('مساحة للراحة. وعناية بكل زاوية.')}</Text>
            </View>
            <View style={s.floatingCard}>
              <View style={s.cardIcon}>
                <Text style={{ color: colors.primaryDark, fontSize: 23 }}>✓</Text>
              </View>
              <View>
                <Text style={s.cardTitle}>{t('التفاصيل الصغيرة تصنع الفرق')}</Text>
                <Text style={s.cardText}>{t('صيانة اليوم، راحة لبكرة.')}</Text>
              </View>
            </View>
          </View>
        </View>
        <View
          style={[
            s.benefits,
            compact && { flexDirection: 'column', alignItems: 'stretch', gap: 22 },
          ]}
        >
          {[
            '01   كل تفاصيل منزلك في مكان واحد',
            '02   خطّط للصيانة قبل موعدها',
            '03   تابع طلباتك خطوة بخطوة',
          ].map((text) => (
            <Text key={text} style={s.benefit}>
              {t(text)}
            </Text>
          ))}
        </View>
        <View onLayout={(e) => setServicesY(e.nativeEvent.layout.y)} style={s.section}>
          <Text style={s.eyebrow}>{t('عناية تليق بمنزلك')}</Text>
          <View style={s.sectionHeading}>
            <Text accessibilityRole="header" style={[s.sectionTitle, compact && { fontSize: 29 }]}>
              {t('لكل ركن في بيتك، اهتمام.')}
            </Text>
            <Text style={s.sectionSubtitle}>
              {t('من الصيانة الدورية إلى تفاصيل الحياة اليومية.')}
            </Text>
          </View>
          <View style={[s.grid, compact && { flexDirection: 'column' }]}>
            {services.map((service) => (
              <Pressable
                key={t(service.title)}
                accessibilityRole="button"
                accessibilityLabel={`${t(service.title)} · ${t('Create Account')}`}
                onPress={go}
                style={({ pressed, hovered }: any) => [
                  s.service,
                  compact && { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
                  (pressed || hovered) && { backgroundColor: colors.primaryLight },
                ]}
              >
                <Image
                  source={service.image}
                  accessibilityLabel={t(service.title)}
                  style={s.serviceImage}
                />
                <View style={s.serviceBody}>
                  <Text style={s.tag}>{t(service.tag)}</Text>
                  <Text style={s.serviceTitle}>{t(service.title)}</Text>
                  <Text style={s.serviceText}>{t(service.text)}</Text>
                  <View style={s.arrowRow}>
                    <Text style={s.serviceLink}>{t('ابدأ الآن')}</Text>
                    <DirectionalArrow kind="forward" size={14} color={colors.primary} />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
        <View
          onLayout={(e) => setStepsY(e.nativeEvent.layout.y)}
          style={[s.stepsSection, compact && { padding: 24 }]}
        >
          <Text style={s.eyebrow}>{t('خطوات بسيطة، راحة أكبر')}</Text>
          <Text accessibilityRole="header" style={s.sectionTitle}>
            {t('منزلك تحت العناية في ٣ خطوات')}
          </Text>
          <View style={[s.grid, { marginTop: 32 }, compact && { flexDirection: 'column' }]}>
            {[
              ['١', 'أضف منزلك', 'أنشئ حسابك وأضف أجهزة منزلك واحتياجات الصيانة.'],
              ['٢', 'نظّم مواعيدك', 'حدّد دورية الصيانة وتابع الأعمال القادمة بسهولة.'],
              ['٣', 'تابع واطمئن', 'اطلب الخدمة واحتفظ بسجل الصيانة للرجوع إليه.'],
            ].map(([number, title, text]) => (
              <View key={number} style={s.step}>
                <Text style={s.stepNumber}>{number}</Text>
                <Text style={s.serviceTitle}>{t(title)}</Text>
                <Text style={s.serviceText}>{t(text)}</Text>
              </View>
            ))}
          </View>
        </View>
        <View
          style={[
            s.cta,
            compact && { flexDirection: 'column', alignItems: 'stretch', gap: 24, padding: 28 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={s.ctaTitle}>
              {t('خلّ العناية علينا، والراحة لك.')}
            </Text>
            <Text style={s.ctaText}>{t('ابدأ بتنظيم صيانة منزلك مع ديم اليوم.')}</Text>
          </View>
          {action('أنشئ حسابك', go, false, true)}
        </View>
        <View style={s.footer}>
          <Image
            source={require('../../assets/logo.png')}
            accessibilityLabel={t('ديم DEEM')}
            style={s.logo}
            resizeMode="contain"
          />
          <Text style={s.note}>{t('اهتمام بالبيت، وراحة لأهله.')}</Text>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Login')}>
            <View style={s.arrowRow}>
              <Text style={s.navText}>{t('الدخول إلى حسابك')}</Text>
              <DirectionalArrow kind="forward" size={14} color={colors.primary} />
            </View>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  // Label and arrow side by side. The row follows the reading direction, so in
  // Arabic the arrow lands on the left without any special casing.
  arrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  page: { flex: 1, backgroundColor: colors.background },
  wrap: { width: '100%', maxWidth: 1440, alignSelf: 'center' },
  nav: {
    minHeight: 104,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 76, height: 84 },
  brandName: { fontSize: 27, fontWeight: '700', color: colors.textPrimary },
  brandLatin: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  navLinks: { flexDirection: 'row', gap: 36 },
  navText: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
  login: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 60, paddingTop: 55, paddingBottom: 54 },
  heroCopy: { flex: 1 },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'auto',
    marginBottom: 16,
  },
  title: {
    fontSize: 62,
    lineHeight: 88,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'auto',
    marginBottom: 22,
  },
  description: {
    fontSize: 17,
    lineHeight: 31,
    color: colors.textSecondary,
    textAlign: 'auto',
    maxWidth: 480,
    alignSelf: 'flex-start',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 30 },
  button: {
    paddingVertical: 17,
    paddingHorizontal: 23,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLight: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  heroNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 23 },
  check: { color: colors.primaryDark, fontSize: 18 },
  note: { color: colors.textSecondary, fontSize: 12, textAlign: 'auto', flexShrink: 1 },
  heroVisual: { flex: 1, height: 505 },
  heroImage: { width: '100%', height: '100%', borderRadius: radius.lg },
  imageLabel: {
    position: 'absolute',
    top: 24,
    right: 20,
    backgroundColor: '#FFFFFFE8',
    borderRadius: 30,
    padding: 12,
  },
  imageLabelText: { color: colors.textPrimary, fontSize: 12 },
  floatingCard: {
    position: 'absolute',
    bottom: 26,
    left: 18,
    right: 18,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardIcon: { backgroundColor: colors.primaryLight, borderRadius: 30, padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, textAlign: 'auto' },
  cardText: { color: colors.textSecondary, fontSize: 12, textAlign: 'auto', marginTop: 6 },
  benefits: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 25,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  benefit: { fontSize: 14, color: colors.textSecondary, textAlign: 'auto' },
  section: { paddingVertical: 64 },
  sectionHeading: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 33,
    lineHeight: 49,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'auto',
  },
  sectionSubtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'auto', marginTop: 9 },
  grid: { flexDirection: 'row', gap: 24 },
  service: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    ...shadow.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceImage: { width: '100%', height: 225 },
  serviceBody: { padding: 24 },
  tag: { color: colors.primaryDark, fontSize: 12, textAlign: 'auto', marginBottom: 10 },
  serviceTitle: {
    fontSize: 21,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'auto',
    marginBottom: 12,
  },
  serviceText: { fontSize: 14, lineHeight: 26, color: colors.textSecondary, textAlign: 'auto' },
  serviceLink: {
    color: colors.primaryDark,
    textAlign: 'auto',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 20,
  },
  stepsSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 42,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  step: { flex: 1 },
  stepNumber: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.white,
    backgroundColor: colors.primary,
    width: 42,
    height: 42,
    lineHeight: 42,
    borderRadius: 21,
    textAlign: 'center',
    alignSelf: 'flex-start',
    overflow: 'hidden',
    marginBottom: 18,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
    padding: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 52,
  },
  ctaTitle: {
    color: colors.textPrimary,
    fontSize: 29,
    lineHeight: 44,
    fontWeight: '700',
    textAlign: 'auto',
  },
  ctaText: { color: colors.textSecondary, fontSize: 15, textAlign: 'auto', marginTop: 10 },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 30,
  },
});
