import { redirect } from 'next/navigation';

export default function MyHospitalsPage() {
    // Redirect to the new unified Care Networks workspace
    redirect('/doctor/care-networks?tab=hospitals');
}
