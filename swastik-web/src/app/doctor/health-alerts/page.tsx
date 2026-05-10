'use client';

import HealthAlertsView from '@/components/outbreak/HealthAlertsView';
import { doctorApi } from '@/lib/api';

export default function DoctorHealthAlertsPage() {
    return (
        <HealthAlertsView
            title="Clinical Health Alerts"
            subtitle="Local disease outbreaks and active monitoring zones"
            accentColor="text-emerald-600"
            fetchAlerts={doctorApi.getOutbreakAlerts}
            fetchHeatmap={doctorApi.getOutbreakHeatmap}
            fetchStats={doctorApi.getOutbreakStats}
        />
    );
}
