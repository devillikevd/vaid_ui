'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { API_BASE_URL, getTokens } from '@/lib/api';
import {
  Activity,
  AlertTriangle,
  BadgeAlert,
  Calendar,
  ChevronDown,
  ChevronUp,
  Droplets,
  FileText,
  Heart,
  Loader2,
  Pill,
  Shield,
  Stethoscope,
  User,
} from 'lucide-react';

interface DoctorSummary {
  name: string;
  specialization: string | null;
}

interface PatientInfo {
  name: string;
  age: number | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  weight: number | null;
  height: number | null;
  allergies: string[];
  medicalConditions: string[];
  chronicConditions: string[];
  currentMedications: Array<string | Record<string, unknown>>;
  medicalHistory: Array<string | Record<string, unknown>>;
  insuranceProvider: string | null;
}

interface PrescriptionMedication {
  id?: string;
  medicine_name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  quantity?: number;
}

interface HealthPrescription {
  id: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  fileUrl?: string | null;
  medications: PrescriptionMedication[];
  doctor: DoctorSummary | null;
  chiefComplaint: string | null;
  consultationNotes: string | null;
}

interface ReportParameter {
  name?: string;
  value?: string | number;
  unit?: string;
}

interface HealthReport {
  id: string;
  name: string;
  type: string | null;
  labName: string | null;
  testDate: string | null;
  resultDate: string | null;
  status: string | null;
  doctorNotes: string | null;
  fileUrl?: string | null;
  parameters: ReportParameter[] | null;
}

interface VitalsRecord {
  heartRate?: number | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  temperature?: number | null;
  oxygenLevel?: number | null;
  respiratoryRate?: number | null;
  weight?: number | null;
  height?: number | null;
  bloodSugar?: number | null;
  notes?: string | null;
  recordedAt?: string | null;
}

interface ConsultationRecord {
  id: string;
  chiefComplaint: string | null;
  notes: string | null;
  diagnosis: string | string[] | null;
  advice: string | null;
  diagnosisCodes: string[] | null;
  followUpRequired: boolean | null;
  followUpDate: string | null;
  status: string | null;
  date: string | null;
  doctor: DoctorSummary | null;
}

interface SharingSource {
  label: string;
  source: string;
  reliability: string;
  included: boolean;
}

interface SharingDisclosure {
  scope: string;
  expiry: string;
  includedSources: SharingSource[];
  notIncluded: string[];
  privacyControls: string[];
}

interface HealthRecord {
  patient: PatientInfo;
  prescriptions: HealthPrescription[];
  reports: HealthReport[];
  vitals: VitalsRecord[];
  consultations: ConsultationRecord[];
  sharingDisclosure?: SharingDisclosure;
  generatedAt: string;
}

function formatDate(value?: string | null, includeTime = false) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return includeTime
    ? date.toLocaleString('en-IN')
    : date.toLocaleDateString('en-IN');
}

