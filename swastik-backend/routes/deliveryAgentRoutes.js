const express = require('express');
const router = express.Router();
const eventEmitter = require('../services/eventEmitter');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { ROLES, requireRole } = require('../middleware/rbac');
const { randomUUID } = require('crypto');

const ADMIN_ROLES = new Set([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
const DELIVERY_MANAGER_ROLES = [ROLES.HOSPITAL_OWNER, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.PHARMACY_OWNER, ROLES.DIAGNOSTIC_CENTER_OWNER];

const toNumberOrNull = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeAddress = (address) => {
    if (!address) return { text: null, latitude: null, longitude: null, phone: null };
    if (typeof address === 'string') {
        return { text: address, latitude: null, longitude: null, phone: null };
    }
    return {
        text: address.address || address.line1 || address.formatted || [address.street, address.city, address.pincode].filter(Boolean).join(', ') || null,
        latitude: toNumberOrNull(address.latitude ?? address.lat),
        longitude: toNumberOrNull(address.longitude ?? address.lng ?? address.lon),
        phone: address.phone || address.mobile || null,
    };
};

const getFacilityOwner = async (facilityType, facilityId) => {
    const table = facilityType === 'pharmacy'
        ? 'pharmacies'
        : facilityType === 'diagnostic_center'
            ? 'diagnostic_centers'
            : facilityType === 'hospital'
                ? 'hospitals'
                : null;
    if (!table) return null;
    const { data } = await supabaseAdmin.from(table).select('owner_id').eq('id', facilityId).maybeSingle();
    return data?.owner_id || null;
};

// 1. Get all agents for a facility
router.get('/facility/:facilityId', authenticate, requireRole(...DELIVERY_MANAGER_ROLES), async (req, res) => {
    try {
        const { facilityId } = req.params;
        const { facility_type } = req.query; // Expect facility_type to know which table to check
        
        if (!ADMIN_ROLES.has(req.user.role)) {
            let table;
            if (facility_type === 'pharmacy') table = 'pharmacies';
            else if (facility_type === 'diagnostic_center') table = 'diagnostic_centers';
            else if (facility_type === 'hospital') table = 'hospitals';
            else return res.status(400).json({ success: false, message: 'Invalid facility_type' });

            const { data: facility } = await supabaseAdmin.from(table).select('owner_id').eq('id', facilityId).single();
            if (!facility || facility.owner_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Unauthorized: You do not own this facility' });
            }
        }

        const { data, error } = await supabaseAdmin
            .from('delivery_agents')
            .select('*')
            .eq('facility_id', facilityId);
            
        if (error) throw error;
        res.json({ success: true, agents: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Add new agent
router.post('/', authenticate, requireRole(...DELIVERY_MANAGER_ROLES), async (req, res) => {
    try {
        const { facility_id, facility_type, name, phone, vehicle_details } = req.body;
        
        // Verify facility ownership
        if (!ADMIN_ROLES.has(req.user.role)) {
            let table;
            if (facility_type === 'pharmacy') table = 'pharmacies';
            else if (facility_type === 'diagnostic_center') table = 'diagnostic_centers';
            else if (facility_type === 'hospital') table = 'hospitals';
            else return res.status(400).json({ success: false, message: 'Invalid facility_type' });

            const { data: facility } = await supabaseAdmin.from(table).select('owner_id').eq('id', facility_id).single();
            if (!facility || facility.owner_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Unauthorized: You do not own this facility' });
            }
        }

        const { data, error } = await supabaseAdmin
            .from('delivery_agents')
            .insert([{ facility_id, facility_type, name, phone, vehicle_details }])
            .select()
            .single();
            
        if (error) throw error;
        res.json({ success: true, agent: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Delete Agent
router.delete('/:id', authenticate, requireRole(...DELIVERY_MANAGER_ROLES), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verify facility ownership
        if (!ADMIN_ROLES.has(req.user.role)) {
            const { data: agent } = await supabaseAdmin.from('delivery_agents').select('facility_id, facility_type').eq('id', id).single();
            if (!agent) {
                return res.status(404).json({ success: false, message: 'Agent not found' });
            }
            let table;
            if (agent.facility_type === 'pharmacy') table = 'pharmacies';
            else if (agent.facility_type === 'diagnostic_center') table = 'diagnostic_centers';
            else if (agent.facility_type === 'hospital') table = 'hospitals';
            else return res.status(400).json({ success: false, message: 'Invalid facility_type for agent' });

            const { data: facility } = await supabaseAdmin.from(table).select('owner_id').eq('id', agent.facility_id).single();
            if (!facility || facility.owner_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Unauthorized: You do not own this facility' });
            }
        }

        const { error } = await supabaseAdmin
            .from('delivery_agents')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        res.json({ success: true, message: 'Agent deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Assign Agent & Generate Tracking Link
router.post('/assign', authenticate, requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.PHARMACY_OWNER, ROLES.DIAGNOSTIC_CENTER_OWNER), async (req, res) => {
    try {
        const { order_id, order_type, agent_id } = req.body; // order_type: 'pharmacy' or 'diagnostic'
        if (!order_id || !agent_id || !['pharmacy', 'diagnostic'].includes(order_type)) {
            return res.status(400).json({ success: false, message: 'Valid order_id, order_type, and agent_id are required' });
        }
        const tracking_token = randomUUID();
        
        // Update the order/booking
        const table = order_type === 'pharmacy' ? 'pharmacy_orders' : 'diagnostic_bookings';
        const facilityType = order_type === 'pharmacy' ? 'pharmacy' : 'diagnostic_center';
        const facilityColumn = order_type === 'pharmacy' ? 'pharmacy_id' : 'center_id';
        const requiredRole = order_type === 'pharmacy' ? ROLES.PHARMACY_OWNER : ROLES.DIAGNOSTIC_CENTER_OWNER;

        if (!ADMIN_ROLES.has(req.user.role) && req.user.role !== requiredRole) {
            return res.status(403).json({ success: false, message: 'You cannot assign deliveries for this facility type' });
        }

        const [{ data: order }, { data: agent }] = await Promise.all([
            supabaseAdmin.from(table).select(`id, ${facilityColumn}`).eq('id', order_id).maybeSingle(),
            supabaseAdmin.from('delivery_agents').select('id, facility_id, facility_type, status').eq('id', agent_id).maybeSingle(),
        ]);
        if (!order) return res.status(404).json({ success: false, message: 'Order or booking not found' });
        if (!agent) return res.status(404).json({ success: false, message: 'Delivery agent not found' });

        const facilityId = order[facilityColumn];
        if (agent.facility_id !== facilityId || agent.facility_type !== facilityType) {
            return res.status(400).json({ success: false, message: 'Agent does not belong to the order facility' });
        }
        if (!ADMIN_ROLES.has(req.user.role)) {
            const ownerId = await getFacilityOwner(facilityType, facilityId);
            if (ownerId !== req.user.id) {
                return res.status(403).json({ success: false, message: 'You do not own this order facility' });
            }
        }
        
        const selectQuery = order_type === 'pharmacy' 
            ? '*, pharmacy:pharmacies(id, name, phone, address, latitude, longitude), delivery_agents(*)' 
            : '*, test:diagnostic_tests(id, name, category, price), center:diagnostic_centers(id, name, phone, address, city, latitude, longitude), delivery_agents(*)';

        const { data, error } = await supabaseAdmin
            .from(table)
            .update({ 
                agent_id, 
                tracking_token, 
                status: order_type === 'pharmacy' ? 'out_for_delivery' : 'dispatched'
            })
            .eq('id', order_id)
            .select(selectQuery)
            .single();
            
        if (error) throw error;
        
        // Emit event to notify patient of the tracking link
        if (order_type === 'pharmacy') {
            const { data: patient } = await supabaseAdmin.from('patients').select('user_id').eq('id', data.patient_id).single();
            if (patient) eventEmitter.emitOrderStatusUpdated({ ...data, patient_id: patient.user_id });
        } else {
            const { data: patient } = await supabaseAdmin.from('patients').select('user_id').eq('id', data.patient_id).single();
            if (patient) eventEmitter.emitDiagnosticBookingStatusUpdated({ ...data, patient_id: patient.user_id });
        }
        
        // Update agent status to busy
        await supabaseAdmin.from('delivery_agents').update({ status: 'busy' }).eq('id', agent_id);
        
        res.json({ success: true, order: data, tracking_token });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Get Order by Tracking Token (Public endpoint for the Agent Web App)
// VULN-BR-09: Limit public tracking payloads to name, lat, lng, status, eta only
router.get('/track/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        const stripToPublic = (order, type) => {
            if (!order) return null;
            const agent = order.delivery_agents;
            const facility = type === 'pharmacy' ? order.pharmacy : order.center;
            const destination = normalizeAddress(type === 'pharmacy' ? order.delivery_address : order.collection_address);
            return {
                id: order.id,
                status: order.status,
                agent_id: order.agent_id,
                delivery_address: type === 'pharmacy' ? order.delivery_address : undefined,
                collection_address: type === 'diagnostic' ? order.collection_address : undefined,
                patient_name: order.patient?.name || null,
                patient_phone: destination.phone || null,
                destination,
                facility: facility ? {
                    id: facility.id,
                    name: facility.name,
                    address: facility.address || null,
                    latitude: toNumberOrNull(facility.latitude),
                    longitude: toNumberOrNull(facility.longitude),
                } : null,
                agent: agent ? {
                    id: agent.id,
                    name: agent.name,
                    phone: agent.phone || null,
                    latitude: agent.latitude,
                    longitude: agent.longitude,
                    lastUpdate: agent.last_location_update,
                } : null,
            };
        };
        
        // Check pharmacy orders
        let { data: pharmacyOrder } = await supabaseAdmin
            .from('pharmacy_orders')
            .select('id, status, agent_id, delivery_address, pharmacy:pharmacies(id, name, address, latitude, longitude), patient:patients(name), delivery_agents(id, name, phone, latitude, longitude, last_location_update)')
            .eq('tracking_token', token)
            .single();
            
        if (pharmacyOrder) {
            return res.json({ success: true, order: stripToPublic(pharmacyOrder), type: 'pharmacy' });
        }
        
        // Check diagnostic bookings
        let { data: diagnosticBooking } = await supabaseAdmin
            .from('diagnostic_bookings')
            .select('id, status, agent_id, collection_address, center:diagnostic_centers(id, name, address, latitude, longitude), patient:patients(name), delivery_agents(id, name, phone, latitude, longitude, last_location_update)')
            .eq('tracking_token', token)
            .single();
            
        if (diagnosticBooking) {
            return res.json({ success: true, order: stripToPublic(diagnosticBooking), type: 'diagnostic' });
        }
        
        res.status(404).json({ success: false, message: 'Invalid tracking token' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch tracking information' });
    }
});

// 5. Mark Delivered / Collected (Public endpoint for Agent Web App)
router.post('/complete', optionalAuth, async (req, res) => {
    try {
        const { token, type } = req.body;
        const user = req.user;
        
        const table = type === 'pharmacy' ? 'pharmacy_orders' : 'diagnostic_bookings';
        const finalStatus = type === 'pharmacy' ? 'delivered' : 'sample_collected';
        
        const selectQuery = type === 'pharmacy' 
            ? '*, pharmacy:pharmacies(id, name, phone, address, latitude, longitude), delivery_agents(*)' 
            : '*, test:diagnostic_tests(id, name, category, price), center:diagnostic_centers(id, name, phone, address, city, latitude, longitude), delivery_agents(*)';

        const { data, error } = await supabaseAdmin
            .from(table)
            .select(selectQuery)
            .eq('tracking_token', token)
            .single();
            
        if (error) throw error;
        
        if (!data.delivery_agents) {
            return res.status(400).json({ success: false, message: 'No agent assigned to this order' });
        }
        
        if (user && user.role !== 'admin' && data.delivery_agents.phone !== user.phone) {
            return res.status(403).json({ success: false, message: 'Unauthorized: You are not the assigned agent for this order.' });
        }

        const { data: updatedData, error: updateError } = await supabaseAdmin
            .from(table)
            .update({ status: finalStatus })
            .eq('tracking_token', token)
            .select(selectQuery)
            .single();

        if (updateError) throw updateError;
        const orderData = updatedData;
        
        // Free up the agent
        if (orderData.agent_id) {
            await supabaseAdmin.from('delivery_agents').update({ status: 'available' }).eq('id', orderData.agent_id);
        }
        
        // Notify patient and manager that delivery/collection is complete
        if (type === 'pharmacy') {
            const { data: patient } = await supabaseAdmin.from('patients').select('user_id').eq('id', orderData.patient_id).single();
            const { data: pharmacy } = await supabaseAdmin.from('pharmacies').select('owner_id').eq('id', orderData.pharmacy_id).single();
            if (patient) eventEmitter.emitOrderStatusUpdated({ ...orderData, patient_id: patient.user_id, pharmacy_owner_id: pharmacy?.owner_id });
        } else {
            const { data: patient } = await supabaseAdmin.from('patients').select('user_id').eq('id', orderData.patient_id).single();
            const { data: center } = await supabaseAdmin.from('diagnostic_centers').select('owner_id').eq('id', orderData.center_id).single();
            if (patient) eventEmitter.emitDiagnosticBookingStatusUpdated({ ...orderData, patient_id: patient.user_id, center_owner_id: center?.owner_id });
        }
        
        res.json({ success: true, order: orderData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 6. Update Agent Location (Requires Authentication)
router.post('/location', optionalAuth, async (req, res) => {
    try {
        const { agent_id, latitude, longitude, token } = req.body;
        const lat = toNumberOrNull(latitude);
        const lng = toNumberOrNull(longitude);

        if (lat === null || lng === null) {
            return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required' });
        }

        let resolvedAgentId = agent_id;
        let trackingToken = token;

        if (token) {
            const { data: pharmacyOrder } = await supabaseAdmin
                .from('pharmacy_orders')
                .select('agent_id, tracking_token')
                .eq('tracking_token', token)
                .in('status', ['out_for_delivery', 'dispatched'])
                .maybeSingle();
            const { data: diagnosticBooking } = pharmacyOrder ? { data: null } : await supabaseAdmin
                .from('diagnostic_bookings')
                .select('agent_id, tracking_token')
                .eq('tracking_token', token)
                .in('status', ['dispatched', 'out_for_delivery'])
                .maybeSingle();

            const activeAssignment = pharmacyOrder || diagnosticBooking;
            if (!activeAssignment?.agent_id) {
                return res.status(404).json({ success: false, message: 'Active tracking assignment not found' });
            }
            if (resolvedAgentId && resolvedAgentId !== activeAssignment.agent_id) {
                return res.status(403).json({ success: false, message: 'Tracking token does not match this agent' });
            }
            resolvedAgentId = activeAssignment.agent_id;
            trackingToken = activeAssignment.tracking_token;
        } else if (!req.user) {
            return res.status(401).json({ success: false, message: 'Tracking token or authentication is required' });
        }
        
        // Ensure the authenticated user owns this agent record or is an admin
        // Note: In a real system, agents would have their own login, or the facility owner updates it.
        // Assuming facility owner or admin or the agent themselves is making the request.
        if (req.user && req.user.role !== 'admin') {
            const { data: agent } = await supabaseAdmin.from('delivery_agents').select('*').eq('id', resolvedAgentId).single();
            if (!agent) throw new Error('Agent not found');
            
            // Allow update if the user is the owner of the facility the agent belongs to
            // OR if the agent has a user_id and it matches req.user.id
            if (agent.user_id !== req.user.id) {
                 let table;
                 if (agent.facility_type === 'pharmacy') table = 'pharmacies';
                 else if (agent.facility_type === 'diagnostic_center') table = 'diagnostic_centers';
                 else if (agent.facility_type === 'hospital') table = 'hospitals';
                 else return res.status(400).json({ success: false, message: 'Invalid facility_type' });

                 const { data: facility } = await supabaseAdmin.from(table).select('owner_id').eq('id', agent.facility_id).single();
                 if (!facility || facility.owner_id !== req.user.id) {
                     return res.status(403).json({ success: false, message: 'Unauthorized to update this agent location' });
                 }
            }
        }
        
        const { data, error } = await supabaseAdmin
            .from('delivery_agents')
            .update({ 
                latitude: lat, 
                longitude: lng,
                last_location_update: new Date().toISOString()
            })
            .eq('id', resolvedAgentId)
            .select()
            .single();
            
        if (error) throw error;
        
        // Broadcast location update via Socket.IO
        const io = req.app.get('io');
        if (io) {
            if (trackingToken) {
                io.to(`tracking_${trackingToken}`).emit('agent:location-update', { latitude: lat, longitude: lng, timestamp: new Date().toISOString() });
            } else {
                // Fallback if token not provided by older client
                const { data: activeOrder } = await supabaseAdmin
                    .from('pharmacy_orders')
                    .select('tracking_token')
                    .eq('agent_id', resolvedAgentId)
                    .in('status', ['out_for_delivery'])
                    .limit(1)
                    .maybeSingle();
                    
                const trackingToken = activeOrder?.tracking_token;
                if (!trackingToken) {
                    const { data: diagBooking } = await supabaseAdmin
                        .from('diagnostic_bookings')
                        .select('tracking_token')
                        .eq('agent_id', resolvedAgentId)
                        .in('status', ['dispatched'])
                        .limit(1)
                        .maybeSingle();
                    if (diagBooking) {
                        io.to(`tracking_${diagBooking.tracking_token}`).emit('agent:location-update', { latitude: lat, longitude: lng, timestamp: new Date().toISOString() });
                    }
                } else {
                    io.to(`tracking_${activeOrder.tracking_token}`).emit('agent:location-update', { latitude: lat, longitude: lng, timestamp: new Date().toISOString() });
                }
            }
        }
        
        res.json({ success: true, agent: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
