const express = require('express');
const router = express.Router();
const eventEmitter = require('../services/eventEmitter');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// 1. Get all agents for a facility
router.get('/facility/:facilityId', authenticate, async (req, res) => {
    try {
        const { facilityId } = req.params;
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
router.post('/', authenticate, async (req, res) => {
    try {
        const { facility_id, facility_type, name, phone, vehicle_details } = req.body;
        
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
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
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
        
        const { data, error } = await supabaseAdmin
            .from(table)
            .update({ 
                agent_id, 
                tracking_token, 
                status: order_type === 'pharmacy' ? 'out_for_delivery' : 'dispatched'
            })
            .eq('id', order_id)
            .select()
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
router.get('/track/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        // Check pharmacy orders
        let { data: pharmacyOrder } = await supabaseAdmin
            .from('pharmacy_orders')
            .select('*, delivery_agents(*)')
            .eq('tracking_token', token)
            .single();
            
        if (pharmacyOrder) {
            return res.json({ success: true, order: pharmacyOrder, type: 'pharmacy' });
        }
        
        // Check diagnostic bookings
        let { data: diagnosticBooking } = await supabaseAdmin
            .from('diagnostic_bookings')
            .select('*, delivery_agents(*)')
            .eq('tracking_token', token)
            .single();
            
        if (diagnosticBooking) {
            return res.json({ success: true, order: diagnosticBooking, type: 'diagnostic' });
        }
        
        res.status(404).json({ success: false, message: 'Invalid tracking token' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. Mark Delivered / Collected (Public endpoint for Agent Web App)
router.post('/complete', async (req, res) => {
    try {
        const { token, type } = req.body;
        
        const table = type === 'pharmacy' ? 'pharmacy_orders' : 'diagnostic_bookings';
        const finalStatus = type === 'pharmacy' ? 'delivered' : 'sample_collected';
        
        const { data, error } = await supabaseAdmin
            .from(table)
            .update({ status: finalStatus })
            .eq('tracking_token', token)
            .select()
            .single();
            
        if (error) throw error;
        
        // Free up the agent
        if (data.agent_id) {
            await supabaseAdmin.from('delivery_agents').update({ status: 'available' }).eq('id', data.agent_id);
        }
        
        // Notify patient that delivery/collection is complete
        if (type === 'pharmacy') {
            const { data: patient } = await supabaseAdmin.from('patients').select('user_id').eq('id', data.patient_id).single();
            if (patient) eventEmitter.emitOrderStatusUpdated({ ...data, patient_id: patient.user_id });
        } else {
            const { data: patient } = await supabaseAdmin.from('patients').select('user_id').eq('id', data.patient_id).single();
            if (patient) eventEmitter.emitDiagnosticBookingStatusUpdated({ ...data, patient_id: patient.user_id });
        }
        
        res.json({ success: true, order: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 6. Update Agent Location (Public endpoint for Agent Web App)
router.post('/location', async (req, res) => {
    try {
        const { agent_id, latitude, longitude, token } = req.body;
        
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
