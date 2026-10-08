import React from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import appJson from '../app.json';
import { COLORS, SPACING, RADII } from '../constants/theme';

// Set EXPO_PUBLIC_SUPPORT_EMAIL in the app's .env to your real support address.
const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@archiveauto.app';
const VERSION = appJson.expo?.version || '1.0.0';

// Each page is a list of { h: heading, p: paragraph } blocks.
// NOTE: Privacy and Terms below are plain-language drafts, not legal advice. Have them reviewed
// before you publish the app to a store.
const PAGES = {
  faq: {
    title: 'Help & FAQ',
    blocks: [
      { h: 'How do I add a vehicle?', p: 'Open the Garage tab and tap the + button. Enter the make, model and current odometer reading.' },
      { h: 'How do alerts work?', p: 'Alerts are calculated from your own records. A service alert appears when the last logged service of a type (oil change, tires, brakes, fluids, battery) is within 500 km of its interval, or past it. A document alert appears 30 days before a document\'s expiry date, and after it expires.' },
      { h: 'What are the service intervals?', p: 'Oil change 5,000 km, brakes 30,000 km, tires and fluids 40,000 km, battery 50,000 km. Alerts only appear for service types you have logged at least once.' },
      { h: 'Why is an alert not showing?', p: 'Check that the alert type is switched on in Settings, that the record has a mileage (services) or an expiry date (documents), and pull down on the Alerts screen to refresh.' },
      { h: 'Can I use miles?', p: 'Yes. Turn off "Use kilometres" in Settings. Values are stored in km and converted for display, so a mileage may differ by 1 mile after conversion.' },
      { h: 'I forgot my password', p: 'On the Sign In screen tap "Forgot password" and we will email you a reset link. Open the link on the phone that has the app installed.' },
    ],
    contact: true,
  },
  proof: {
    title: 'Photo Proof Policy',
    blocks: [
      { h: 'Why proof?', p: 'Attaching a photo of the shop invoice or receipt to a repair gives the record credibility when you sell the vehicle.' },
      { h: 'What to upload', p: 'A clear, uncropped photo showing the shop name, date, work done and amount. Cover personal details you do not want stored, such as card numbers.' },
      { h: 'Your responsibility', p: 'Only upload documents that belong to you. Records are stored as you enter them; ArchiveAuto does not independently verify them.' },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    blocks: [
      { h: 'What we store', p: 'Your email, display name, and the vehicles, maintenance, repair, parts and document records you add.' },
      { h: 'How we use it', p: 'To show your records, calculate reminders, send password-reset emails, and answer questions in the AI assistant. We do not sell your data.' },
      { h: 'AI assistant', p: 'When you ask the assistant a question, your message and, in Vehicle Aware mode, that vehicle\'s records are sent to Google\'s Gemini service to generate a reply.' },
      { h: 'Your choices', p: `You can edit or delete any record in the app. To delete your account and data, email ${SUPPORT_EMAIL}.` },
    ],
  },
  terms: {
    title: 'Terms of Service',
    blocks: [
      { h: 'Using ArchiveAuto', p: 'ArchiveAuto helps you keep vehicle records and reminders. You are responsible for the accuracy of what you enter.' },
      { h: 'Reminders are estimates', p: 'Service and expiry alerts are based on general intervals and the dates you provide. Follow your manufacturer\'s schedule and official renewal dates.' },
      { h: 'AI answers', p: 'The assistant can make mistakes. Do not rely on it for safety-critical decisions; consult a qualified mechanic.' },
      { h: 'Availability', p: 'The service is provided as is, and features may change.' },
    ],
  },
  about: {
    title: 'About ArchiveAuto',
    blocks: [
      { h: `ArchiveAuto v${VERSION}`, p: 'Keep every service, repair, part and document for your vehicles in one place, with reminders before things come due.' },
    ],
    contact: true,
  },
};

export default function InfoScreen({ navigation, route }) {
  const page = PAGES[route?.params?.page] || PAGES.about;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{page.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {page.blocks.map((b) => (
          <View key={b.h} style={styles.block}>
            <Text style={styles.heading}>{b.h}</Text>
            <Text style={styles.body}>{b.p}</Text>
          </View>
        ))}

        {page.contact && (
          <TouchableOpacity
            style={styles.contactButton}
            activeOpacity={0.8}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
            <Ionicons name="mail-outline" size={16} color={COLORS.background} />
            <Text style={styles.contactText}>Contact support</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.screenPadding,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 36 },
  content: { paddingHorizontal: SPACING.screenPadding, paddingBottom: 60, gap: SPACING.md },
  block: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.md,
  },
  heading: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 6 },
  body: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 12,
    marginTop: SPACING.sm,
  },
  contactText: { color: COLORS.background, fontSize: 14, fontWeight: '600' },
});