/**
 * Event Emitter Service
 * Cross-service event bus with Socket.IO integration for real-time push
 */
const EventEmitter = require('events');
const crypto = require('crypto');
const config = require('../config');

const normalizeDiagnosticBookingStatus = (status) => (
  status === 'booked' ? 'pending' : status
);

class AppEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.io = null;
    this.instanceId = process.env.INSTANCE_ID || crypto.randomUUID();
    this.eventBusChannel = process.env.EVENT_BUS_CHANNEL || 'swastik:eventbus:v1';
    this.pubClient = null;
    this.subClient = null;
    this.distributedReady = false;
    // Increase listener limit to avoid warnings in production
    this.setMaxListeners(50);
    // I20 Fix: Prevent unhandled errors from crashing the process
    this.on('error', (err) => {
      console.error('[EventEmitter] Unhandled event error:', err.message || err);
    });
  }

  setIO(io) {
    this.io = io;
    if (process.env.NODE_ENV === 'test' && process.env.ENABLE_DISTRIBUTED_EVENT_BUS !== 'true') {
      return;
    }
    this.initializeDistributedBus().catch((err) => {
      console.warn('[EventEmitter] Distributed bus init failed (continuing local-only):', err.message || err);
    });
  }

  getIO() {
    return this.io;
  }

  async initializeDistributedBus() {
    if (process.env.NODE_ENV === 'test' && process.env.ENABLE_DISTRIBUTED_EVENT_BUS !== 'true') return;
    if (this.distributedReady || this.pubClient || !config.redis.ioredisUrl) return;

    const Redis = require('ioredis');
    this.pubClient = new Redis(config.redis.ioredisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 5000),
    });
    this.subClient = this.pubClient.duplicate();

    await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
    await this.subClient.subscribe(this.eventBusChannel);

    this.subClient.on('message', (channel, message) => {
      if (channel !== this.eventBusChannel || !message) return;
      try {
        const envelope = JSON.parse(message);
        if (!envelope?.event || envelope.sourceId === this.instanceId) return;
        super.emit(envelope.event, envelope.payload);
      } catch (err) {
        console.warn('[EventEmitter] Invalid distributed message:', err.message || err);
      }
    });

    this.distributedReady = true;
    console.log('[EventEmitter] Distributed event bus enabled');
  }

  async publishDistributed(event, payload) {
    if (!this.distributedReady || !this.pubClient) return;
    try {
      await this.pubClient.publish(this.eventBusChannel, JSON.stringify({
        sourceId: this.instanceId,
        event,
        payload,
        emittedAt: new Date().toISOString(),
      }));
    } catch (err) {
      console.warn(`[EventEmitter] Failed to publish distributed event (${event}):`, err.message || err);
    }
  }

  emitDistributed(event, payload) {
    try {
      super.emit(event, payload);
    } catch (err) {
      console.error(`[EventEmitter] local emit error (${event}):`, err.message || err);
    }
    this.publishDistributed(event, payload);
  }

  async shutdown() {
    try {
      if (this.subClient) {
        await this.subClient.unsubscribe(this.eventBusChannel).catch(() => {});
        await this.subClient.quit().catch(() => {});
        this.subClient = null;
      }
      if (this.pubClient) {
        await this.pubClient.quit().catch(() => {});
        this.pubClient = null;
      }
      this.distributedReady = false;
    } catch (err) {
      console.warn('[EventEmitter] shutdown warning:', err.message || err);
    }
  }

  normalizeConsultationEventPayload(consultation = {}) {
    const consultationId = consultation.consultationId || consultation.consultation_id || consultation.id || '';
    const appointmentId = consultation.appointmentId || consultation.appointment_id || null;

    return {
      ...consultation,
      consultationId,
      appointmentId,
      roomId: consultation.roomId || consultation.room_id || consultationId,
      doctorName: consultation.doctorName || consultation.doctor_name || consultation.doctor?.name || 'Doctor',
      type: consultation.type || null,
      duration: consultation.duration ?? consultation.duration_minutes ?? null,
      prescriptionId: consultation.prescriptionId || consultation.prescription_id || null,
      timestamp: consultation.timestamp || consultation.updated_at || consultation.started_at || consultation.ended_at || new Date().toISOString(),
    };
  }

  // ── Notification helpers ─────────────────────────────────────────
  // I20 Fix: Wrap all emit calls with try-catch to prevent crashes
  notifyUser(userId, event, data) {
    try {
      if (this.io) {
        this.io.to(`user:${userId}`).emit(event, data);
      }
      this.emitDistributed(event, { userId, ...data });
    } catch (err) {
      console.error(`[EventEmitter] notifyUser error (${event}):`, err.message);
    }
  }

  notifyRoom(room, event, data) {
    try {
      if (this.io) {
        this.io.to(room).emit(event, data);
      }
      this.emitDistributed(event, { room, ...data });
    } catch (err) {
      console.error(`[EventEmitter] notifyRoom error (${event}):`, err.message);
    }
  }

  getHospitalDispatchRoom(hospitalId) {
    return hospitalId ? `hospital:dispatch:${hospitalId}` : null;
  }

  getEmergencyDispatchRooms(payload = {}, { includeGlobal = true } = {}) {
    const rooms = new Set();
    if (includeGlobal) {
      rooms.add('ambulance:dispatch');
    }

    const hospitalIds = [
      payload.hospitalId,
      payload.hospital_id,
      payload.destinationHospitalId,
      payload.destination_hospital_id,
    ].filter(Boolean);

    hospitalIds.forEach((hospitalId) => {
      const room = this.getHospitalDispatchRoom(hospitalId);
      if (room) {
        rooms.add(room);
      }
    });

    return [...rooms];
  }

  emitEmergencyDispatch(event, payload = {}, options = {}) {
    try {
      const rooms = this.getEmergencyDispatchRooms(payload, options);
      if (this.io) {
        rooms.forEach((room) => {
          this.io.to(room).emit(event, payload);
        });
      }
      this.emitDistributed(event, payload);
    } catch (err) {
      console.error(`[EventEmitter] emitEmergencyDispatch error (${event}):`, err.message);
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
    // Broadcast to slot room so clients can update UI instantly
    this.notifyRoom(`doctor:slots:${doctor_id}`, 'appointment:booked', appointment);
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
    this.emitDistributed('appointment:booked', appointment);
  }

  // Resolve the clinic owner's user_id for real-time dashboard updates.
  // Fire-and-forget: this is a notification helper, never critical path.
  async _notifyClinicOwner(clinicId, event, data) {
    if (!clinicId) return;
    try {
      const { supabaseAdmin } = require('../config/supabase');
      const { data: clinic } = await supabaseAdmin
        .from('clinics')
        .select('owner_id')
        .eq('id', clinicId)
        .maybeSingle();
      if (clinic?.owner_id) {
        this.notifyUser(clinic.owner_id, event, data);
      }
    } catch (err) {
      console.error(`[EventEmitter] _notifyClinicOwner error (${event}):`, err.message);
    }
  }

  emitAppointmentUpdated(appointment) {
    const { doctor_id, patient_id } = appointment;
    this.notifyUser(doctor_id, 'appointment:update', appointment);
    this.notifyUser(patient_id, 'appointment:update', appointment);
    // Real-time for the clinic owner dashboard (front desk sees changes instantly)
    this._notifyClinicOwner(appointment.clinic_id, 'appointment:update', appointment);
    // Push notification to patient about status change
    this.notifyUser(patient_id, 'notification:new', {
      type: 'appointment',
      title: 'Appointment Updated',
      message: `Your appointment status changed to ${appointment.status}`,
      timestamp: new Date().toISOString(),
      data: { appointmentId: appointment.id },
    });
    this.emitDistributed('appointment:update', appointment);
  }

  emitAppointmentCancelled(appointment) {
    const { doctor_id, patient_id } = appointment;
    this.notifyUser(doctor_id, 'appointment:cancelled', appointment);
    this.notifyUser(patient_id, 'appointment:cancelled', appointment);
    // Real-time for the clinic owner dashboard
    this._notifyClinicOwner(appointment.clinic_id, 'appointment:cancelled', appointment);
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
    this.emitDistributed('appointment:cancelled', appointment);
  }

  emitConsultationStarted(consultation) {
    const normalized = this.normalizeConsultationEventPayload(consultation);
    const { doctor_id, patient_id } = normalized;

    // Invalidate patient's dashboard cache so the card updates immediately
    try {
      if (patient_id) {
        const cacheService = require('./cacheService');
        cacheService.delPattern(`patient:dashboard:${patient_id}*`);
        cacheService.delPattern(`dashboard:${patient_id}:*`);
      }
    } catch (e) {
      console.error('Failed to invalidate dashboard cache', e);
    }

    // BUG-13 Fix: Notify both doctor (multi-tab sync) and patient
    if (doctor_id) this.notifyUser(doctor_id, 'consultation:started', normalized);
    if (patient_id) {
      this.notifyUser(patient_id, 'consultation:started', normalized);
      const notificationKey = normalized.consultationId || normalized.appointmentId || normalized.roomId || crypto.randomUUID();

      const patientNotif = {
        type: 'consultation_started',
        title: 'Doctor is waiting',
        message: `${normalized.doctorName || 'Doctor'} has started your consultation. Join now.`,
        timestamp: normalized.timestamp,
        data: {
          consultationId: normalized.consultationId,
          appointmentId: normalized.appointmentId,
          roomId: normalized.roomId,
          doctorName: normalized.doctorName || 'Doctor',
          idempotencyKey: `consultation-started:${notificationKey}`,
        },
      };

      try {
        const notificationService = require('./notificationService');
        notificationService.sendNotification(patient_id, patientNotif).catch((err) => {
          console.warn('[EventEmitter] consultation_started push failed:', err.message || err);
        });
      } catch (err) {
        console.warn('[EventEmitter] notification service unavailable:', err.message || err);
      }
    }
    this.emitDistributed('consultation:started', normalized);
  }

  emitConsultationEnded(consultation) {
    const normalized = this.normalizeConsultationEventPayload(consultation);
    const { doctor_id, patient_id } = normalized;
    this.notifyUser(doctor_id, 'consultation:ended', normalized);
    this.notifyUser(patient_id, 'consultation:ended', normalized);
    this.emitDistributed('consultation:ended', normalized);
  }

  emitConsultationPatientLeft(payload) {
    const normalized = {
      ...payload,
      consultationId: payload.consultationId || payload.consultation_id || payload.id || '',
      timestamp: payload.timestamp || new Date().toISOString(),
    };

    if (normalized.doctorUserId) {
      this.notifyUser(normalized.doctorUserId, 'consultation:patient-left', normalized);
    }
    this.emitDistributed('consultation:patient-left', normalized);
  }

  emitEmergencyRequest(emergency) {
    this.emitEmergencyDispatch('emergency:new', emergency);
  }

  emitAmbulanceAssigned(data) {
    const { patient_id, requestId, hospital_owner_id } = data;
    this.notifyUser(patient_id, 'ambulance:assigned', data);
    this.notifyRoom(`ambulance:${requestId}`, 'ambulance:assigned', data);
    // SYNC-01 Fix: Notify hospital owner so their dashboard can show dispatch/tracking status
    if (hospital_owner_id) {
      this.notifyUser(hospital_owner_id, 'ambulance:dispatched', data);
      this.notifyUser(hospital_owner_id, 'notification:new', {
        type: 'ambulance_dispatch',
        title: 'Ambulance Dispatched',
        message: `Ambulance dispatched for emergency request ${requestId?.slice(0, 8) || ''}`,
        timestamp: new Date().toISOString(),
        data: { requestId },
      });
    }
    this.emitDistributed('ambulance:assigned', data);
  }

  emitAmbulanceStatus(requestId, patientUserId, status, data = {}) {
    const payload = { requestId, status, ...data, timestamp: new Date().toISOString() };
    this.notifyUser(patientUserId, 'ambulance:status-update', payload);
    this.notifyRoom(`ambulance:${requestId}`, 'ambulance:status-update', payload);
    this.emitDistributed('ambulance:status-update', payload);
  }

  emitPrescriptionCreated(prescription) {
    const { patient_id } = prescription;
    const payload = {
      ...prescription,
      consultationId: prescription.consultationId || prescription.consultation_id || null,
      prescriptionId: prescription.prescriptionId || prescription.id || null,
      doctorName: prescription.doctorName || prescription.doctor_name || prescription.doctor?.name || 'Doctor',
      timestamp: prescription.timestamp || prescription.updated_at || prescription.created_at || new Date().toISOString(),
    };
    this.notifyUser(patient_id, 'prescription:new', payload);
    this.notifyUser(patient_id, 'notification:new', {
      type: 'prescription',
      title: 'New Prescription',
      message: `${payload.doctorName} has shared a prescription for this consultation`,
      timestamp: payload.timestamp,
      data: {
        prescriptionId: payload.prescriptionId,
        consultationId: payload.consultationId,
      },
    });
    // SYNC-04 Fix: If prescription has preferred pharmacy, notify them too
    const pharmacyOwnerId = prescription.pharmacy_owner_id || prescription.pharmacyOwnerId;
    if (pharmacyOwnerId) {
      this.notifyUser(pharmacyOwnerId, 'prescription:new', payload);
      this.notifyUser(pharmacyOwnerId, 'notification:new', {
        type: 'prescription',
        title: 'New Prescription Received',
        message: `A new prescription has been assigned to your pharmacy by ${payload.doctorName}`,
        timestamp: payload.timestamp,
        data: { prescriptionId: payload.prescriptionId },
      });
    }
    this.emitDistributed('prescription:created', payload);
  }

  emitOrderStatusUpdated(order) {
    const { patient_id, pharmacy_owner_id } = order;
    const normalizedStatus = order.status === 'out_for_delivery' ? 'dispatched' : order.status;
    // Normalize payload to include fields expected by web & Android clients
    const payload = {
      ...order,
      orderId: order.id,
      orderNumber: order.order_number || order.id?.slice(0, 8)?.toUpperCase(),
      status: normalizedStatus,
      message: `Order status updated to ${normalizedStatus}`,
      timestamp: order.updated_at || new Date().toISOString(),
    };
    this.notifyUser(patient_id, 'order:update', payload);
    if (pharmacy_owner_id) {
      this.notifyUser(pharmacy_owner_id, 'order:update', payload);
    }
    this.emitDistributed('order:update', payload);
  }

  emitNewOrder(order) {
    const { pharmacy_owner_id } = order;
    if (pharmacy_owner_id) {
      this.notifyUser(pharmacy_owner_id, 'order:new', order);
      this.notifyUser(pharmacy_owner_id, 'notification:new', {
        title: 'New Order Received',
        message: `A new medicine order #${order.id?.slice(0, 8)?.toUpperCase()} has been received`,
        type: 'pharmacy_order',
        timestamp: new Date().toISOString(),
        data: { orderId: order.id },
      });
    }
    this.emitDistributed('order:new', order);
  }

  emitDiagnosticBookingCreated(booking, patientUserId) {
    const { patient_id, center_id, center_owner_id } = booking;
    const normalizedBooking = {
      ...booking,
      status: normalizeDiagnosticBookingStatus(booking.status),
      center_id: booking.center_id || center_id,
    };
    const patientNotif = {
      title: 'Booking Request Received',
      message: 'Your diagnostic booking request has been sent to the center for confirmation',
      type: 'diagnostic_booking',
      timestamp: new Date().toISOString(),
      data: {
        bookingId: normalizedBooking.id,
        diagnosticBookingId: normalizedBooking.id,
        centerId: normalizedBooking.center_id,
      },
    };
    if (patientUserId) this.notifyUser(patientUserId, 'notification:new', patientNotif);
    try {
      const notificationService = require('./notificationService');
      if (patientUserId) notificationService.sendNotification(patientUserId, patientNotif).catch(() => {});
    } catch {}
    // Notify the diagnostic center owner for real-time dashboard updates
    if (center_owner_id) {
      this.notifyUser(center_owner_id, 'diagnostic:new-booking', normalizedBooking);
      this.notifyUser(center_owner_id, 'notification:new', {
        title: 'New Booking',
        message: 'A new diagnostic booking request has been received',
        type: 'diagnostic_booking',
        timestamp: new Date().toISOString(),
        data: {
          bookingId: normalizedBooking.id,
          diagnosticBookingId: normalizedBooking.id,
          centerId: normalizedBooking.center_id,
        },
      });
    }
    this.emitDistributed('diagnostic:booked', normalizedBooking);
  }

  emitDiagnosticBookingStatusUpdated(booking) {
    const { patient_id } = booking;
    const normalizedStatus = normalizeDiagnosticBookingStatus(booking.status);
    const normalizedBooking = {
      ...booking,
      status: normalizedStatus,
    };
    const statusMessages = {
      pending: 'Your diagnostic booking request is pending confirmation',
      confirmed: 'Your diagnostic booking has been confirmed',
      dispatched: 'Your home sample collection team has been dispatched',
      sample_collected: 'Your sample has been collected',
      processing: 'Your diagnostic test is being processed',
      completed: 'Your diagnostic booking is completed',
      cancelled: 'Your diagnostic booking has been cancelled',
    };
    const eventName = normalizedStatus === 'confirmed'
      ? 'diagnostic:booking-confirmed'
      : 'diagnostic:booking-updated';
    this.notifyUser(patient_id, eventName, normalizedBooking);
    const patientNotif = {
      title: normalizedStatus === 'confirmed' ? 'Booking Confirmed' : 'Booking Updated',
      message: statusMessages[normalizedStatus] || `Your diagnostic booking status changed to ${normalizedStatus}`,
      type: normalizedStatus === 'confirmed' ? 'diagnostic_booking' : 'diagnostic_update',
      data: {
        bookingId: normalizedBooking.id,
        diagnosticBookingId: normalizedBooking.id,
        centerId: normalizedBooking.center_id,
        status: normalizedStatus,
      },
    };
    this.notifyUser(patient_id, 'notification:new', patientNotif);
    try {
      const notificationService = require('./notificationService');
      notificationService.sendNotification(patient_id, patientNotif).catch(() => {});
    } catch {}
    this.emitDistributed('diagnostic:status-updated', normalizedBooking);
  }

  emitDiagnosticResultUploaded(booking) {
    const { patient_id } = booking;
    this.notifyUser(patient_id, 'diagnostic:result-ready', booking);
    const patientNotif = {
      title: 'Results Ready',
      message: 'Your diagnostic test results are now available',
      type: 'diagnostic_result',
      data: {
        bookingId: booking.id,
        diagnosticBookingId: booking.id,
        centerId: booking.center_id,
        resultUrl: booking.result_url,
      },
    };
    this.notifyUser(patient_id, 'notification:new', patientNotif);
    try {
      const notificationService = require('./notificationService');
      notificationService.sendNotification(patient_id, patientNotif).catch(() => {});
    } catch {}
    this.emitDistributed('diagnostic:result-uploaded', booking);
  }

  emitNotification(userId, notification) {
    const payload = {
      timestamp: new Date().toISOString(),
      ...notification,
    };
    this.notifyUser(userId, 'notification:new', payload);
    this.emitDistributed('notification:sent', { userId, notification: payload });
  }

  emitProviderCatalogUpdated(update = {}) {
    const payload = {
      timestamp: new Date().toISOString(),
      ...update,
    };
    this.notifyRoom('role:patient', 'catalog:refresh', payload);
    this.emitDistributed('catalog:refresh', payload);
  }

  // Improvement #13: Real-time inventory updates
  emitInventoryUpdated(pharmacyId, pharmacyOwnerId, inventoryItem = {}) {
    const payload = {
      pharmacyId,
      item: inventoryItem,
      timestamp: new Date().toISOString(),
    };
    // Notify patients viewing this pharmacy's inventory
    this.notifyRoom(`pharmacy:${pharmacyId}`, 'inventory:updated', payload);
    // Also notify the pharmacy owner for dashboard consistency
    if (pharmacyOwnerId) {
      this.notifyUser(pharmacyOwnerId, 'inventory:updated', payload);
    }
    this.emitDistributed('inventory:updated', payload);
    // Notify patient catalog refresh so MedicineScreen updates
    this.emitProviderCatalogUpdated({ providerId: pharmacyId, providerType: 'pharmacy', status: 'inventory_updated' });
  }

  // ── Backward-compatible aliases used by tests/legacy callers ────
  emitBulkNotification(userIds = [], notification = {}) {
    for (const userId of userIds) {
      this.emitNotification(userId, notification);
    }
  }

  emitToAdmins(event, data = {}) {
    this.notifyRoom('role:admin', event, data);
    this.notifyRoom('role:super_admin', event, data);
  }

  emitNewProviderRegistration(provider = {}) {
    const payload = {
      type: 'new_registration',
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.provider_type || provider.type,
      },
      timestamp: new Date().toISOString(),
    };
    this.notifyRoom('role:admin', 'admin:new-registration', payload);
    this.notifyRoom('role:super_admin', 'admin:new-registration', payload);
  }

  emitAppointmentUpdate(userId, appointment = {}, status) {
    const payload = {
      ...appointment,
      appointmentId: appointment.id,
      status,
      doctorName: appointment.doctor_name || appointment.doctorName,
      timestamp: new Date().toISOString(),
    };
    this.notifyUser(userId, 'appointment:update', payload);
  }

  emitNewEmergency(emergency = {}) {
    const payload = {
      ...emergency,
      timestamp: new Date().toISOString(),
    };
    this.notifyRoom('role:admin', 'emergency:new', payload);
    this.notifyRoom('role:super_admin', 'emergency:new', payload);
    this.notifyRoom('role:ambulance_operator', 'emergency:new', payload);
  }

  emitOrderUpdate(patientId, order = {}, status) {
    const statusMessages = {
      pending: 'Your order has been received',
      confirmed: 'Your order has been confirmed',
      dispatched: 'Your order is on the way',
      delivered: 'Your order has been delivered',
      cancelled: 'Your order has been cancelled',
    };

    const payload = {
      ...order,
      orderId: order.id,
      orderNumber: order.order_number || order.orderNumber,
      status,
      message: statusMessages[status] || `Your order status is now ${status}`,
      timestamp: new Date().toISOString(),
    };

    this.notifyUser(patientId, 'order:update', payload);
  }

  emitAmbulanceLocation(requestId, location = {}) {
    const payload = {
      requestId,
      ...location,
      timestamp: new Date().toISOString(),
    };
    this.notifyRoom(`ambulance:${requestId}`, 'ambulance:location-update', payload);
  }

  emitSystemAnnouncement(announcement = {}) {
    const payload = {
      ...announcement,
      timestamp: new Date().toISOString(),
    };
    try {
      if (this.io) {
        this.io.emit('system:announcement', payload);
      }
      this.emitDistributed('system:announcement', payload);
    } catch (err) {
      console.error('[EventEmitter] emitSystemAnnouncement error:', err.message);
    }
  }

  // SYNC-03 Fix: Real-time notification to provider on approval status change
  emitProviderApproved(provider, type, status) {
    const userId = provider.user_id || provider.owner_id;
    if (!userId) return;
    const statusMessages = {
      approved: `Your ${type} registration has been approved! You can now access your dashboard.`,
      rejected: `Your ${type} registration was not approved. Please check your notifications for details.`,
      suspended: `Your ${type} account has been suspended. Please contact support.`,
      reactivated: `Your ${type} account has been reactivated. You can access your dashboard again.`,
    };
    this.notifyUser(userId, 'provider:status-changed', {
      providerId: provider.id,
      providerType: type,
      status,
      timestamp: new Date().toISOString(),
    });
    this.notifyUser(userId, 'notification:new', {
      type: 'provider_approval',
      title: `Registration ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: statusMessages[status] || `Your ${type} registration status changed to ${status}`,
      timestamp: new Date().toISOString(),
      data: { providerId: provider.id, providerType: type, status },
    });
  }
  emitNewCatalogRequest(requestData, pharmacyOwnerIds = []) {
    const payload = {
      ...requestData,
      timestamp: new Date().toISOString(),
    };
    
    // Determine title/message based on bundle items
    const medicineItems = (requestData.items || []).filter(i => i._type !== 'delivery_info');
    const medicineName = medicineItems.length === 1 
      ? (medicineItems[0].name || 'a medicine')
      : `a bundle of ${medicineItems.length} medicines`;
      
    pharmacyOwnerIds.forEach((ownerId) => {
      this.notifyUser(ownerId, 'catalog:request:new', payload);
      this.notifyUser(ownerId, 'notification:new', {
        type: 'catalog_request',
        title: 'New Medicine Request',
        message: `A patient is looking for ${medicineName}`,
        timestamp: payload.timestamp,
        data: { requestId: requestData.id },
      });
    });
  }

  emitCatalogRequestAccepted(requestData, pharmacyName, patientUserId) {
    const payload = {
      ...requestData,
      timestamp: new Date().toISOString(),
    };
    this.notifyUser(patientUserId, 'catalog:request:accepted', payload);
    this.notifyUser(patientUserId, 'notification:new', {
      type: 'catalog_request',
      title: 'Medicine Request Accepted',
      message: `${pharmacyName} has accepted your request for ${requestData.medicine_name || requestData.medicine_generic_name} at ₹${requestData.accepted_price}`,
      timestamp: payload.timestamp,
      data: { requestId: requestData.id },
    });
  }

  // ── Consultation lifecycle events (Part 8-12) ──────────────────
  // Every lifecycle transition fans out to both participants so multi-tab
  // and cross-platform clients stay in sync without polling.
  emitConsultationStage(payload) {
    const { consultationId, doctorUserId, patientUserId } = payload || {};
    if (doctorUserId) this.notifyUser(doctorUserId, 'consultation:stage', payload);
    if (patientUserId) this.notifyUser(patientUserId, 'consultation:stage', payload);
    if (consultationId) {
      this.notifyRoom(`video:${consultationId}`, 'consultation:stage', payload);
      this.notifyRoom(`consultation:${consultationId}`, 'consultation:stage', payload);
    }
    this.emitDistributed('consultation:stage', payload);
  }

  emitConsultationEndRequest(payload) {
    const { consultationId, doctorUserId, patientUserId } = payload || {};
    if (patientUserId) this.notifyUser(patientUserId, 'consultation:end-request', payload);
    if (doctorUserId) this.notifyUser(doctorUserId, 'consultation:end-request', payload);
    if (consultationId) this.notifyRoom(`video:${consultationId}`, 'consultation:end-request', payload);
    this.emitDistributed('consultation:end-request', payload);
  }

  emitConsultationEndResponse(payload) {
    const { consultationId, doctorUserId, patientUserId } = payload || {};
    if (doctorUserId) this.notifyUser(doctorUserId, 'consultation:end-response', payload);
    if (patientUserId) this.notifyUser(patientUserId, 'consultation:end-response', payload);
    if (consultationId) this.notifyRoom(`video:${consultationId}`, 'consultation:end-response', payload);
    this.emitDistributed('consultation:end-response', payload);
  }

  emitConsultationForceCompleted(payload) {
    const { consultationId, doctorUserId, patientUserId } = payload || {};
    if (doctorUserId) this.notifyUser(doctorUserId, 'consultation:force-completed', payload);
    if (patientUserId) this.notifyUser(patientUserId, 'consultation:force-completed', payload);
    if (consultationId) this.notifyRoom(`video:${consultationId}`, 'consultation:force-completed', payload);
    this.emitDistributed('consultation:force-completed', payload);
  }

  emitConsultationNetworkEvent(payload) {
    const { consultationId, doctorUserId, patientUserId } = payload || {};
    if (doctorUserId) this.notifyUser(doctorUserId, 'consultation:network', payload);
    if (patientUserId) this.notifyUser(patientUserId, 'consultation:network', payload);
    if (consultationId) this.notifyRoom(`video:${consultationId}`, 'consultation:network', payload);
    this.emitDistributed('consultation:network', payload);
  }

  emitConsultationLog(payload) {
    const { consultationId, actorId } = payload || {};
    if (consultationId) this.notifyRoom(`video:${consultationId}`, 'consultation:log', payload);
    if (actorId) this.notifyUser(actorId, 'consultation:log', payload);
    this.emitDistributed('consultation:log', payload);
  }

  emitConsultationPolicyChanged(payload) {
    this.notifyRoom('role:super_admin', 'consultation:policy-changed', payload);
    this.notifyRoom('role:admin', 'consultation:policy-changed', payload);
    this.emitDistributed('consultation:policy-changed', payload);
  }
}

const eventEmitter = new AppEventEmitter();

module.exports = eventEmitter;
