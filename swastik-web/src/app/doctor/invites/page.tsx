import { redirect } from 'next/navigation';

export default function DoctorInvitesPage() {
    // Redirect to the unified Care Networks workspace, specifically opening the Invitations tab
    redirect('/doctor/care-networks?tab=invitations');
}
