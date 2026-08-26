/**
 * Patient-facing HIS routes.
 * 
 * Mounted at: /api/patients (within the existing patient route file)
 * These endpoints let the patient app view queue position, admissions,
 * lab reports, and insurance pre-auth status.
 */
const express = require('express');
const { query, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { supabaseAdmin } = require('../../config/supabase');

const router = express.Router();

// Helper to resolve patients.id from users.id
const getPatientId = async (user) => {
  if (user.patientId) return user.patientId;
  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  return patient?.id || user.id;
};

// All routes require patient authentication
router.use(authenticate, authorize('patient'));

// ──────────────────────────────────────────────────
// GET /queue/position — Patient's active OPD queue position
// ──────────────────────────────────────────────────
router.get(
  '/queue/position',
  asyncHandler(async (req, res) => {
    const patientId = await getPatientId(req.user);

    // Find the patient's active queue entry (today, not completed/cancelled)
    const { data: queueEntry, error } = await supabaseAdmin
      .from('opd_queue')
      .select(`
        id, token_number, status, queue_date, priority, notes,
        estimated_wait_minutes, check_in_time,
        doctor:doctors!opd_queue_doctor_id_fkey(id, name),
        hospital:hospitals!opd_queue_hospital_id_fkey(id, name),
        department:hospital_departments!opd_queue_department_id_fkey(id, name)
      `)
      .eq('patient_id', patientId)
      .eq('queue_date', new Date().toISOString().split('T')[0])
      .in('status', ['waiting', 'in_consultation'])
      .order('check_in_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!queueEntry) {
      return res.json({
        success: true,
        data: { queue: null, queue_active: false },
      });
    }

    // Calculate position in queue
    const { count: positionCount } = await supabaseAdmin
      .from('opd_queue')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', queueEntry.hospital?.id)
      .eq('doctor_id', queueEntry.doctor?.id)
      .eq('queue_date', queueEntry.queue_date)
      .eq('status', 'waiting')
      .lte('token_number', queueEntry.token_number);

    // Get current serving token
    const { data: currentServing } = await supabaseAdmin
      .from('opd_queue')
      .select('token_number')
      .eq('hospital_id', queueEntry.hospital?.id)
      .eq('doctor_id', queueEntry.doctor?.id)
      .eq('queue_date', queueEntry.queue_date)
      .eq('status', 'in_consultation')
      .limit(1)
      .maybeSingle();

    res.json({
      success: true,
      data: {
        queue: {
          ...queueEntry,
          display_token: `OPD-${queueEntry.token_number}`,
          position: positionCount || 0,
          doctor_name: queueEntry.doctor?.name,
          department_name: queueEntry.department?.name,
          hospital_name: queueEntry.hospital?.name,
          hospital_id: queueEntry.hospital?.id,
          current_token: currentServing?.token_number || null,
        },
        queue_active: true,
      },
    });
  })
);

// ──────────────────────────────────────────────────
// GET /admissions — Patient's admission history
// ──────────────────────────────────────────────────
router.get(
  '/admissions',
  [
    query('page').optional().isInt({ min: 1 }),
    query('status').optional().isString(),
    validate,
  ],
  asyncHandler(async (req, res) => {
    const patientId = await getPatientId(req.user);
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    let qb = supabaseAdmin
      .from('patient_admissions')
      .select(`
        id, admission_number, status, admission_type, chief_complaint,
        provisional_diagnosis, final_diagnosis, admitted_at, discharged_at,
        expected_discharge_date, discharge_summary, follow_up_date,
        follow_up_instructions, insurance_provider, policy_number,
        hospital:hospitals!patient_admissions_hospital_id_fkey(id, name),
        doctor:doctors!patient_admissions_attending_doctor_id_fkey(id, name),
        ward:hospital_wards!patient_admissions_ward_id_fkey(name),
        bed:hospital_beds!patient_admissions_bed_id_fkey(bed_number)
      `, { count: 'exact' })
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (req.query.status) {
      qb = qb.eq('status', req.query.status);
    }

    const { data, count, error } = await qb;
    if (error) throw error;

    const formatted = (data || []).map((a) => ({
      ...a,
      hospital_name: a.hospital?.name,
      hospital_id: a.hospital?.id,
      attending_doctor_name: a.doctor?.name,
      ward_name: a.ward?.name,
      bed_number: a.bed?.bed_number,
    }));

    res.json({
      success: true,
      data: {
        data: formatted,
        pagination: {
          page,
          totalPages: Math.ceil((count || 0) / limit),
          total: count || 0,
        },
      },
    });
  })
);

// ──────────────────────────────────────────────────
// GET /admissions/:id — Admission detail
// ──────────────────────────────────────────────────
router.get(
  '/admissions/:id',
  [param('id').isUUID(), validate],
  asyncHandler(async (req, res) => {
    const patientId = await getPatientId(req.user);

    const { data, error } = await supabaseAdmin
      .from('patient_admissions')
      .select(`
        *,
        hospital:hospitals!patient_admissions_hospital_id_fkey(id, name),
        doctor:doctors!patient_admissions_attending_doctor_id_fkey(id, name),
        ward:hospital_wards!patient_admissions_ward_id_fkey(name, ward_type),
        bed:hospital_beds!patient_admissions_bed_id_fkey(bed_number, bed_type)
      `)
      .eq('id', req.params.id)
      .eq('patient_id', patientId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }

    res.json({
      success: true,
      data: {
        ...data,
        hospital_name: data.hospital?.name,
        hospital_id: data.hospital?.id,
        attending_doctor_name: data.doctor?.name,
        ward_name: data.ward?.name,
        bed_number: data.bed?.bed_number,
      },
    });
  })
);

// ──────────────────────────────────────────────────
// GET /lab-reports — Patient's lab + radiology reports
// ──────────────────────────────────────────────────
router.get(
  '/lab-reports',
  [
    query('page').optional().isInt({ min: 1 }),
    query('status').optional().isString(),
    query('type').optional().isIn(['lab', 'radiology']),
    validate,
  ],
  asyncHandler(async (req, res) => {
    const patientId = await getPatientId(req.user);
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const reportType = req.query.type;

    const results = [];

    // Lab orders
    if (!reportType || reportType === 'lab') {
      let labQb = supabaseAdmin
        .from('lab_orders')
        .select(`
          id, order_number, test_name, test_category, status, priority,
          is_abnormal, report_url, created_at,
          reported_at,
          hospital:hospitals!lab_orders_hospital_id_fkey(name),
          doctor:doctors!lab_orders_ordering_doctor_id_fkey(name)
        `, { count: 'exact' })
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (req.query.status) labQb = labQb.eq('status', req.query.status);

      const { data: labData, error: labErr } = await labQb;
      if (labErr) throw labErr;

      (labData || []).forEach((l) => {
        results.push({
          ...l,
          modality: null,
          hospital_name: l.hospital?.name,
          doctor_name: l.doctor?.name,
          ordered_at: l.created_at,
        });
      });
    }

    // Radiology orders
    if (!reportType || reportType === 'radiology') {
      let radQb = supabaseAdmin
        .from('radiology_orders')
        .select(`
          id, order_number, study_description, modality, status, priority,
          report_url, impression, created_at, completed_at,
          hospital:hospitals!radiology_orders_hospital_id_fkey(name),
          doctor:doctors!radiology_orders_ordering_doctor_id_fkey(name)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (req.query.status) radQb = radQb.eq('status', req.query.status);

      const { data: radData, error: radErr } = await radQb;
      if (radErr) throw radErr;

      (radData || []).forEach((r) => {
        results.push({
          id: r.id,
          order_number: r.order_number,
          test_name: r.study_description || r.modality,
          test_category: null,
          modality: r.modality,
          status: r.status,
          priority: r.priority,
          is_abnormal: false,
          report_url: r.report_url,
          hospital_name: r.hospital?.name,
          doctor_name: r.doctor?.name,
          ordered_at: r.created_at,
          reported_at: r.completed_at,
        });
      });
    }

    // Sort combined results by ordered_at desc
    results.sort((a, b) => new Date(b.ordered_at) - new Date(a.ordered_at));

    // Paginate
    const total = results.length;
    const paginated = results.slice(offset, offset + limit);

    res.json({
      success: true,
      data: {
        data: paginated,
        pagination: {
          page,
          totalPages: Math.ceil(total / limit),
          total,
        },
      },
    });
  })
);

// ──────────────────────────────────────────────────
// GET /insurance/preauth — Patient's pre-auth status
// ──────────────────────────────────────────────────
router.get(
  '/insurance/preauth',
  [query('page').optional().isInt({ min: 1 }), validate],
  asyncHandler(async (req, res) => {
    const patientId = await getPatientId(req.user);
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabaseAdmin
      .from('insurance_preauth')
      .select(`
        id, pre_auth_number, insurance_provider, policy_number, status,
        requested_amount, approved_amount, diagnosis, procedure_name,
        rejection_reason, requested_at, responded_at, expiry_date,
        hospital:hospitals!insurance_preauth_hospital_id_fkey(name)
      `, { count: 'exact' })
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const formatted = (data || []).map((p) => ({
      ...p,
      preauth_number: p.pre_auth_number,
      hospital_name: p.hospital?.name,
    }));

    res.json({
      success: true,
      data: {
        data: formatted,
        pagination: {
          page,
          totalPages: Math.ceil((count || 0) / limit),
          total: count || 0,
        },
      },
    });
  })
);

module.exports = router;
