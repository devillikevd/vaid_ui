import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

async function fetchDoctor(id: string) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.vaididea.in';
    const res = await fetch(`${apiBase}/doctors/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const doc = await fetchDoctor(id);

  if (!doc) {
    return {
      title: 'Doctor Not Found | Vaididea',
      description: 'The requested doctor profile could not be found on Vaididea.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const name = doc.name || (doc.first_name ? `Dr. ${doc.first_name} ${doc.last_name || ''}`.trim() : 'Doctor');
  const specialty = doc.specialization || doc.department || 'Healthcare Specialist';
  const qualifications = doc.qualifications
    ? Array.isArray(doc.qualifications)
      ? ` (${doc.qualifications.join(', ')})`
      : ` (${doc.qualifications})`
    : '';

  const facility = doc.hospital_name || doc.clinic_name || (doc.hospital && doc.hospital.name) || '';
  const experienceYears = doc.experience_years ?? doc.experienceYears ?? doc.experience;

  const title = `Dr. ${name.replace(/^(Dr\.|Dr)\s+/i, '')}${qualifications} — ${specialty} | Vaididea`;
  
  let description = doc.bio ? doc.bio.slice(0, 160) : '';
  if (!description) {
    const details = [
      specialty,
      experienceYears ? `${experienceYears}+ years experience` : null,
      facility ? `practicing at ${facility}` : null,
    ].filter(Boolean).join(', ');
    description = `Book an in-person or video consultation with ${name}${details ? ` (${details})` : ''} on the Vaididea healthcare platform.`;
  }

  return {
    title,
    description,
    alternates: {
      canonical: `/doctors/${id}`,
    },
    openGraph: {
      title,
      description,
      url: `https://www.vaididea.in/doctors/${id}`,
      siteName: 'Vaididea',
      type: 'profile',
      images: doc.profile_image_url || doc.avatar_url ? [{ url: doc.profile_image_url || doc.avatar_url, alt: name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: doc.profile_image_url || doc.avatar_url ? [doc.profile_image_url || doc.avatar_url] : undefined,
    },
  };
}

/**
 * Safely serialises a plain JS object as JSON-LD text.
 *
 * JSON.stringify produces a valid JSON string.  The only characters that
 * could break out of a <script> tag in HTML are `<`, `>`, and `&`, so we
 * replace them with their Unicode escape equivalents.  This is the same
 * technique recommended by the OWASP XSS Prevention Cheat Sheet and used
 * internally by frameworks like Next.js for this exact purpose.
 *
 * No dangerouslySetInnerHTML is used – we pass the serialised string as a
 * React child (plain text node inside <script>), which React renders
 * without any HTML parsing, making it safe by construction.
 */
function buildJsonLdString(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export default async function DoctorDetailLayout({
  params,
  children,
}: {
  params: Promise<any>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const doc = await fetchDoctor(id);

  if (!doc) {
    notFound();
  }

  const rawName = doc.name || (doc.first_name ? `Dr. ${doc.first_name} ${doc.last_name || ''}`.trim() : 'Doctor');
  const name = rawName.startsWith('Dr.') || rawName.startsWith('Dr ') ? rawName : `Dr. ${rawName}`;
  const specialty = doc.specialization || doc.department || undefined;

  const graphItems: any[] = [
    {
      '@type': 'BreadcrumbList',
      '@id': `https://www.vaididea.in/doctors/${id}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home',         item: 'https://www.vaididea.in' },
        { '@type': 'ListItem', position: 2, name: 'Find Doctors', item: 'https://www.vaididea.in/doctors' },
        { '@type': 'ListItem', position: 3, name: name,           item: `https://www.vaididea.in/doctors/${id}` },
      ],
    },
  ];

  const physicianEntity: Record<string, any> = {
    '@type': 'Physician',
    '@id': `https://www.vaididea.in/doctors/${id}#physician`,
    name,
    url: `https://www.vaididea.in/doctors/${id}`,
    memberOf: { '@id': 'https://www.vaididea.in/#organization' },
  };

  const photo = doc.image || doc.avatar_url || doc.profile_photo || doc.photo_url;
  if (photo)                                physicianEntity.image           = photo;
  if (doc.bio)                              physicianEntity.description     = doc.bio;
  if (specialty)                            physicianEntity.medicalSpecialty = specialty;
  if (doc.qualifications) {
    physicianEntity.hasCredential = {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'degree',
      name: doc.qualifications,
    };
  }
  if (Array.isArray(doc.languages) && doc.languages.length > 0) {
    physicianEntity.knowsLanguage = doc.languages;
  } else if (typeof doc.languages === 'string' && doc.languages.trim()) {
    physicianEntity.knowsLanguage = doc.languages.split(',').map((l: string) => l.trim()).filter(Boolean);
  }

  const facilityName = doc.hospital_name || doc.clinic_name || doc.facility_name;
  if (facilityName) {
    physicianEntity.affiliation = {
      '@type': 'MedicalOrganization',
      name: facilityName,
      ...(doc.hospital_address || doc.clinic_address || doc.address
        ? { address: doc.hospital_address || doc.clinic_address || doc.address }
        : {}),
    };
  }

  graphItems.push(physicianEntity);

  const jsonLdString = buildJsonLdString({
    '@context': 'https://schema.org',
    '@graph': graphItems,
  });

  return (
    <>
      {/*
        We pass the serialised JSON-LD as a React text child of <script>.
        React renders text children of <script> as a raw text node (no HTML
        escaping applied by the browser to script content), which is both
        correct per the HTML spec and completely avoids dangerouslySetInnerHTML.
        Special characters are Unicode-escaped by buildJsonLdString so the
        string is safe even if it is ever moved into an HTML attribute context.
      */}
      <script type="application/ld+json">{jsonLdString}</script>
      {children}
    </>
  );
}
