/**
 * Event Emitter Service Tests
 */
const eventEmitter = require('../services/eventEmitter');

describe('Event Emitter Service', () => {
    let mockIO;

    beforeEach(() => {
        // Create mock Socket.IO instance
        mockIO = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn().mockReturnThis(),
        };

        // Set the mock IO
        eventEmitter.setIO(mockIO);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('setIO and getIO', () => {
        it('should set and get IO instance', () => {
            const io = eventEmitter.getIO();
            expect(io).toBe(mockIO);
        });
    });

    describe('emitNotification', () => {
        it('should emit to user room with notification data', () => {
            const userId = 'user-123';
            const notification = {
                type: 'appointment',
                title: 'Appointment Confirmed',
                message: 'Your appointment has been confirmed',
            };

            eventEmitter.emitNotification(userId, notification);

            expect(mockIO.to).toHaveBeenCalledWith(`user:${userId}`);
            expect(mockIO.emit).toHaveBeenCalledWith('notification:new', expect.objectContaining({
                type: 'appointment',
                title: 'Appointment Confirmed',
                message: 'Your appointment has been confirmed',
                timestamp: expect.any(String),
            }));
        });
    });

    describe('emitBulkNotification', () => {
        it('should emit to multiple users', () => {
            const userIds = ['user-1', 'user-2', 'user-3'];
            const notification = {
                type: 'system',
                title: 'System Update',
                message: 'Platform maintenance scheduled',
            };

            eventEmitter.emitBulkNotification(userIds, notification);

            expect(mockIO.to).toHaveBeenCalledTimes(3);
            expect(mockIO.emit).toHaveBeenCalledTimes(3);
        });
    });

    describe('emitToAdmins', () => {
        it('should emit to admin and super_admin rooms', () => {
            const event = 'admin:test-event';
            const data = { message: 'Test data' };

            eventEmitter.emitToAdmins(event, data);

            expect(mockIO.to).toHaveBeenCalledWith('role:admin');
            expect(mockIO.to).toHaveBeenCalledWith('role:super_admin');
        });
    });

    describe('emitNewProviderRegistration', () => {
        it('should emit provider registration event to admins', () => {
            const provider = {
                id: 'provider-123',
                name: 'Dr. Test Doctor',
                provider_type: 'doctor',
                email: 'test@example.com',
            };

            eventEmitter.emitNewProviderRegistration(provider);

            expect(mockIO.emit).toHaveBeenCalledWith('admin:new-registration', expect.objectContaining({
                type: 'new_registration',
                provider: expect.objectContaining({
                    id: 'provider-123',
                    name: 'Dr. Test Doctor',
                    type: 'doctor',
                }),
            }));
        });
    });

    describe('emitAppointmentUpdate', () => {
        it('should emit appointment update to user', () => {
            const userId = 'patient-123';
            const appointment = {
                id: 'apt-123',
                doctor_name: 'Dr. Test',
                date: '2026-02-10',
                time_slot: '10:00',
            };
            const status = 'confirmed';

            eventEmitter.emitAppointmentUpdate(userId, appointment, status);

            expect(mockIO.to).toHaveBeenCalledWith(`user:${userId}`);
            expect(mockIO.emit).toHaveBeenCalledWith('appointment:update', expect.objectContaining({
                appointmentId: 'apt-123',
                status: 'confirmed',
                doctorName: 'Dr. Test',
            }));
        });
    });

    describe('emitNewEmergency', () => {
        it('should emit to admins and ambulance operators', () => {
            const emergency = {
                id: 'emr-123',
                requestNumber: 'EMR12345',
                patientName: 'Test Patient',
                emergencyType: 'accident',
                location: { latitude: 28.123, longitude: 77.123, address: 'Test Address' },
            };

            eventEmitter.emitNewEmergency(emergency);

            // Should emit to admin rooms
            expect(mockIO.to).toHaveBeenCalledWith('role:admin');
            // Should emit to ambulance rooms
            expect(mockIO.to).toHaveBeenCalledWith('role:ambulance_operator');
        });
    });

    describe('emitAmbulanceStatus', () => {
        it('should emit status to patient and tracking room', () => {
            const requestId = 'req-123';
            const patientId = 'patient-123';
            const status = 'en_route';
            const data = { eta: 10 };

            eventEmitter.emitAmbulanceStatus(requestId, patientId, status, data);

            expect(mockIO.to).toHaveBeenCalledWith(`user:${patientId}`);
            expect(mockIO.to).toHaveBeenCalledWith(`ambulance:${requestId}`);
            expect(mockIO.emit).toHaveBeenCalledWith('ambulance:status-update', expect.objectContaining({
                requestId,
                status: 'en_route',
            }));
        });
    });

    describe('emitOrderUpdate', () => {
        it('should emit order update to patient', () => {
            const patientId = 'patient-123';
            const order = { id: 'order-123', order_number: 'ORD12345' };
            const status = 'dispatched';

            eventEmitter.emitOrderUpdate(patientId, order, status);

            expect(mockIO.to).toHaveBeenCalledWith(`user:${patientId}`);
            expect(mockIO.emit).toHaveBeenCalledWith('order:update', expect.objectContaining({
                orderId: 'order-123',
                orderNumber: 'ORD12345',
                status: 'dispatched',
                message: 'Your order is on the way',
            }));
        });
    });

    describe('emitAmbulanceLocation', () => {
        it('should broadcast location to tracking room', () => {
            const requestId = 'req-123';
            const location = { latitude: 28.123, longitude: 77.123, heading: 90, speed: 50 };

            eventEmitter.emitAmbulanceLocation(requestId, location);

            expect(mockIO.to).toHaveBeenCalledWith(`ambulance:${requestId}`);
            expect(mockIO.emit).toHaveBeenCalledWith('ambulance:location-update', expect.objectContaining({
                latitude: 28.123,
                longitude: 77.123,
            }));
        });
    });

    describe('emitSystemAnnouncement', () => {
        it('should broadcast to all connected users', () => {
            const announcement = {
                title: 'System Maintenance',
                message: 'Platform will be down for maintenance',
            };

            eventEmitter.emitSystemAnnouncement(announcement);

            expect(mockIO.emit).toHaveBeenCalledWith('system:announcement', expect.objectContaining({
                title: 'System Maintenance',
                message: 'Platform will be down for maintenance',
            }));
        });
    });

    describe('when IO is not set', () => {
        it('should handle gracefully', () => {
            // Create new instance with null IO
            eventEmitter.setIO(null);

            // Should not throw
            expect(() => {
                eventEmitter.emitNotification('user-123', { type: 'test', title: 'Test' });
            }).not.toThrow();
        });
    });
});
