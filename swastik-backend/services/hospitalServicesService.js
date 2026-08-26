/**
 * Hospital Services (Catalog) Service
 * Service/procedure rate card management
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

const getServices = async (hospitalId, filters = {}, page = 1, limit = 50) => {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('hospital_services')
    .select('*, department:hospital_departments(id, name)', { count: 'exact' })
    .eq('hospital_id', hospitalId);

  if (filters.category) query = query.eq('category', filters.category);
  if (filters.departmentId) query = query.eq('department_id', filters.departmentId);
  if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive);
  if (filters.isPackage !== undefined) query = query.eq('is_package', filters.isPackage);
  if (filters.search) {
    const s = filters.search;
    query = query.or(`name.ilike.%${s}%,code.ilike.%${s}%,description.ilike.%${s}%`);
  }

  const { data, error, count } = await query
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return {
    data: data || [],
    pagination: { page, limit, total: count || 0, totalPages: count > 0 ? Math.ceil(count / limit) : 1 },
  };
};

const createService = async (hospitalId, serviceData) => {
  const { data, error } = await supabaseAdmin
    .from('hospital_services')
    .insert({
      hospital_id: hospitalId,
      name: serviceData.name?.trim(),
      code: serviceData.code?.trim() || null,
      category: serviceData.category || 'general',
      sub_category: serviceData.subCategory || serviceData.sub_category || null,
      department_id: serviceData.departmentId || serviceData.department_id || null,
      rate: serviceData.rate || 0,
      gst_percent: serviceData.gstPercent || serviceData.gst_percent || 0,
      hsn_code: serviceData.hsnCode || serviceData.hsn_code || null,
      is_package: serviceData.isPackage || serviceData.is_package || false,
      package_includes: serviceData.packageIncludes || serviceData.package_includes || [],
      package_validity_days: serviceData.packageValidityDays || serviceData.package_validity_days || null,
      description: serviceData.description || null,
      service_type: serviceData.serviceType || serviceData.service_type || 'one_time',
      requires_doctor: serviceData.requiresDoctor || serviceData.requires_doctor || false,
      is_active: serviceData.is_active !== false,
      sort_order: serviceData.sortOrder || serviceData.sort_order || 0,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') throw new ApiError(409, 'A service with this code already exists');
    throw error;
  }
  return data;
};

const updateService = async (hospitalId, serviceId, updates) => {
  const allowed = [
    'name', 'code', 'category', 'sub_category', 'department_id', 'rate',
    'gst_percent', 'hsn_code', 'is_package', 'package_includes', 'package_validity_days',
    'description', 'service_type', 'requires_doctor', 'is_active', 'sort_order',
  ];
  const safe = {};
  for (const k of allowed) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (updates[k] !== undefined) safe[k] = updates[k];
    else if (updates[camel] !== undefined) safe[k] = updates[camel];
  }

  const { data, error } = await supabaseAdmin
    .from('hospital_services')
    .update(safe)
    .eq('id', serviceId)
    .eq('hospital_id', hospitalId)
    .select('*')
    .single();

  if (error) throw error;
  if (!data) throw new ApiError(404, 'Service not found');
  return data;
};

const deleteService = async (hospitalId, serviceId) => {
  const { error } = await supabaseAdmin
    .from('hospital_services')
    .delete()
    .eq('id', serviceId)
    .eq('hospital_id', hospitalId);
  if (error) throw error;
  return { success: true };
};

const getServiceCategories = async (hospitalId) => {
  const { data, error } = await supabaseAdmin
    .from('hospital_services')
    .select('category')
    .eq('hospital_id', hospitalId)
    .eq('is_active', true);

  if (error) throw error;
  const categories = [...new Set((data || []).map(s => s.category).filter(Boolean))].sort();
  return categories;
};

module.exports = { getServices, createService, updateService, deleteService, getServiceCategories };
