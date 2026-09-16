const { initializeApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator, doc, setDoc } = require('firebase/firestore');
const {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} = require('firebase/auth');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
(async () => {
  const app = initializeApp({ projectId: 'demo-deem', apiKey: 'demo-key' });
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const env = await initializeTestEnvironment({
    projectId: 'demo-deem',
    firestore: { host: '127.0.0.1', port: 8180 },
  });
  const people = [];
  for (const [email, name, role] of [
    ['homeowner@example.test', 'أحمد التجريبي', 'homeowner'],
    ['provider@example.test', 'صيانة ديم التجريبية', 'provider'],
  ]) {
    const { user } = await createUserWithEmailAndPassword(auth, email, 'DeemTest123!').catch(
      (error) => {
        if (error.code !== 'auth/email-already-in-use') throw error;
        return signInWithEmailAndPassword(auth, email, 'DeemTest123!');
      },
    );
    await updateProfile(user, { displayName: name });
    people.push({ uid: user.uid, name, role });
  }
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const person of people) {
      await setDoc(doc(db, 'users', person.uid), {
        role: person.role,
        name: person.name,
        areas: ['manama'],
        savedLocations:
          person.role === 'homeowner'
            ? [
                {
                  id: 'home',
                  label: 'المنزل',
                  area: 'manama',
                  lat: 26.2235,
                  lng: 50.5876,
                  address: 'عنوان تجريبي، المنامة',
                  isDefault: true,
                },
              ]
            : [],
      });
      if (person.role === 'provider') {
        await setDoc(doc(db, 'providers', person.uid), {
          uid: person.uid,
          name: person.name,
          appliances: ['ac', 'water_heater'],
          serviceAreas: ['manama'],
        });
        await setDoc(doc(db, 'availability', person.uid), {
          startHour: 9,
          endHour: 18,
          slotMinutes: 60,
          blockedDates: [],
        });
      }
    }
  });
  await env.cleanup();
  console.log('Local demo accounts created. Password: DeemTest123!');
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