function formatStatusLabel(value?: string | null) {
  if (!value) return 'Unknown';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderValueBadge(value: string | Record<string, unknown>, index: number) {
  const text =
    typeof value === 'string'
      ? value
      : String(value.name || value.medicine_name || value.diagnosis || value.title || 'Recorded item');

  return (
    <span key={`${text}-${index}`} className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-700">
      {text}
    </span>
  );
}

function statusClasses(status?: string | null, active?: boolean) {
  const normalized = (status || '').toLowerCase();

  if (active === true || normalized === 'active' || normalized === 'normal' || normalized === 'completed' || normalized === 'verified') {
    return 'bg-green-100 text-green-700';
  }
  if (normalized === 'critical') {
    return 'bg-red-100 text-red-700';
  }
  if (normalized === 'abnormal' || normalized === 'pending' || normalized === 'under_review') {
    return 'bg-orange-100 text-orange-700';
  }
  return 'bg-gray-100 text-gray-600';
}

function HealthCardContent() {
  const params = useParams();
  const token = params.token as string;
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    profile: true,
    sharing: true,
    prescriptions: false,
    reports: false,
    vitals: false,
    consultations: false,
  });

  useEffect(() => {
    if (!token) return;

    const fetchRecord = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { accessToken } = getTokens();
        const response = await fetch(`${API_BASE_URL}/health-card/${token}`, {
          cache: 'no-store',
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });
        const payload = (await response.json()) as {
          success?: boolean;
          message?: string;
          data?: HealthRecord;
        };

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message || 'Failed to load health card');
        }

        setRecord(payload.data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Health card not found or expired';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchRecord();
  }, [token]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-purple-600" />
          <p className="mt-4 text-lg text-gray-600">Loading Health Card...</p>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">Health Card Unavailable</h1>
          <p className="text-gray-600">
            {error || 'This health card has expired or been revoked. Please ask the patient to generate a new QR code.'}
          </p>
          <div className="mt-6 rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">
              Powered by <span className="font-semibold text-purple-600">VAIDIDEA Healthcare</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const patient = record.patient;
  const bmi =
    patient.weight && patient.height
      ? (patient.weight / ((patient.height / 100) ** 2)).toFixed(1)
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <header className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="mb-1 flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-200" />
            <span className="text-sm font-medium text-purple-200">VAIDIDEA Digital Health Card</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
              {patient.name?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{patient.name}</h1>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-purple-100">
                {patient.age !== null && patient.age !== undefined && <span>{patient.age} yrs</span>}
                {patient.gender && <span>• {patient.gender}</span>}
                {patient.bloodGroup && <span>• {patient.bloodGroup}</span>}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-purple-200">
            Generated {formatDate(record.generatedAt, true)} • Valid for 24 hours
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        {patient.allergies.length > 0 && (
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <BadgeAlert className="h-5 w-5 text-red-600" />
              <h3 className="font-bold text-red-800">Allergies</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {patient.allergies.map((allergy) => (
                <span key={allergy} className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                  {allergy}
                </span>
              ))}
            </div>
          </div>
        )}

        <Section
          title="Patient Information"
          icon={<User className="h-5 w-5" />}
          sectionKey="profile"
          expanded={expandedSections.profile}
          onToggle={toggleSection}
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <InfoItem icon={<Calendar />} label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
            <InfoItem icon={<User />} label="Gender" value={patient.gender || 'N/A'} />
            <InfoItem icon={<Droplets />} label="Blood Group" value={patient.bloodGroup || 'N/A'} />
            <InfoItem icon={<Activity />} label="Weight" value={patient.weight ? `${patient.weight} kg` : 'N/A'} />
            <InfoItem icon={<Activity />} label="Height" value={patient.height ? `${patient.height} cm` : 'N/A'} />
            {bmi && <InfoItem icon={<Heart />} label="BMI" value={bmi} />}
            {patient.insuranceProvider && (
              <InfoItem icon={<Shield />} label="Insurance" value={patient.insuranceProvider} />
            )}
          </div>

          {patient.medicalConditions.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <p className="mb-1 text-sm font-medium text-gray-700">Medical Conditions</p>
              <div className="flex flex-wrap gap-2">
                {patient.medicalConditions.map((condition) => (
                  <span key={condition} className="rounded-lg bg-orange-50 px-2 py-1 text-xs text-orange-700">
                    {condition}
                  </span>
                ))}
              </div>
            </div>
          )}

          {patient.chronicConditions.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <p className="mb-1 text-sm font-medium text-gray-700">Chronic Conditions</p>
              <div className="flex flex-wrap gap-2">
                {patient.chronicConditions.map((condition) => (
                  <span key={condition} className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700">
                    {condition}
                  </span>
                ))}
              </div>
            </div>
          )}

          {patient.currentMedications.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <p className="mb-1 text-sm font-medium text-gray-700">Current Medications</p>
              <div className="flex flex-wrap gap-2">
                {patient.currentMedications.map(renderValueBadge)}
              </div>
            </div>
          )}

          {patient.medicalHistory.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <p className="mb-1 text-sm font-medium text-gray-700">Medical History</p>
              <div className="flex flex-wrap gap-2">
                {patient.medicalHistory.map(renderValueBadge)}
              </div>
            </div>
          )}
        </Section>

        {record.sharingDisclosure && (
          <Section
            title="Sharing & Reliability"
            icon={<Shield className="h-5 w-5" />}
            sectionKey="sharing"
            expanded={expandedSections.sharing}
            onToggle={toggleSection}
          >
            <div className="space-y-3">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                <p className="font-medium">{record.sharingDisclosure.scope}</p>
                <p className="mt-1 text-xs text-blue-700">Expiry: {record.sharingDisclosure.expiry}</p>
              </div>

              <div className="space-y-2">
                {record.sharingDisclosure.includedSources.map((source) => (
                  <div key={source.label} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-gray-800">{source.label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${source.included ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {source.included ? 'Included' : 'Not included'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Source: {source.source}</p>
                    <p className="mt-1 text-xs text-gray-600">Reliability: {source.reliability}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-medium text-gray-800">Not included</p>
                  <ul className="space-y-1 text-xs text-gray-600">
                    {record.sharingDisclosure.notIncluded.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-medium text-gray-800">Privacy controls</p>
                  <ul className="space-y-1 text-xs text-gray-600">
                    {record.sharingDisclosure.privacyControls.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Section>
        )}

        <Section
          title={`Prescriptions (${record.prescriptions.length})`}
          icon={<Pill className="h-5 w-5" />}
          sectionKey="prescriptions"
          expanded={expandedSections.prescriptions}
          onToggle={toggleSection}
        >
          {record.prescriptions.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No prescriptions found</p>
          ) : (
            <div className="space-y-3">
              {record.prescriptions.map((prescription) => (
                <div key={prescription.id} className="rounded-lg border p-3 transition-colors hover:bg-gray-50">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">
                      {prescription.chiefComplaint || prescription.notes || 'Prescription'}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusClasses(undefined, prescription.isActive)}`}>
                      {prescription.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {prescription.doctor && (
                    <p className="text-xs text-purple-600">
                      Dr. {prescription.doctor.name}
                      {prescription.doctor.specialization ? ` • ${prescription.doctor.specialization}` : ''}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">{formatDate(prescription.createdAt)}</p>
                  {prescription.medications.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {prescription.medications.map((medication, index) => (
                        <div key={`${prescription.id}-${index}`} className="rounded bg-purple-50 p-2 text-xs">
                          <span className="font-medium text-purple-800">
                            {medication.medicine_name || 'Medicine'}
                          </span>
                          {(medication.dosage || medication.frequency || medication.duration) && (
                            <span className="text-purple-600">
                              {' '}
                              — {[medication.dosage, medication.frequency, medication.duration]
                                .filter(Boolean)
                                .join(' • ')}
                            </span>
                          )}
                          {medication.instructions && (
                            <div className="mt-1 text-purple-700">{medication.instructions}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {prescription.consultationNotes && (
                    <p className="mt-2 text-sm text-gray-600">{prescription.consultationNotes}</p>
                  )}
                  {prescription.fileUrl && (
                    <div className="mt-3">
                      <a
                        href={prescription.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        <FileText className="h-4 w-4" />
                        View Prescription File
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section
          title={`Medical Reports (${record.reports.length})`}
          icon={<FileText className="h-5 w-5" />}
          sectionKey="reports"
          expanded={expandedSections.reports}
          onToggle={toggleSection}
        >
          {record.reports.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No reports found</p>
          ) : (
            <div className="space-y-3">
              {record.reports.map((report) => (
                <div key={report.id} className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{report.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusClasses(report.status)}`}>
                      {formatStatusLabel(report.status || 'pending')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>{formatStatusLabel(report.type || 'report')}</span>
                    {report.labName && <span>• {report.labName}</span>}
                    {report.testDate && <span>• Tested {formatDate(report.testDate)}</span>}
                    {report.resultDate && <span>• Result {formatDate(report.resultDate)}</span>}
                  </div>
                  {report.doctorNotes && <p className="mt-2 text-sm text-gray-700">{report.doctorNotes}</p>}
                  {Array.isArray(report.parameters) && report.parameters.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {report.parameters.slice(0, 6).map((parameter, index) => (
                        <div key={`${report.id}-${index}`} className="rounded bg-gray-50 p-1.5 text-xs">
                          <span className="text-gray-500">{parameter.name || 'Parameter'}: </span>
                          <span className="font-medium">
                            {[parameter.value, parameter.unit].filter(Boolean).join(' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {report.fileUrl && (
                    <div className="mt-3 border-t pt-3">
                      <a
                        href={report.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        <FileText className="h-4 w-4" />
                        View Full Report
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section
          title={`Vitals History (${record.vitals.length})`}
          icon={<Activity className="h-5 w-5" />}
          sectionKey="vitals"
          expanded={expandedSections.vitals}
          onToggle={toggleSection}
        >
          {record.vitals.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No vitals recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-2 py-2 text-left">Date</th>
                    <th className="px-2 py-2">BP</th>
                    <th className="px-2 py-2">HR</th>
                    <th className="px-2 py-2">SpO₂</th>
                    <th className="px-2 py-2">Temp</th>
                    <th className="px-2 py-2">Sugar</th>
                  </tr>
                </thead>
                <tbody>
                  {record.vitals.slice(0, 10).map((vital, index) => (
                    <tr key={`${vital.recordedAt || 'vital'}-${index}`} className="border-b last:border-0">
                      <td className="px-2 py-2 text-gray-600">{formatDate(vital.recordedAt)}</td>
                      <td className="px-2 py-2 text-center font-medium">
                        {vital.bpSystolic && vital.bpDiastolic ? `${vital.bpSystolic}/${vital.bpDiastolic}` : '-'}
                      </td>
                      <td className="px-2 py-2 text-center">{vital.heartRate || '-'}</td>
                      <td className="px-2 py-2 text-center">
                        {vital.oxygenLevel ? `${vital.oxygenLevel}%` : '-'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {vital.temperature ? `${vital.temperature}°` : '-'}
                      </td>
                      <td className="px-2 py-2 text-center">{vital.bloodSugar || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section
          title={`Consultation History (${record.consultations.length})`}
          icon={<Stethoscope className="h-5 w-5" />}
          sectionKey="consultations"
          expanded={expandedSections.consultations}
          onToggle={toggleSection}
        >
          {record.consultations.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No consultations found</p>
          ) : (
            <div className="space-y-3">
              {record.consultations.map((consultation) => (
                <div key={consultation.id} className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">
                      {consultation.chiefComplaint || 'General Consultation'}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(consultation.date)}</span>
                  </div>
                  {consultation.doctor && (
                    <p className="text-xs text-purple-600">
                      Dr. {consultation.doctor.name}
                      {consultation.doctor.specialization ? ` • ${consultation.doctor.specialization}` : ''}
                    </p>
                  )}
                  {consultation.diagnosis && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Diagnosis</p>
                      <p className="text-sm">
                        {Array.isArray(consultation.diagnosis)
                          ? consultation.diagnosis.join(', ')
                          : consultation.diagnosis}
                      </p>
                    </div>
                  )}
                  {consultation.notes && (
                    <p className="mt-1 text-xs text-gray-600">
                      <span className="font-medium">Notes:</span> {consultation.notes}
                    </p>
                  )}
                  {consultation.advice && (
                    <p className="mt-1 text-xs text-gray-600">
                      <span className="font-medium">Advice:</span> {consultation.advice}
                    </p>
                  )}
                  {consultation.followUpRequired && consultation.followUpDate && (
                    <p className="mt-1 text-xs text-blue-600">Follow-up: {formatDate(consultation.followUpDate)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        <div className="py-6 text-center">
          <p className="text-xs text-gray-400">
            This time-limited clinical summary was generated by the patient using{' '}
            <span className="font-semibold text-purple-500">VAIDIDEA Healthcare</span>.
            <br />
            Data is read-only and automatically expires in 24 hours.
          </p>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  icon,
  sectionKey,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: ReactNode;
  sectionKey: string;
  expanded: boolean;
  onToggle: (key: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <button
        onClick={() => onToggle(sectionKey)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-2 text-gray-800">
          <span className="text-purple-600">{icon}</span>
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-4 w-4 text-gray-400">{icon}</span>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
}

export default function HealthCardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
          <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
        </div>
      }
    >
      <HealthCardContent />
    </Suspense>
  );
}
