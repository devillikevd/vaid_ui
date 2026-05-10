'use client';

import HealthAlertsView from '@/components/outbreak/HealthAlertsView';
import { clinicApi } from '@/lib/api';

export default function ClinicHealthAlertsPage() {
    return (
        <HealthAlertsView
            title="Clinic Health Intelligence"
            subtitle="Local disease outbreaks and patient risk zones"
            accentColor="text-pink-600"
            fetchAlerts={clinicApi.getOutbreakAlerts}
            fetchHeatmap={clinicApi.getOutbreakHeatmap}
            fetchStats={clinicApi.getOutbreakStats}
        />
    );
}
