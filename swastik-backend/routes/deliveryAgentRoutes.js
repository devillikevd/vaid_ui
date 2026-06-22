const express = require('express');
const router = express.Router();
const eventEmitter = require('../services/eventEmitter');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const { ROLES, requireRole } = require('../middleware/rbac');
const { v4: uuidv4 } = require('uuid');

// 1. Get all agents for a facility
router.get('/facility/:facilityId', authenticate, requireRole(ROLES.HOSPITAL_OWNER, ROLES.ADMIN, ROLES.PHARMACY_OWNER, ROLES.DIAGNOSTIC_CENTER_OWNER), async (req, res) => {
    try {
        const { facilityId } = req.params;
        const { facility_type } = req.query; // Expect facility_type to know which table to check
        
        if (req.user.role !== 'admin') {
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
router.post('/', authenticate, requireRole(ROLES.HOSPITAL_OWNER, ROLES.ADMIN, ROLES.PHARMACY_OWNER, ROLES.DIAGNOSTIC_CENTER_OWNER), async (req, res) => {
    try {
        const { facility_id, facility_type, name, phone, vehicle_details } = req.body;
        
        // Verify facility ownership
        if (req.user.role !== 'admin') {
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
router.delete('/:id', authenticate, requireRole(ROLES.HOSPITAL_OWNER, ROLES.ADMIN, ROLES.PHARMACY_OWNER, ROLES.DIAGNOSTIC_CENTER_OWNER), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verify facility ownership
        if (req.user.role !== 'admin') {
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
router.post('/assign', authenticate, async (req, res) => {
    try {
        const { order_id, order_type, agent_id } = req.body; // order_type: 'pharmacy' or 'diagnostic'
        const tracking_token = uuidv4();
        
        // Update the order/booking
        const table = order_type === 'pharmacy' ? 'pharmacy_orders' : 'diagnostic_bookings';
        
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
            return {
                status: order.status,
                agent: agent ? {
                    name: agent.name,
                    latitude: agent.latitude,
                    longitude: agent.longitude,
                    lastUpdate: agent.last_location_update,
                } : null,
            };
        };
        
        // Check pharmacy orders
        let { data: pharmacyOrder } = await supabaseAdmin
            .from('pharmacy_orders')
            .select('status, delivery_agents(name, latitude, longitude, last_location_update)')
            .eq('tracking_token', token)
            .single();
            
        if (pharmacyOrder) {
            return res.json({ success: true, order: stripToPublic(pharmacyOrder), type: 'pharmacy' });
        }
        
        // Check diagnostic bookings
        let { data: diagnosticBooking } = await supabaseAdmin
            .from('diagnostic_bookings')
            .select('status, delivery_agents(name, latitude, longitude, last_location_update)')
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
router.post('/complete', authenticate, async (req, res) => {
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
        
        // Check if the user is the assigned agent
        if (!data.delivery_agents) {
            return res.status(400).json({ success: false, message: 'No agent assigned to this order' });
        }
        
        if (user.role !== 'admin' && data.delivery_agents.phone !== user.phone) {
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
router.post('/location', authenticate, async (req, res) => {
    try {
        const { agent_id, latitude, longitude, token } = req.body;
        
        // Ensure the authenticated user owns this agent record or is an admin
        // Note: In a real system, agents would have their own login, or the facility owner updates it.
        // Assuming facility owner or admin or the agent themselves is making the request.
        if (req.user.role !== 'admin') {
            const { data: agent } = await supabaseAdmin.from('delivery_agents').select('*').eq('id', agent_id).single();
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
                latitude, 
                longitude,
                last_location_update: new Date().toISOString()
            })
            .eq('id', agent_id)
            .select()
            .single();
            
        if (error) throw error;
        
        // Broadcast location update via Socket.IO
        const io = req.app.get('io');
        if (io) {
            if (token) {
                io.to(`tracking_${token}`).emit('agent:location-update', { latitude, longitude });
            } else {
                // Fallback if token not provided by older client
                const { data: activeOrder } = await supabaseAdmin
                    .from('pharmacy_orders')
                    .select('tracking_token')
                    .eq('agent_id', agent_id)
                    .in('status', ['out_for_delivery'])
                    .limit(1)
                    .maybeSingle();
                    
                const trackingToken = activeOrder?.tracking_token;
                if (!trackingToken) {
                    const { data: diagBooking } = await supabaseAdmin
                        .from('diagnostic_bookings')
                        .select('tracking_token')
                        .eq('agent_id', agent_id)
                        .in('status', ['dispatched'])
                        .limit(1)
                        .maybeSingle();
                    if (diagBooking) {
                        io.to(`tracking_${diagBooking.tracking_token}`).emit('agent:location-update', { latitude, longitude });
                    }
                } else {
                    io.to(`tracking_${trackingToken}`).emit('agent:location-update', { latitude, longitude });
                }
            }
        }
        
        res.json({ success: true, agent: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
