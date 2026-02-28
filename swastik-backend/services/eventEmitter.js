/**
 * Event Emitter Service
 * Cross-service event bus with Socket.IO integration for real-time push
 */
const EventEmitter = require('events');

class AppEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.io = null;
    // Increase listener limit to avoid warnings in production
    this.setMaxListeners(50);
    // I20 Fix: Prevent unhandled errors from crashing the process
    this.on('error', (err) => {
      console.error('[EventEmitter] Unhandled event error:', err.message || err);
    });
  }

  setIO(io) {
    this.io = io;
  }

  getIO() {
    return this.io;
  }

  // ── Notification helpers ─────────────────────────────────────────
  // I20 Fix: Wrap all emit calls with try-catch to prevent crashes
  notifyUser(userId, event, data) {
    try {
      if (this.io) {
        this.io.to(`user:${userId}`).emit(event, data);
      }
      this.emit(event, { userId, ...data });
    } catch (err) {
      console.error(`[EventEmitter] notifyUser error (${event}):`, err.message);
    }
  }

  notifyRoom(room, event, data) {
    try {
      if (this.io) {
        this.io.to(room).emit(event, data);
      }
      this.emit(event, { room, ...data });
    } catch (err) {
      console.error(`[EventEmitter] notifyRoom error (${event}):`, err.message);
    }
  }

  // ── Domain events ────────────────────────────────────────────────
  emitAppointmentBooked(appointment) {
    const { doctor_id, patient_id, hospital_owner_id, clinic_owner_id } = appointment;
    this.notifyUser(doctor_id, 'appointment:new', appointment);
    this.notifyUser(patient_id, 'appointment:confirmed', appointment);
    // Also push as notification so layout handlers catch it
    this.notifyUser(doctor_id, 'notification:new', {
      type: 'appointment',
      title: 'New Appointment',
      message: `New appointment booked${appointment.patient?.name ? ` by ${appointment.patient.name}` : ''}`,
      timestamp: new Date().toISOString(),
      data: { appointmentId: appointment.id },
    });
    // Notify hospital/clinic owner for real-time dashboard updates
    if (hospital_owner_id) {
      this.notifyUser(hospital_owner_id, 'appointment:new', appointment);
      this.notifyUser(hospital_owner_id, 'notification:new', {
        type: 'appointment',
        title: 'New Appointment',
        message: `New appointment booked at your hospital`,
        timestamp: new Date().toISOString(),
        data: { appointmentId: appointment.id },
      });
    }
    if (clinic_owner_id) {
      this.notifyUser(clinic_owner_id, 'appointment:new', appointment);
      this.notifyUser(clinic_owner_id, 'notification:new', {
        type: 'appointment',
        title: 'New Appointment',
        message: `New appointment booked at your clinic`,
        timestamp: new Date().toISOString(),
        data: { appointmentId: appointment.id },
      });
    }
    this.emit('appointment:booked', appointment);
  }

  emitAppointmentUpdated(appointment) {
    const { doctor_id, patient_id } = appointment;
    this.notifyUser(doctor_id, 'appointment:update', appointment);
    this.notifyUser(patient_id, 'appointment:update', appointment);
    // Push notification to patient about status change
    this.notifyUser(patient_id, 'notification:new', {
      type: 'appointment',
      title: 'Appointment Updated',
      message: `Your appointment status changed to ${appointment.status}`,
      timestamp: new Date().toISOString(),
      data: { appointmentId: appointment.id },
    });
    this.emit('appointment:update', appointment);
  }

  emitAppointmentCancelled(appointment) {
    const { doctor_id, patient_id } = appointment;
    this.notifyUser(doctor_id, 'appointment:cancelled', appointment);
    this.notifyUser(patient_id, 'appointment:cancelled', appointment);
    // Notify both about cancellation
    this.notifyUser(doctor_id, 'notification:new', {
      type: 'appointment',
      title: 'Appointment Cancelled',
      message: `An appointment has been cancelled`,
      timestamp: new Date().toISOString(),
      data: { appointmentId: appointment.id },
    });
    this.notifyUser(patient_id, 'notification:new', {
      type: 'appointment',
      title: 'Appointment Cancelled',
      message: `Your appointment has been cancelled`,
      timestamp: new Date().toISOString(),
      data: { appointmentId: appointment.id },
    });
    this.emit('appointment:cancelled', appointment);
  }

  emitConsultationStarted(consultation) {
    const { doctor_id, patient_id } = consultation;
    this.notifyUser(patient_id, 'consultation:started', consultation);
    this.emit('consultation:started', consultation);
  }

  emitConsultationEnded(consultation) {
    const { doctor_id, patient_id } = consultation;
    this.notifyUser(doctor_id, 'consultation:ended', consultation);
    this.notifyUser(patient_id, 'consultation:ended', consultation);
    this.emit('consultation:ended', consultation);
  }

  emitEmergencyRequest(emergency) {
    // Broadcast to all ambulance rooms
    this.notifyRoom('ambulance:dispatch', 'emergency:new', emergency);
    this.emit('emergency:new', emergency);
  }

  emitAmbulanceAssigned(data) {
    const { patient_id, requestId } = data;
    this.notifyUser(patient_id, 'ambulance:assigned', data);
    this.notifyRoom(`ambulance:${requestId}`, 'ambulance:assigned', data);
    this.emit('ambulance:assigned', data);
  }

  emitAmbulanceStatus(requestId, patientUserId, status, data = {}) {
    const payload = { requestId, status, ...data, timestamp: new Date().toISOString() };
    this.notifyUser(patientUserId, 'ambulance:status-update', payload);
    this.notifyRoom(`ambulance:${requestId}`, 'ambulance:status-update', payload);
    this.emit('ambulance:status-update', payload);
  }

  emitPrescriptionCreated(prescription) {
    const { patient_id } = prescription;
    this.notifyUser(patient_id, 'prescription:new', prescription);
    this.emit('prescription:created', prescription);
  }

  emitOrderStatusUpdated(order) {
    const { patient_id, pharmacy_owner_id } = order;
    // Normalize payload to include fields expected by web & Android clients
    const payload = {
      ...order,
      orderId: order.id,
      orderNumber: order.order_number || order.id?.slice(0, 8)?.toUpperCase(),
      message: `Order status updated to ${order.status}`,
      timestamp: order.updated_at || new Date().toISOString(),
    };
    this.notifyUser(patient_id, 'order:update', payload);
    if (pharmacy_owner_id) {
      this.notifyUser(pharmacy_owner_id, 'order:update', payload);
    }
    this.emit('order:update', payload);
  }

  emitNewOrder(order) {
    const { pharmacy_owner_id } = order;
    if (pharmacy_owner_id) {
      this.notifyUser(pharmacy_owner_id, 'order:new', order);
    }
    this.emit('order:new', order);
  }

  emitDiagnosticBookingCreated(booking) {
    const { patient_id, center_id, center_owner_id } = booking;
    this.notifyUser(patient_id, 'diagnostic:booking-confirmed', booking);
    this.notifyUser(patient_id, 'notification:new', {
      title: 'Booking Confirmed',
      message: 'Your diagnostic test booking has been confirmed',
      type: 'diagnostic_booking',
    });
    // Notify the diagnostic center owner for real-time dashboard updates
    if (center_owner_id) {
      this.notifyUser(center_owner_id, 'diagnostic:new-booking', booking);
      this.notifyUser(center_owner_id, 'notification:new', {
        title: 'New Booking',
        message: 'A new diagnostic test booking has been received',
        type: 'diagnostic_booking',
        timestamp: new Date().toISOString(),
      });
    }
    this.emit('diagnostic:booked', booking);
  }

  emitDiagnosticBookingStatusUpdated(booking) {
    const { patient_id } = booking;
    this.notifyUser(patient_id, 'diagnostic:booking-updated', booking);
    this.notifyUser(patient_id, 'notification:new', {
      title: 'Booking Updated',
      message: `Your diagnostic booking status changed to ${booking.status}`,
      type: 'diagnostic_update',
    });
    this.emit('diagnostic:status-updated', booking);
  }

  emitDiagnosticResultUploaded(booking) {
    const { patient_id } = booking;
    this.notifyUser(patient_id, 'diagnostic:result-ready', booking);
    this.notifyUser(patient_id, 'notification:new', {
      title: 'Results Ready',
      message: 'Your diagnostic test results are now available',
      type: 'diagnostic_result',
    });
    this.emit('diagnostic:result-uploaded', booking);
  }

  emitNotification(userId, notification) {
    this.notifyUser(userId, 'notification:new', notification);
    this.emit('notification:sent', { userId, notification });
  }
}

const eventEmitter = new AppEventEmitter();

module.exports = eventEmitter;
