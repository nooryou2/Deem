// src/screens/provider/RequestDetailScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapPicker from '@/components/MapPicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import {
  updateRequestStatus,
  assignEmployee,
  fetchRequestsForProvider,
} from '@/services/requestService';
import { listEmployees } from '@/services/employeeService';
import {
  updateBookingStatus,
  freeSlot,
  assignEmployeeToBooking,
} from '@/services/bookingService';
import { getSavedLocations } from '@/services/roleService';
import { areaLabel } from '@/utils/areas';
import { SavedLocation } from '@/types';
import Button from '@/components/Button';
import { applianceLabel, applianceIcon } from '@/utils/appliances';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '@/utils/maintenanceTemplates';
import { formatFriendlyDate } from '@/utils/dateCalculations';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { ServiceRequest, ServiceRequestStatus, Employee } from '@/types';
import type { ProviderStackParamList } from '@/navigation/ProviderNavigator';

type Props = NativeStackScreenProps<ProviderStackParamList, 'RequestDetail'>;

// Slots are stored as 24h "HH:mm"; show them the way people read them.
function prettyTime(slot?: string): string {
  if (!slot) return '';
  const [h, m] = slot.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

const STATUS_META: Record<ServiceRequestStatus, { label: string; color: string; tint: string }> = {
  pending: { label: 'Pending', color: '#D97706', tint: '#FEF3C7' },
  accepted: { label: 'Accepted', color: '#2563EB', tint: '#DBEAFE' },
  in_progress: { label: 'In Progress', color: '#7C3AED', tint: '#EDE9FE' },
  completed: { label: 'Completed', color: '#16A34A', tint: '#DCFCE7' },
  declined: { label: 'Declined', color: '#DC2626', tint: '#FEE2E2' },
};

export default function RequestDetailScreen({ navigation, route }: Props) {
  const { user, role, privilege } = useAuth();
  const [req, setReq] = useState<ServiceRequest>(route.params.request);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  // Where the job is — without this the technician can't actually get there.
  const [jobLocation, setJobLocation] = useState<SavedLocation | null>(null);

  useEffect(() => {
    if (!req.homeownerId) return;
    getSavedLocations(req.homeownerId)
      .then((list) => {
        // Prefer the location tied to this job; fall back to their default.
        const tied = (req as any).locationId
          ? list.find((l) => l.id === (req as any).locationId)
          : null;
        setJobLocation(tied ?? list.find((l) => l.isDefault) ?? list[0] ?? null);
      })
      .catch(() => {});
  }, [req.homeownerId]);
  const [busy, setBusy] = useState(false);

  // Provider (or manager) can assign employees; load the team list.
  const canManage = role === 'provider' || privilege === 'manager';

  useEffect(() => {
    if (!canManage) return;
    // The provider's own uid is the employer id; for a manager it's their employerId.
    const providerId = role === 'provider' ? user?.uid : (route.params.request.providerId);
    if (providerId) listEmployees(providerId).then(setEmployees).catch(() => {});
  }, [canManage, user, role, route.params.request.providerId]);

  function notify(msg: string) {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Request', msg);
  }

  async function setStatus(status: ServiceRequestStatus) {
    setBusy(true);
    try {
      // Bookings and service requests live in different collections, so the
      // update has to go to the right one.
      if ((req as any).isBooking) {
        await updateBookingStatus(req.id, status as any);
        // Declining frees the slot for other customers.
        if (status === 'declined' && (req as any).preferredDate) {
          await freeSlot(req.providerId, (req as any).preferredDate, (req as any).timeSlot);
        }
      } else {
        await updateRequestStatus(req.id, status);
      }
      setReq((r) => ({ ...r, status }));
    } catch (e) {
      notify('Could not update status.');
    } finally {
      setBusy(false);
    }
  }

  async function doAssign(emp: Employee) {
    setBusy(true);
    try {
      // Bookings and service requests live in different collections.
      if ((req as any).isBooking) {
        await assignEmployeeToBooking(req.id, emp.uid, emp.name);
      } else {
        await assignEmployee(req.id, emp.uid, emp.name);
      }
      setReq((r) => ({ ...r, assignedEmployeeId: emp.uid, assignedEmployeeName: emp.name }));
      setAssignOpen(false);
      notify(`Assigned to ${emp.name}.`);
    } catch (e) {
      notify('Could not assign employee.');
    } finally {
      setBusy(false);
    }
  }

  const meta = STATUS_META[req.status];
  const isEmployee = role === 'employee';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {/* Coloured banner with a soft curve at the bottom edge. */}
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>{req.serviceType}</Text>
        {req.isEmergency ? (
          <View style={styles.emergencyPill}>
            <Text style={styles.emergencyText}>Emergency</Text>
          </View>
        ) : null}
        <View style={styles.bannerStatus}>
          <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
          <Text style={styles.bannerStatusText}>{meta.label}</Text>
        </View>
      </View>
      <View style={styles.bannerCurve} />

      {/* Date and time side by side — the two facts that matter most. */}
      {(req as any).preferredDate ? (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Appointment</Text>
          <View style={styles.splitRow}>
            <View style={styles.splitItem}>
              <Ionicons name="calendar-outline" size={22} color={colors.primary} />
              <View>
                <Text style={styles.splitValue}>
                  {formatFriendlyDate((req as any).preferredDate)}
                </Text>
                <Text style={styles.splitLabel}>Date</Text>
              </View>
            </View>
            {(req as any).timeSlot ? (
              <>
                <View style={styles.splitDivider} />
                <View style={styles.splitItem}>
                  <Ionicons name="time-outline" size={22} color={colors.primary} />
                  <View>
                    <Text style={styles.splitValue}>{prettyTime((req as any).timeSlot)}</Text>
                    <Text style={styles.splitLabel}>Time</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Where — the technician needs a findable address. */}
      <View style={styles.section}>
        <View style={styles.headingRow}>
          <Ionicons name="location" size={17} color={colors.primary} />
          <Text style={styles.sectionHeading}>Location</Text>
        </View>
        {jobLocation ? (
          <>
            <View style={styles.addressBlock}>
              <Ionicons name="location" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressLabel}>{jobLocation.label}</Text>
                {jobLocation.address ? (
                  <Text style={styles.addressLine}>{jobLocation.address}</Text>
                ) : null}
                {jobLocation.area ? (
                  <Text style={styles.addressLine}>{areaLabel(jobLocation.area)}</Text>
                ) : null}
              </View>
            </View>
            <MapPicker
              value={{ lat: jobLocation.lat, lng: jobLocation.lng }}
              onChange={() => {}}
              readonly
              height={170}
            />
          </>
        ) : (
          <Text style={styles.emptyNote}>
            The customer hasn't saved an address. Contact them for directions.
          </Text>
        )}
      </View>

      {/* What & who — tinted so it reads as a distinct block. */}
      <View style={styles.tintedCard}>
        <Text style={styles.tintedHeading}>Job details</Text>
        <Row label="Customer" value={req.homeownerName} />
        <Row label="Service" value={CATEGORY_LABELS[req.category] ?? 'Service'} />
        {req.appliances && req.appliances.length > 0 ? (
          <Row
            label="Appliances"
            value={req.appliances.map((a) => `${applianceIcon(a)} ${applianceLabel(a)}`).join('\n')}
          />
        ) : null}
        <Row label="Requested on" value={formatFriendlyDate(req.createdAt)} />
        <Row
          label="Assigned to"
          value={req.assignedEmployeeName || 'Not assigned yet'}
          last
        />
      </View>

      {/* The customer's own words — given its own block so long notes stay
          readable instead of being squeezed into a value column. */}
      {req.notes ? (
        <View style={styles.noteCard}>
          <View style={styles.noteIcon}>
            <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.noteLabel}>Customer notes</Text>
            <Text style={styles.noteText}>{req.notes}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.actionsWrap}>
      {/* Provider / manager actions */}
      {!isEmployee && (
        <>
          {req.status === 'pending' && (
            <View style={styles.actionRow}>
              <Button
                label="Decline"
                variant="danger"
                onPress={() => setStatus('declined')}
                loading={busy}
                style={{ flex: 1 }}
              />
              <Button
                label="Accept"
                onPress={() => setStatus('accepted')}
                loading={busy}
                style={{ flex: 1 }}
              />
            </View>
          )}

          {(req.status === 'accepted' || req.status === 'in_progress') && (
            <Button
              label={req.assignedEmployeeName ? 'Reassign Employee' : 'Assign Employee'}
              variant="secondary"
              onPress={() => setAssignOpen(true)}
              style={{ marginTop: spacing.md }}
            />
          )}

          {req.status === 'accepted' && (
            <Button
              label="Start Work"
              onPress={() => setStatus('in_progress')}
              loading={busy}
              style={{ marginTop: spacing.md }}
            />
          )}
          {req.status === 'in_progress' && (
            <Button
              label="Mark Completed"
              onPress={() => setStatus('completed')}
              loading={busy}
              style={{ marginTop: spacing.md }}
            />
          )}
        </>
      )}

      {/* Employee (worker) actions: can update status of their assigned job */}
      {isEmployee && (
        <>
          {req.status === 'accepted' && (
            <Button
              label="Start Work"
              onPress={() => setStatus('in_progress')}
              loading={busy}
              style={{ marginTop: spacing.md }}
            />
          )}
          {req.status === 'in_progress' && (
            <Button
              label="Mark Completed"
              onPress={() => setStatus('completed')}
              loading={busy}
              style={{ marginTop: spacing.md }}
            />
          )}
        </>
      )}
      </View>

      {/* Assign employee modal */}
      <Modal visible={assignOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Assign an Employee</Text>
            {employees.length === 0 ? (
              <Text style={styles.noEmp}>
                No employees yet. Add team members from the Team tab first.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {employees.map((emp) => (
                  <TouchableOpacity
                    key={emp.uid}
                    style={styles.empRow}
                    onPress={() => doAssign(emp)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.empAvatar}>
                      <Text style={styles.empAvatarText}>{emp.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.empName}>{emp.name}</Text>
                      <Text style={styles.empPriv}>
                        {emp.privilege === 'manager' ? 'Manager' : 'Worker'}
                      </Text>
                    </View>
                    {req.assignedEmployeeId === emp.uid ? (
                      <Text style={styles.assignedCheck}>✓</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <Button
              label="Close"
              variant="secondary"
              onPress={() => setAssignOpen(false)}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  banner: {
    // Honey — a softened gold. Reads clearly as a header without the weight of
    // the full-strength brand colour.
    backgroundColor: '#DDB176',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  bannerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  bannerStatusText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  emergencyPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  emergencyText: { color: '#B91C1C', fontSize: 12, fontWeight: '700' },
  // Sits over the banner's lower edge to create the curved cut-out.
  bannerCurve: {
    height: 34,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
  },

  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionHeading: { ...typography.h3, marginBottom: spacing.sm },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },

  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  splitItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  splitDivider: { width: 1, height: 34, backgroundColor: colors.border },
  splitValue: { ...typography.body, fontWeight: '700' },
  splitLabel: { ...typography.caption, marginTop: 1 },

  tintedCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  tintedHeading: { ...typography.h3, color: colors.primary, marginBottom: spacing.xs },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    // Matches the Job details card above so the two read as one group.
    backgroundColor: colors.primaryLight,
  },
  noteIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteLabel: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  noteText: { ...typography.body, fontWeight: '700', marginTop: 2, lineHeight: 21 },

  container: { paddingBottom: spacing.xxl },
  actionsWrap: { paddingHorizontal: spacing.lg },
  cardHeading: { ...typography.h3, marginBottom: spacing.xs },
  addressBlock: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  addressLabel: { ...typography.body, fontWeight: '700' },
  addressLine: { ...typography.bodySecondary, marginTop: 2 },
  emptyNote: { ...typography.bodySecondary, paddingVertical: spacing.sm },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { ...typography.bodySecondary },
  rowValue: {
    ...typography.body,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalTitle: { ...typography.h2, marginBottom: spacing.md },
  noEmp: { ...typography.bodySecondary, paddingVertical: spacing.lg, textAlign: 'center' },
  empRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  empAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  empAvatarText: { color: colors.white, fontWeight: '700' },
  empName: { ...typography.body, fontWeight: '600' },
  empPriv: { ...typography.caption, marginTop: 2 },
  assignedCheck: { color: colors.primary, fontSize: 20, fontWeight: '800' },
});
