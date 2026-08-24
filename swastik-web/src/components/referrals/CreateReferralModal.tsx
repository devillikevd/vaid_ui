'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReferralDocument {
  id: string;
  name?: string;                 // report name
  type?: string;                 // report type
  lab_name?: string;
  test_date?: string;
  result_date?: string;
  status?: string;
  created_at?: string;
  // prescription fields
  prescription_number?: string;
  diagnosis?: string;
  valid_from?: string;
  valid_until?: string;
}

interface SelectedDoc {
  report_id?: string;
  prescription_id?: string;
  document_type: 'report' | 'prescription';
  file_name: string;
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS = [
  'Patient',
  'Destination',
  'Clinical Context',
  'Medical Documents',
  'Consent & Send',
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center min-w-[60px]">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  isDone
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isActive
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400'
                }`}
              >
                {isDone ? '✓' : stepNum}
              </div>
              <span
                className={`text-[10px] mt-1 text-center leading-tight ${
                  isActive ? 'text-blue-600 font-semibold' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mb-4 ${
                  isDone ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document checkbox row
// ---------------------------------------------------------------------------

function DocRow({
  label,
  sub,
  date,
  checked,
  onChange,
}: {
  label: string;
  sub?: string;
  date?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <input
        type="checkbox"
        className="mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{label}</p>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{sub}</p>}
        {date && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {new Date(date).toLocaleDateString()}
          </p>
        )}
      </div>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CreateReferralModal({
  isOpen,
  onClose,
  onSuccess,
  contextOrgId,
  contextOrgType,
  contextOrgName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  contextOrgId?: string;
  contextOrgType?: string;
  contextOrgName?: string;
}) {
  const toast = useToast();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — Patient
  const [patientId, setPatientId] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [debouncedPatientQuery, setDebouncedPatientQuery] = useState('');
  const [patientPage, setPatientPage] = useState(1);
  const [patientTotalPages, setPatientTotalPages] = useState(1);

  // Step 2 — Destination
  const [receiverType, setReceiverType] = useState('hospital');
  const [receiverId, setReceiverId] = useState('');
  const [providers, setProviders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [partnerships, setPartnerships] = useState<Set<string>>(new Set());

  // Step 3 — Clinical Context
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState('routine');
  const [summary, setSummary] = useState('');

  // Step 4 — Medical Documents
  const [availableReports, setAvailableReports] = useState<ReferralDocument[]>([]);
  const [availablePrescriptions, setAvailablePrescriptions] = useState<ReferralDocument[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<SelectedDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  // Step 5 — Consent
  const [consentGranted, setConsentGranted] = useState<boolean | null>(null);
  const [draftReferralId, setDraftReferralId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Debounce Patient Search
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPatientQuery(patientSearchQuery);
      setPatientPage(1); // Reset page on new search
    }, 400);
    return () => clearTimeout(handler);
  }, [patientSearchQuery]);

  // ---------------------------------------------------------------------------
  // Reset on open/close
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setPatientId('');
    setPatients([]);
    setPatientSearchQuery('');
    setDebouncedPatientQuery('');
    setPatientPage(1);
    setPatientTotalPages(1);
    setReceiverType('hospital');
    setReceiverId('');
    setProviders([]);
    setSearchQuery('');
    setReason('');
    setUrgency('routine');
    setSummary('');
    setAvailableReports([]);
    setAvailablePrescriptions([]);
    setSelectedDocs([]);
    setDocsError(null);
    setConsentGranted(null);
  }, [isOpen]);

  // ---------------------------------------------------------------------------
  // Partnerships badge fetch
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isOpen) return;
    const fetchPartnerships = async () => {
      try {
        let res: any;
        if (contextOrgType === 'clinic') {
          res = await api.clinic.getPartnerships('active');
        } else if (contextOrgType === 'hospital') {
          res = await api.hospital.getPartnerships('active');
        } else if (contextOrgType === 'diagnostic_center') {
          res = await api.diagnosticCenter.getPartnerships('active');
        } else if (contextOrgType === 'pharmacy') {
          res = await api.pharmacy.getPartnerships('active');
        }
        if (res?.success && Array.isArray(res.data)) {
          const set = new Set<string>();
          res.data.forEach((p: any) => {
            if (p.target_id) set.add(p.target_id);
            if (p.initiator_id) set.add(p.initiator_id);
          });
          setPartnerships(set);
        }
      } catch {
        // Non-critical — badge simply won't appear
      }
    };
    fetchPartnerships();
  }, [isOpen, contextOrgType]);

  // ---------------------------------------------------------------------------
  // Step 1 — Patient search (P7.7 Server-side Paginated)
  // ---------------------------------------------------------------------------

  const fetchPatients = useCallback(async () => {
    if (!contextOrgType || !contextOrgId) return;
    try {
      setLoading(true);
      const res = await api.universalReferrals.searchPatients({
        senderType: contextOrgType,
        senderId: contextOrgId,
        q: debouncedPatientQuery,
        page: patientPage,
        limit: 10,
      });

      if (res?.success) {
        setPatients(Array.isArray(res.data) ? res.data : []);
        if (res.pagination) {
          setPatientTotalPages(res.pagination.totalPages || 1);
        }
      } else {
        setPatients([]);
        toast.error('Failed to load patients.');
      }
    } catch {
      setPatients([]);
      toast.error('Failed to load patients.');
    } finally {
      setLoading(false);
    }
  }, [contextOrgType, contextOrgId, debouncedPatientQuery, patientPage, toast]);

  // Auto-fetch patients when modal opens or dependencies change
  useEffect(() => {
    if (isOpen && step === 1 && contextOrgType && contextOrgId) {
      fetchPatients();
    }
  }, [isOpen, step, contextOrgType, contextOrgId, debouncedPatientQuery, patientPage, fetchPatients]);


  // ---------------------------------------------------------------------------
  // Step 2 — Provider search
  // ---------------------------------------------------------------------------

  const searchProviders = async () => {
    try {
      setLoading(true);
      setProviders([]);
      let res: any;
      if (receiverType === 'clinic') {
        res = await api.publicDiscovery.searchClinics(searchQuery);
      } else if (receiverType === 'hospital') {
        res = await api.publicDiscovery.searchHospitals(searchQuery);
      } else if (receiverType === 'diagnostic_center') {
        res = await api.publicDiscovery.searchDiagnosticCenters(searchQuery);
      } else if (receiverType === 'pharmacy') {
        res = await api.publicDiscovery.searchPharmacies(searchQuery);
      }

      let data = res?.success ? (res.data || []) : (Array.isArray(res) ? res : null);
      
      if (data) {
        // P7.8: Exclude the sender organization from appearing as a destination.
        // We use exact ID + type match. Receiver type is already in `receiverType`.
        if (contextOrgId && contextOrgType === receiverType) {
          data = data.filter((p: any) => p.id !== contextOrgId);
        }
        
        setProviders(data);
        if (!data.length) toast.error('No verified providers found.');
      } else {
        toast.error('Failed to search providers.');
      }
    } catch {
      toast.error('Failed to search providers.');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Step 4 — Load patient documents
  // ---------------------------------------------------------------------------

  const loadPatientDocuments = useCallback(async () => {
    if (!patientId || !contextOrgType || !contextOrgId) {
      setDocsError('Sender context is not available. Cannot fetch documents.');
      return;
    }
    try {
      setDocsLoading(true);
      setDocsError(null);
      const res: any = await api.universalReferrals.getPatientDocumentsForReferral(
        patientId,
        contextOrgType,
        contextOrgId
      );
      if (res?.success && res.data) {
        setAvailableReports(res.data.reports || []);
        setAvailablePrescriptions(res.data.prescriptions || []);
      } else {
        setDocsError(res?.message || 'Failed to load patient documents.');
      }
    } catch (e: any) {
      setDocsError(e?.message || 'Failed to load patient documents.');
    } finally {
      setDocsLoading(false);
    }
  }, [patientId, contextOrgType, contextOrgId]);

  // ---------------------------------------------------------------------------
  // Document selection helpers
  // ---------------------------------------------------------------------------

  const isReportSelected = (id: string) => selectedDocs.some((d) => d.report_id === id);
  const isPrescriptionSelected = (id: string) => selectedDocs.some((d) => d.prescription_id === id);

  const toggleReport = (report: ReferralDocument, checked: boolean) => {
    if (checked) {
      setSelectedDocs((prev) => [
        ...prev,
        {
          report_id: report.id,
          document_type: 'report',
          file_name: report.name || `Report ${report.id.slice(0, 8)}`,
        },
      ]);
    } else {
      setSelectedDocs((prev) => prev.filter((d) => d.report_id !== report.id));
    }
  };

  const togglePrescription = (rx: ReferralDocument, checked: boolean) => {
    if (checked) {
      setSelectedDocs((prev) => [
        ...prev,
        {
          prescription_id: rx.id,
          document_type: 'prescription',
          file_name: rx.prescription_number
            ? `Prescription #${rx.prescription_number}`
            : `Prescription ${rx.id.slice(0, 8)}`,
        },
      ]);
    } else {
      setSelectedDocs((prev) => prev.filter((d) => d.prescription_id !== rx.id));
    }
  };

  // ---------------------------------------------------------------------------
  // Step 5 — Consent
  // ---------------------------------------------------------------------------

  const verifyConsent = async () => {
    if (!patientId || !receiverId) return;
    setConsentGranted(null);
    setDraftReferralId(null);
    try {
      setLoading(true);
      
      const attachments: any[] = selectedDocs.map((d) => ({
        ...(d.report_id ? { report_id: d.report_id } : {}),
        ...(d.prescription_id ? { prescription_id: d.prescription_id } : {}),
        document_type: d.document_type,
        file_name: d.file_name,
      }));

      // Call draft endpoint to check and initialize the referral
      const res = await api.universalReferrals.createDraft({
        patient_id: patientId,
        sender_type: contextOrgType,
        sender_id: contextOrgId,
        receiver_type: receiverType,
        receiver_id: receiverId,
        reason,
        urgency,
        clinical_summary: summary,
        attachments,
      });

      if (res?.success && res.data) {
        setDraftReferralId((res.data as any).referralId);
        if ((res.data as any).hasConsent) {
          setConsentGranted(true);
        } else {
          setConsentGranted(false);
        }
      } else {
        setConsentGranted(false);
        toast.error(res?.message || 'Failed to initialize referral.');
      }
    } catch (e: any) {
      setConsentGranted(false);
      toast.error(e?.response?.data?.message || e?.message || 'Consent verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Send referral
  // ---------------------------------------------------------------------------

  const handleSend = async () => {
    if (!consentGranted) {
      toast.error('Patient consent is required to send this referral.');
      return;
    }
    if (!draftReferralId) {
      toast.error('Referral draft not found. Please verify consent again.');
      return;
    }
    try {
      setLoading(true);

      const res = await api.universalReferrals.submitReferral(draftReferralId);

      if (res.success) {
        toast.success('Referral created successfully');
        onSuccess?.();
        onClose();
      } else {
        toast.error(res.message || res.error || 'Failed to submit referral');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to submit referral');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Navigation guards
  // ---------------------------------------------------------------------------

  const handleNext = async () => {
    if (step === 1 && !patientId) return toast.error('Please select a patient');
    if (step === 2 && !receiverId) return toast.error('Please select a destination provider');
    if (step === 3 && !reason) return toast.error('Please provide a reason for the referral');

    // On entering the Medical Documents step, load docs if not already loaded
    if (step === 3) {
      setStep(4);
      loadPatientDocuments();
      return;
    }

    setStep((s) => s + 1);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">Create Universal Referral</h2>
        {contextOrgName && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4 font-medium">
            Sending as {contextOrgName}
          </p>
        )}

        <StepIndicator current={step} />

        <div className="space-y-4 text-gray-700 dark:text-gray-300">

          {/* ── Step 1: Patient ── */}
          {step === 1 && (
            <div>
              <h3 className="font-semibold mb-3">Select Patient</h3>
              
              {patientId ? (
                <div className="border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          {patients.find(p => p.id === patientId)?.name || 'Selected Patient'}
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {patients.find(p => p.id === patientId)?.phone || 'No phone'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setPatientId('');
                        setPatientSearchQuery('');
                      }} 
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium px-2 py-1"
                    >
                      Change Patient
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 relative">
                    <input
                      type="text"
                      placeholder="Search patients by name or phone..."
                      className="w-full p-2.5 pl-10 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                      value={patientSearchQuery}
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                      autoFocus
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {loading && (
                      <svg className="animate-spin w-4 h-4 text-gray-400 absolute right-3 top-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    )}
                  </div>

                  {loading ? (
                    <div className="text-center p-6 border rounded-lg bg-gray-50 dark:bg-gray-800/50 mt-2">
                      <p className="text-sm text-gray-500">Searching patients...</p>
                    </div>
                  ) : patients.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm mt-2">
                      <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
                        {patients.map((p) => (
                          <li key={p.id}>
                            <button
                              onClick={() => setPatientId(p.id)}
                              className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-300">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {p.name}{p.uhid ? ` (${p.uhid})` : ''}
                                </p>
                                {p.phone && <p className="text-sm text-gray-500 dark:text-gray-400">{p.phone}</p>}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                      
                      {patientTotalPages > 1 && (
                        <div className="flex justify-between items-center text-sm p-3 bg-gray-50 dark:bg-gray-700/30 border-t dark:border-gray-600">
                          <button
                            disabled={patientPage === 1 || loading}
                            onClick={() => setPatientPage(p => Math.max(1, p - 1))}
                            className="px-3 py-1 bg-white dark:bg-gray-600 border rounded shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-500"
                          >
                            Previous
                          </button>
                          <span className="text-gray-500 font-medium">
                            Page {patientPage} of {patientTotalPages}
                          </span>
                          <button
                            disabled={patientPage === patientTotalPages || loading}
                            onClick={() => setPatientPage(p => Math.min(patientTotalPages, p + 1))}
                            className="px-3 py-1 bg-white dark:bg-gray-600 border rounded shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-500"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  ) : debouncedPatientQuery.length > 0 ? (
                    <div className="text-center p-6 border border-dashed rounded-lg bg-gray-50 dark:bg-gray-800/50 mt-2">
                      <p className="text-sm text-gray-500">
                        No patients match your search.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center p-6 border border-dashed rounded-lg bg-gray-50 dark:bg-gray-800/50 mt-2">
                      <p className="text-sm text-gray-500">
                        No authorized patients found. You must have an existing patient relationship to create a referral.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Step 2: Destination ── */}
          {step === 2 && (
            <div>
              <h3 className="font-semibold mb-3">Select Destination Provider</h3>
              <select
                className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 mb-4"
                value={receiverType}
                onChange={(e) => {
                  setReceiverType(e.target.value);
                  setProviders([]);
                  setReceiverId('');
                }}
              >
                <option value="clinic">Clinic</option>
                <option value="hospital">Hospital</option>
                <option value="diagnostic_center">Diagnostic Center</option>
                <option value="pharmacy">Pharmacy</option>
              </select>

              <div className="flex gap-2 mb-4">
                <input
                  className="flex-1 p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder={`Search for a verified ${receiverType.replace('_', ' ')}…`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchProviders()}
                />
                <Button onClick={searchProviders} disabled={loading}>
                  {loading ? 'Searching…' : 'Search'}
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {providers.map((p) => {
                  const isTrusted = partnerships.has(p.id);
                  const isSelected = receiverId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setReceiverId(p.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {p.city ? `${p.city} • ` : ''}{p.address || ''}
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isTrusted
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}
                        >
                          {isTrusted ? '✓ Trusted Partner' : 'Verified'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {providers.length === 0 && !loading && searchQuery && (
                  <div className="text-center p-4 text-gray-500 border rounded-lg border-dashed">
                    No providers found. Try a different search term.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Clinical Context ── */}
          {step === 3 && (
            <div>
              <h3 className="font-semibold mb-3">Clinical Context</h3>
              <input
                className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 mb-3"
                placeholder="Reason for referral *"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <select
                className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 mb-3"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
              <textarea
                className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 min-h-[100px]"
                placeholder="Clinical summary (optional)"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
          )}

          {/* ── Step 4: Medical Documents ── */}
          {step === 4 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Medical Documents</h3>
                {selectedDocs.length > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
                    {selectedDocs.length} selected
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Select reports or prescriptions to attach to this referral. Attachments are optional.
                The receiver will only see documents you explicitly attach here.
              </p>

              {docsLoading && (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Loading authorized documents…
                </div>
              )}

              {docsError && !docsLoading && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 mb-3">
                  <p className="font-medium mb-1">Could not load documents</p>
                  <p>{docsError}</p>
                  <button
                    onClick={loadPatientDocuments}
                    className="mt-2 text-xs underline text-red-600 dark:text-red-400"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!docsLoading && !docsError && (
                <>
                  {/* Reports */}
                  {availableReports.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                        Reports ({availableReports.length})
                      </p>
                      <div className="space-y-1.5">
                        {availableReports.map((r) => (
                          <DocRow
                            key={r.id}
                            label={r.name || `${r.type || 'Report'} — ${r.id.slice(0, 8)}`}
                            sub={r.lab_name ? `Lab: ${r.lab_name}` : r.type || undefined}
                            date={r.test_date || r.result_date || r.created_at}
                            checked={isReportSelected(r.id)}
                            onChange={(v) => toggleReport(r, v)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prescriptions */}
                  {availablePrescriptions.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                        Prescriptions ({availablePrescriptions.length})
                      </p>
                      <div className="space-y-1.5">
                        {availablePrescriptions.map((rx) => (
                          <DocRow
                            key={rx.id}
                            label={
                              rx.prescription_number
                                ? `Prescription #${rx.prescription_number}`
                                : `Prescription — ${rx.id.slice(0, 8)}`
                            }
                            sub={rx.diagnosis || undefined}
                            date={rx.valid_from || rx.created_at}
                            checked={isPrescriptionSelected(rx.id)}
                            onChange={(v) => togglePrescription(rx, v)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {availableReports.length === 0 && availablePrescriptions.length === 0 && (
                    <div className="text-center py-6 text-gray-400 dark:text-gray-500 border rounded-lg border-dashed">
                      <p className="text-sm">No documents available for this patient.</p>
                      <p className="text-xs mt-1">You can continue without attachments.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Step 5: Consent & Send ── */}
          {step === 5 && (
            <div>
              <h3 className="font-semibold mb-3">Consent & Send</h3>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Patient</span>
                  <span className="font-medium">{patients.find((p) => p.id === patientId)?.name || patientId.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Destination</span>
                  <span className="font-medium">{providers.find((p) => p.id === receiverId)?.name || receiverType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Urgency</span>
                  <span className={`font-medium capitalize ${urgency === 'emergency' ? 'text-red-600' : urgency === 'urgent' ? 'text-amber-600' : 'text-gray-900 dark:text-white'}`}>{urgency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Attached Documents</span>
                  <span className="font-medium">{selectedDocs.length === 0 ? 'None' : `${selectedDocs.length} document${selectedDocs.length > 1 ? 's' : ''}`}</span>
                </div>
              </div>

              <div className="border rounded-lg p-4 mb-4">
                <p className="text-sm font-medium mb-2 text-red-600 dark:text-red-400">Patient Consent Required</p>
                <p className="text-xs text-gray-500 mb-3">
                  This referral requires explicit patient consent to share this patient's medical information with {providers.find((p) => p.id === receiverId)?.name || receiverType}.
                </p>
                <button
                  onClick={verifyConsent}
                  disabled={loading}
                  className="text-blue-500 underline text-sm disabled:opacity-50"
                >
                  {loading ? 'Checking...' : 'Check Patient Consent'}
                </button>
                {consentGranted === true && (
                  <p className="text-green-600 dark:text-green-400 text-sm mt-2">✓ Patient consent verified</p>
                )}
                {consentGranted === false && (
                  <p className="text-red-500 text-sm mt-2">Patient must grant consent from the Vaididea Patient App before this referral can be sent.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer navigation ── */}
        <div className="mt-6 flex justify-between gap-3 border-t pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            {step < 5 ? (
              <Button onClick={handleNext} disabled={loading || docsLoading}>
                {loading ? 'Loading…' : 'Next'}
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={loading || !consentGranted}
              >
                {loading ? 'Sending…' : 'Send Referral'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
