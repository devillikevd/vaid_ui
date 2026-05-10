'use client';

import HealthAlertsView from '@/components/outbreak/HealthAlertsView';
import { hospitalApi } from '@/lib/api';

export default function HospitalHealthAlertsPage() {
    return (
        <HealthAlertsView
            title="Hospital Health Intelligence"
            subtitle="Regional disease outbreaks and admission risk zones"
            accentColor="text-teal-600"
            fetchAlerts={hospitalApi.getOutbreakAlerts}
            fetchHeatmap={hospitalApi.getOutbreakHeatmap}
            fetchStats={hospitalApi.getOutbreakStats}
        />
    );
}
