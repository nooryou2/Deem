import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateSlots,isAvailableDate,isFutureSlot } from '../src/utils/bookingValidation';
const availability = {
  startHour: 9,
  endHour: 12,
  slotMinutes: 60,
  blockedDates: ['2030-01-01'],
  weeklyOffDays: [5],
};
test('invalid schedules terminate safely', () => {
  for (const slotMinutes of [0, -1, NaN, Infinity, 0.5])
    assert.deepEqual(generateSlots({ ...availability, slotMinutes }), []);
  assert.deepEqual(generateSlots({ ...availability, endHour: 8 }), []);
});
test('whole slots fit within opening hours', () => {
  assert.deepEqual(generateSlots(availability), ['09:00', '10:00', '11:00']);
  assert.deepEqual(generateSlots({ ...availability, slotMinutes: 90 }), ['09:00', '10:30']);
});
test('blocks dates, weekly days off, and past appointments', () => {
  assert.equal(isAvailableDate('2030-01-01', availability), false);
  assert.equal(isAvailableDate('2030-01-04', availability), false);
  assert.equal(isAvailableDate('2030-01-02', availability), true);
  assert.equal(isFutureSlot('2030-01-02', '09:00', new Date('2030-01-02T09:01:00')), false);
  assert.equal(isFutureSlot('2030-01-02', '10:00', new Date('2030-01-02T09:01:00')), true);
});
test('rejects impossible calendar dates and fractional opening hours', () => {
  assert.equal(isAvailableDate('2030-02-31', availability), false);
  assert.equal(isAvailableDate('2030-13-01', availability), false);
  assert.deepEqual(generateSlots({ ...availability, startHour: 9.1 }), []);
});
