const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, getDocs, collection, updateDoc } = require('firebase/firestore');
const { ref, uploadBytes, getBytes } = require('firebase/storage');
const service = require('../.test-build/services.cjs');
let env;
const uid = 'customer-a';
const provider = 'provider-a';
const date = '2030-01-02';
function context(id) {
  const db = env.authenticatedContext(id).firestore();
  service.setTestContext(db, id);
  return db;
}
async function seed() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', uid), { role: 'homeowner', name: 'Test' });
    await setDoc(doc(db, 'users', provider), { role: 'provider', name: 'Provider' });
    await setDoc(doc(db, 'providers', provider), { uid: provider, name: 'Provider' });
    await setDoc(doc(db, 'availability', provider), {
      startHour: 9,
      endHour: 18,
      slotMinutes: 60,
      blockedDates: [],
    });
  });
}
const input = () => ({
  customerId: uid,
  customerName: 'Test',
  providerId: provider,
  providerName: 'Provider',
  category: 'ac',
  date,
  timeSlot: '10:00',
  description: 'Not cooling',
  applianceName: 'Living room AC',
  locationId: 'home',
  location: { id: 'home', label: 'Home', lat: 26.2, lng: 50.5, area: 'manama' },
});
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-deem',
    firestore: { host: '127.0.0.1', port: 8180, rules: fs.readFileSync('firestore.rules', 'utf8') },
    storage: { host: '127.0.0.1', port: 9199, rules: fs.readFileSync('storage.rules', 'utf8') },
  });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await seed();
});
after(async () => {
  await env.cleanup();
});
test('one winner for a competing slot, one linked appliance, no partial booking', async () => {
  const db = context(uid);
  const results = await Promise.allSettled([
    service.createBooking(input()),
    service.createBooking(input()),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const booked = results.find((r) => r.status === 'fulfilled').value;
  const snapshot = await getDoc(doc(db, 'bookings', booked));
  assert.ok(snapshot.data().maintenanceItemId);
  const item = await getDoc(doc(db, 'maintenanceItems', snapshot.data().maintenanceItemId));
  assert.equal(item.data().name, 'Living room AC');
});
test('existing device stays linked without creating another', async () => {
  const db = context(uid);
  const itemId = await service.createMaintenanceItem({
    userId: uid,
    name: 'Kitchen AC',
    category: 'ac',
    frequency: 'monthly',
  });
  const id = await service.createBooking({ ...input(), maintenanceItemId: itemId });
  assert.equal((await getDoc(doc(db, 'bookings', id))).data().maintenanceItemId, itemId);
});
test('quote approval gates work; completion records one visit and advances maintenance', async () => {
  let db = context(uid);
  const id = await service.createBooking(input());
  const booking = (await getDoc(doc(db, 'bookings', id))).data();
  context(provider);
  await service.changeJobStatus('booking', id, 'accepted');
  await assert.rejects(service.changeJobStatus('booking', id, 'in_progress'), /QUOTE_REQUIRED/);
  await service.saveQuote({
    jobId: id,
    jobType: 'booking',
    providerId: provider,
    customerId: uid,
    inspectionFee: 5,
    servicePrice: 12.5,
    scope: 'Clean filter and test',
  });
  db = context(uid);
  let quote = { ...(await getDoc(doc(db, 'quotes', `booking_${id}`))).data(), id: `booking_${id}` };
  assert.equal(quote.total, 17.5);
  await service.respondToQuote(quote, 'accepted');
  context(provider);
  await service.changeJobStatus('booking', id, 'in_progress');
  await service.changeJobStatus('booking', id, 'completed');
  await service.changeJobStatus('booking', id, 'completed');
  db = context(uid);
  const history = await getDoc(doc(db, 'maintenanceHistory', `booking_${id}`));
  assert.ok(history.exists());
  const item = (await getDoc(doc(db, 'maintenanceItems', booking.maintenanceItemId))).data();
  assert.ok(item.nextServiceDate.toMillis() > item.lastServiceDate.toMillis());
  await service.submitReview({
    providerId: provider,
    providerName: 'Provider',
    homeownerId: uid,
    homeownerName: 'Test',
    jobId: id,
    jobType: 'booking',
    serviceName: 'AC',
    stars: 5,
  });
  await assert.rejects(
    service.submitReview({
      providerId: provider,
      providerName: 'Provider',
      homeownerId: uid,
      homeownerName: 'Test',
      jobId: id,
      jobType: 'booking',
      serviceName: 'AC',
      stars: 4,
    }),
    /ALREADY_REVIEWED/,
  );
});
test('declining releases the slot atomically', async () => {
  context(uid);
  const id = await service.createBooking(input());
  context(provider);
  await service.changeJobStatus('booking', id, 'declined');
  context(uid);
  assert.ok(await service.createBooking(input()));
});
test('outsiders cannot read addresses or approve another customer quote', async () => {
  context(uid);
  const id = await service.createBooking(input());
  context(provider);
  await service.saveQuote({
    jobId: id,
    jobType: 'booking',
    providerId: provider,
    customerId: uid,
    inspectionFee: 0,
    servicePrice: 10,
    scope: 'Repair',
  });
  const outsider = context('outsider');
  await assertFails(getDoc(doc(outsider, 'bookings', id)));
  await assertFails(getDoc(doc(outsider, 'users', uid)));
  await assertFails(updateDoc(doc(outsider, 'quotes', `booking_${id}`), { status: 'accepted' }));
  await assertFails(
    updateDoc(doc(env.authenticatedContext(uid).firestore(), 'bookings', id), {
      status: 'completed',
    }),
  );
});
test('stale quote cannot be approved after provider revises its price', async () => {
  context(uid);
  const id = await service.createBooking(input());
  context(provider);
  const data = {
    jobId: id,
    jobType: 'booking',
    providerId: provider,
    customerId: uid,
    inspectionFee: 0,
    servicePrice: 10,
    scope: 'Repair',
  };
  await service.saveQuote(data);
  const db = context(uid);
  const quote = {
    ...(await getDoc(doc(db, 'quotes', `booking_${id}`))).data(),
    id: `booking_${id}`,
  };
  context(provider);
  await service.saveQuote({ ...data, servicePrice: 20 });
  context(uid);
  await assert.rejects(service.respondToQuote(quote, 'accepted'), /QUOTE_CHANGED/);
});
test('private documents and job photos respect sharing boundaries', async () => {
  const own = env.authenticatedContext(uid).storage();
  const pro = env.authenticatedContext(provider).storage();
  const other = env.authenticatedContext('outsider').storage();
  const privatePath = `attachments/${uid}/private/invoice`;
  const sharedPath = `attachments/${uid}/${provider}/problem`;
  await assertSucceeds(
    uploadBytes(ref(own, privatePath), new Uint8Array([1, 2]), { contentType: 'application/pdf' }),
  );
  await assertSucceeds(
    uploadBytes(ref(own, sharedPath), new Uint8Array([1, 2]), { contentType: 'image/jpeg' }),
  );
  await assertFails(getBytes(ref(pro, privatePath)));
  await assertFails(getBytes(ref(other, sharedPath)));
  await assertSucceeds(getBytes(ref(pro, sharedPath)));
  await assertFails(
    uploadBytes(ref(own, `attachments/${uid}/private/executable`), new Uint8Array([1]), {
      contentType: 'application/octet-stream',
    }),
  );
});
test('registration, device metadata and provider access stay scoped', async () => {
  const newCustomer = context('new-customer');
  await assertSucceeds(
    setDoc(doc(newCustomer, 'users', 'new-customer'), { role: 'homeowner', name: 'New' }),
  );
  await assertFails(updateDoc(doc(newCustomer, 'users', 'new-customer'), { role: 'provider' }));
  const newProvider = context('new-provider');
  await assertSucceeds(
    setDoc(doc(newProvider, 'users', 'new-provider'), { role: 'provider', name: 'New provider' }),
  );
  await assertSucceeds(
    setDoc(doc(newProvider, 'providers', 'new-provider'), {
      uid: 'new-provider',
      name: 'New provider',
    }),
  );
  const db = context(uid);
  const itemId = await service.createMaintenanceItem({
    userId: uid,
    name: 'Heater',
    category: 'water_heater',
    frequency: 'yearly',
    brandModel: 'Model A',
    warrantyExpiry: '2031-01-01',
    attachments: [
      {
        id: 'invoice',
        name: 'invoice.pdf',
        path: `attachments/${uid}/private/invoice`,
        size: 100,
        contentType: 'application/pdf',
      },
    ],
  });
  await service.updateMaintenanceItem(itemId, { serialNumber: '1234' });
  const item = await service.fetchSingleMaintenanceItem(itemId);
  assert.equal(item.brandModel, 'Model A');
  assert.equal(item.attachments[0].name, 'invoice.pdf');
  assert.equal(item.serialNumber, '1234');
  await assertFails(
    getDoc(doc(env.authenticatedContext('outsider').firestore(), 'maintenanceItems', itemId)),
  );
});
test('cannot forge a quote total or approve a declined job', async () => {
  context(uid);
  const id = await service.createBooking(input());
  let db = context(provider);
  await assertFails(
    setDoc(doc(db, 'quotes', `booking_${id}`), {
      providerId: provider,
      customerId: uid,
      jobId: id,
      jobType: 'booking',
      inspectionFee: 5,
      servicePrice: 10,
      total: 100,
      currency: 'BHD',
      scope: 'Repair',
      status: 'pending',
      version: 1,
    }),
  );
  await service.saveQuote({
    jobId: id,
    jobType: 'booking',
    providerId: provider,
    customerId: uid,
    inspectionFee: 5,
    servicePrice: 10,
    scope: 'Repair',
  });
  db = context(uid);
  const quote = {
    ...(await getDoc(doc(db, 'quotes', `booking_${id}`))).data(),
    id: `booking_${id}`,
  };
  context(provider);
  await service.changeJobStatus('booking', id, 'declined');
  context(uid);
  await assert.rejects(service.respondToQuote(quote, 'accepted'), /QUOTE_CHANGED/);
});
test('service requests also complete and advance the linked device', async () => {
  let db = context(uid);
  const itemId = await service.createMaintenanceItem({
    userId: uid,
    name: 'Heater',
    category: 'water_heater',
    frequency: 'yearly',
  });
  const id = await service.createServiceRequest({
    homeownerId: uid,
    homeownerName: 'Test',
    providerId: provider,
    providerName: 'Provider',
    maintenanceItemId: itemId,
    serviceType: 'Heater',
    category: 'water_heater',
  });
  context(provider);
  await service.changeJobStatus('request', id, 'accepted');
  await service.saveQuote({
    jobId: id,
    jobType: 'request',
    providerId: provider,
    customerId: uid,
    inspectionFee: 0,
    servicePrice: 10,
    scope: 'Service',
  });
  db = context(uid);
  const quote = {
    ...(await getDoc(doc(db, 'quotes', `request_${id}`))).data(),
    id: `request_${id}`,
  };
  await service.respondToQuote(quote, 'accepted');
  context(provider);
  await service.changeJobStatus('request', id, 'in_progress');
  await service.changeJobStatus('request', id, 'completed');
  db = context(uid);
  assert.equal(
    (await getDoc(doc(db, 'maintenanceItems', itemId))).data().bookingStatus,
    'completed',
  );
});
