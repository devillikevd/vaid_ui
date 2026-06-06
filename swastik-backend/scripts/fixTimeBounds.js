const fs = require('fs');
const path = require('path');

const consultationServicePath = path.join(__dirname, '../services/consultationService.js');
let consultationServiceCode = fs.readFileSync(consultationServicePath, 'utf8');

const timeBoundsCheck = `
const checkTimeBounds = (appointmentDate, timeSlot) => {
  if (!appointmentDate || !timeSlot) return true;
  const slotDateStr = \`\${appointmentDate}T\${timeSlot.padStart(5, '0')}:00+05:30\`;
  const slotTimeMs = Date.parse(slotDateStr);
  if (isNaN(slotTimeMs)) return true;
  
  const diffMins = (Date.now() - slotTimeMs) / 60000;
  return diffMins >= -15 && diffMins <= 60;
};
`;

if (!consultationServiceCode.includes('checkTimeBounds')) {
  consultationServiceCode = consultationServiceCode.replace(
    '// Start consultation (doctor)',
    timeBoundsCheck + '\n// Start consultation (doctor)'
  );
  
  // Inject into startConsultation
  const startConsultationInjection = `
  const { data: appointment } = await supabaseAdmin
    .from('appointments')
    .select('appointment_date, time_slot')
    .eq('id', appointmentId)
    .single();

  if (appointment && !checkTimeBounds(appointment.appointment_date, appointment.time_slot)) {
    throw new ApiError(403, 'Consultation can only be started 15 minutes before and up to 1 hour after the scheduled time.');
  }
`;
  
  consultationServiceCode = consultationServiceCode.replace(
    /const startConsultation = async \(doctorUserId, appointmentId\) => \{/,
    `const startConsultation = async (doctorUserId, appointmentId) => {${startConsultationInjection}`
  );
  
  fs.writeFileSync(consultationServicePath, consultationServiceCode);
  console.log('Fixed consultationService.js');
}

const doctorServicePath = path.join(__dirname, '../services/doctorService.js');
let doctorServiceCode = fs.readFileSync(doctorServicePath, 'utf8');

if (!doctorServiceCode.includes('const slotTimeMs = Date.parse(slotDateStr)')) {
  // We need to inject the filter into getAvailableSlots
  const filterLogic = `
        let is_available = !bookedSlots.includes(timeSlot);

        // Filter out past slots for today
        if (is_available) {
          const slotDateStr = \`\${date}T\${timeSlot.padStart(5, '0')}:00+05:30\`;
          const slotTimeMs = Date.parse(slotDateStr);
          if (!isNaN(slotTimeMs) && slotTimeMs < Date.now()) {
            is_available = false;
          }
        }

        availableSlots.push({
          time: timeSlot,
          period: h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening',
          is_available: is_available,
        });
`;

  // We'll use regex to replace the if-else block inside getAvailableSlots
  doctorServiceCode = doctorServiceCode.replace(
    /if \(!bookedSlots\.includes\(timeSlot\)\) \{[\s\S]*?\} else \{[\s\S]*?\}/,
    filterLogic.trim()
  );
  
  fs.writeFileSync(doctorServicePath, doctorServiceCode);
  console.log('Fixed doctorService.js');
}
