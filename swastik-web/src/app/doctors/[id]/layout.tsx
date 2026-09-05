import type { Metadata } from 'next';

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
      title: 'Doctor Profile',
      description: 'Book verified doctor appointments and consultations on the Vaididea healthcare platform.',
      alternates: {
        canonical: `/doctors/${id}`,
      },
      openGraph: {
        title: 'Doctor Profile | Vaididea',
        description: 'Book verified doctor appointments and consultations on the Vaididea healthcare platform.',
        url: `https://www.vaididea.in/doctors/${id}`,
        siteName: 'Vaididea',
        type: 'profile',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Doctor Profile | Vaididea',
        description: 'Book verified doctor appointments and consultations on the Vaididea healthcare platform.',
      },
    };
  }

  const name = doc.name || (doc.first_name ? `Dr. ${doc.first_name} ${doc.last_name || ''}`.trim() : 'Doctor');
  const specialty = doc.specialization || doc.department || 'Healthcare Specialist';
  const qualifications = doc.qualifications ? ` (${doc.qualifications})` : '';

  const title = `${name}${qualifications} — ${specialty}`;
  const description = doc.bio
    ? doc.bio.slice(0, 160)
    : `Book an in-person or video consultation with ${name}, ${specialty} on the Vaididea healthcare network.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/doctors/${id}`,
    },
    openGraph: {
      title: `${title} | Vaididea`,
      description,
      url: `https://www.vaididea.in/doctors/${id}`,
      siteName: 'Vaididea',
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Vaididea`,
      description,
    },
  };
}

export default async function DoctorDetailLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const doc = await fetchDoctor(id);

  const name = doc
    ? doc.name || (doc.first_name ? `Dr. ${doc.first_name} ${doc.last_name || ''}`.trim() : 'Doctor')
    : 'Doctor Profile';
  const specialty = doc ? doc.specialization || doc.department || undefined : undefined;

  const graphItems: any[] = [
    {
      '@type': 'BreadcrumbList',
      '@id': `https://www.vaididea.in/doctors/${id}#breadcrumb`,
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'name': 'Home',
          'item': 'https://www.vaididea.in',
        },
        {
          '@type': 'ListItem',
          'position': 2,
          'name': 'Doctors',
          'item': 'https://www.vaididea.in/patient/doctors',
        },
        {
          '@type': 'ListItem',
          'position': 3,
          'name': name,
          'item': `https://www.vaididea.in/doctors/${id}`,
        },
      ],
    },
  ];

  if (doc) {
    const physicianEntity: Record<string, any> = {
      '@type': 'Physician',
      '@id': `https://www.vaididea.in/doctors/${id}#physician`,
      'name': name,
      'url': `https://www.vaididea.in/doctors/${id}`,
      'memberOf': {
        '@id': 'https://www.vaididea.in/#organization',
      },
    };

    const photo = doc.image || doc.avatar_url || doc.profile_photo || doc.photo_url;
    if (photo) {
      physicianEntity.image = photo;
    }

    if (doc.bio) {
      physicianEntity.description = doc.bio;
    }

    if (specialty) {
      physicianEntity.medicalSpecialty = specialty;
    }

    if (doc.qualifications) {
      physicianEntity.hasCredential = {
        '@type': 'EducationalOccupationalCredential',
        'credentialCategory': 'degree',
        'name': doc.qualifications,
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
        'name': facilityName,
        ...(doc.hospital_address || doc.clinic_address || doc.address
          ? {
              'address': doc.hospital_address || doc.clinic_address || doc.address,
            }
          : {}),
      };
    }

    graphItems.push(physicianEntity);
  }

  const doctorJsonLd = {
    '@context': 'https://schema.org',
    '@graph': graphItems,
  };

  const sanitizedDoctorJsonLd = JSON.stringify(doctorJsonLd).replace(/</g, '\\u003c');

  return (
    <>
      {/* nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml */}
      <script
        type="application/ld+json"
        // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
        dangerouslySetInnerHTML={{
          // nosemgrep
          __html: sanitizedDoctorJsonLd,
        }}
      />
      {children}
    </>
  );
}
