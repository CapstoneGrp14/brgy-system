/** English → Filipino translations for the bookings area. English is the key. */
export const bookings: Record<string, string> = {
  // BookingsPage — resident booking form
  'Facility & Equipment Booking': 'Pag-book ng Pasilidad at Kagamitan',
  'Our smart conflict resolver will suggest an alternative if your slot overlaps an existing booking.':
    'Magmumungkahi ang aming smart conflict resolver ng ibang oras kung nagtutugma ang piniling slot mo sa isang naunang booking.',
  'Service / Facility Type': 'Uri ng Serbisyo / Pasilidad',
  'Loading facilities…': 'Kinukuha ang mga pasilidad…',
  'Requested Date': 'Hiniling na Petsa',
  'Preferred Time': 'Naisin na Oras',
  'Loading slots…': 'Kinukuha ang mga slot…',
  'Purpose (optional)': 'Layunin (opsyonal)',
  'e.g., Basketball Practice, Birthday Party…': 'hal., Basketball Practice, Handaan…',
  '⚠ Conflict Detected:': '⚠ May Natuklasang Sabay:',
  'Smart Suggestion:': 'Matalinong Mungkahi:',
  'shift to off-peak hour ({slot}) — conflict-free, then awaits staff confirmation.':
    'ilipat sa off-peak na oras ({slot}) — walang sabay, tapos maghihintay ng kumpirmasyon ng staff.',
  'Accept Suggestion ({slot})': 'Tanggapin ang Mungkahi ({slot})',
  'Choose Another Time': 'Pumili ng Ibang Oras',
  'Checking availability…': 'Sinusuri ang availability…',
  'Tip: Covered Court at 10:00 AM overlaps the recurring Zumba Class — try it to see the resolver.':
    'Tip: Ang Covered Court sa 10:00 AM ay sabay sa paulit-ulit na Zumba Class — subukan mo para makita ang resolver.',
  'My Upcoming Bookings': 'Aking mga Paparating na Booking',
  'Nothing booked yet.': 'Wala pang na-book.',
  'PAST / REJECTED': 'NAKARAAN / TINANGGIHAN',
  'Pick a requested date first.': 'Pumili muna ng hiniling na petsa.',
  '✅ Rebooked at {slot} (off-peak) — no conflicts. Status: pending staff confirmation.':
    '✅ Na-rebook sa {slot} (off-peak) — walang sabay. Status: naghihintay ng kumpirmasyon ng staff.',
  '✅ Booking request sent — no conflicts detected. Status: pending staff confirmation.':
    '✅ Naipadala ang kahilingan sa booking — walang natuklasang sabay. Status: naghihintay ng kumpirmasyon ng staff.',
  'Booking failed — try again.': 'Nabigo ang booking — subukan muli.',

  // BookingCalendarPage — staff queue
  'Smart Scheduling & Conflict Resolver': 'Matalinong Pag-iskedyul at Conflict Resolver',
  '{count} booking awaiting review · accepted bookings notify the resident via Gmail + dashboard':
    '{count} booking ang naghihintay ng pagsusuri · aabisuhan ang residente sa pamamagitan ng Gmail + dashboard kapag tinanggap',
  '{count} bookings awaiting review · accepted bookings notify the resident via Gmail + dashboard':
    '{count} na booking ang naghihintay ng pagsusuri · aabisuhan ang residente sa pamamagitan ng Gmail + dashboard kapag tinanggap',
  '✅ No pending bookings — the calendar is clear.':
    '✅ Walang nakabinbing booking — malinis ang kalendaryo.',
  'Requested by:': 'Hiniling ni:',
  '⚠ Conflict: "{title}" is already confirmed for this time.':
    '⚠ Sabay: nakumpirma na ang "{title}" para sa oras na ito.',
  '💡 Smart Suggestion: shift to off-peak hour ({slot})':
    '💡 Matalinong Mungkahi: ilipat sa off-peak na oras ({slot})',
  '✓ No conflicts for this slot': '✓ Walang sabay para sa slot na ito',
  'Accept Suggestion & Notify User': 'Tanggapin ang Mungkahi at Abisuhan ang User',
  'Accept & Notify User': 'Tanggapin at Abisuhan ang User',
  'Reject Booking': 'Tanggihan ang Booking',
  'Recent Decisions': 'Mga Kamakailang Desisyon',
  'No decided bookings yet.': 'Wala pang napagdesisyunang booking.',
  '· by {name}': '· ni {name}',
  'the resident': 'ang residente',
  'Reject this booking?': 'Tanggihan ang booking na ito?',
  '{who} will be notified that the slot was not approved.':
    'Aabisuhan si {who} na hindi naaprubahan ang slot.',
  '📧 Rescheduled to {slot} — {who} notified via email + dashboard.':
    '📧 Na-reschedule sa {slot} — naabisuhan si {who} sa email + dashboard.',
  '📧 Confirmed — {who} notified via email + dashboard.':
    '📧 Nakumpirma — naabisuhan si {who} sa email + dashboard.',
  'Booking rejected — {who} has been notified.':
    'Tinanggihan ang booking — naabisuhan na si {who}.',
  'Action failed.': 'Nabigo ang aksyon.',

  // BookingSettingsPage — admin config
  'Bookable Facilities & Equipment': 'Mga Puwedeng I-book na Pasilidad at Kagamitan',
  'Disabled items are hidden from residents. Recurring reservations (e.g. a weekly class) block their slot every day.':
    'Nakatago sa mga residente ang mga naka-disable na item. Ang mga paulit-ulit na reserbasyon (hal. lingguhang klase) ay humaharang sa slot nito araw-araw.',
  'e.g., Multi-Purpose Room': 'hal., Multi-Purpose Room',
  'Facility / Place': 'Pasilidad / Lugar',
  'Equipment': 'Kagamitan',
  'Facility': 'Pasilidad',
  '🏟 "{name}" added.': '🏟 Naidagdag ang "{name}".',
  'Could not add facility.': 'Hindi maidagdag ang pasilidad.',
  'Type the facility name first.': 'I-type muna ang pangalan ng pasilidad.',
  '+ Add': '+ Idagdag',
  'Disabled': 'Naka-disable',
  '+ Reserve slot': '+ Mag-reserba ng slot',
  '🚫 {name} disabled.': '🚫 Na-disable ang {name}.',
  '✅ {name} enabled.': '✅ Na-enable ang {name}.',
  'Failed.': 'Nabigo.',
  'Disable': 'I-disable',
  'Enable': 'I-enable',
  'Removed {title} @ {slot}': 'Inalis ang {title} @ {slot}',
  'Time slot…': 'Time slot…',
  'Reservation title, e.g. Zumba Class': 'Pamagat ng reserbasyon, hal. Zumba Class',
  '🔁 Reserved {slot} for {title}.': '🔁 Nireserba ang {slot} para sa {title}.',
  'Pick a slot and give the reservation a title.': 'Pumili ng slot at bigyan ng pamagat ang reserbasyon.',
  'Reserve': 'Ireserba',
  'Booking Time Slots': 'Mga Time Slot ng Booking',
  'The conflict resolver suggests ': 'Nagmumungkahi ang conflict resolver ng ',
  'off-peak': 'off-peak',
  ' slots first. At least one slot must stay active.':
    ' na mga slot muna. Kailangang manatiling aktibo ang kahit isang slot.',
  'Off-peak': 'Off-peak',
  '🕐 {label} added.': '🕐 Naidagdag ang {label}.',
  'Could not add slot.': 'Hindi maidagdag ang slot.',
  '+ Add Slot': '+ Magdagdag ng Slot',
};
