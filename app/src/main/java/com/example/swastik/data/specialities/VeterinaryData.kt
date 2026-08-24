package com.example.swastik.data.specialities

val veterinaryData = SpecialityDetailData(
    id = "veterinary",
    title = "Veterinarian (Pet & Animal Care)",
    subtitle = "Veterinary Doctor, Pet Health, Vaccinations & Animal Surgery (BVSc & AH)",
    heroDescription = "Consult certified veterinarians for your dogs, cats, and pets — providing health checkups, puppy vaccination schedules, skin & tick treatments, dietary advice, and emergency pet care.",
    trustBadges = listOf(
        "🐾 Pet & Animal Healthcare",
        "⚡ Dog, Cat & Exotic Pet Care",
        "🛡️ 100% Verified BVSc & AH / MVSc Vets"
    ),
    aboutDescription = "A Veterinarian (Veterinary Physician) is a licensed animal healthcare professional dedicated to diagnosing, treating, and preventing illnesses, injuries, and diseases in pets, domestic animals, and livestock through clinical medicine, surgery, and preventive vaccination.",
    symptoms = listOf(
        SpecialitySymptom("🐶", "Loss of Appetite & Lethargy", "Pet refusing food, skipping meals for >24 hours, sleeping excessively, or showing low energy"),
        SpecialitySymptom("🤮", "Vomiting & Loose Stools", "Repeated vomiting episodes, diarrhea, dehydration, or blood in pet stool"),
        SpecialitySymptom("🪲", "Itching, Ticks & Flea Infestation", "Excessive scratching, biting paws, hair loss patches (mange), ticks, or red skin rashes"),
        SpecialitySymptom("💉", "Vaccination & Deworming Due", "Puppy/kitten core vaccine schedules (Rabies, DHPPi, Tricat) and routine deworming"),
        SpecialitySymptom("👂", "Ear Scratching & Head Shaking", "Foul odor from ears, brown wax discharge, or ear mite irritation"),
        SpecialitySymptom("🐕", "Limping & Joint Pain in Dogs", "Difficulty standing up, limping on legs, hip dysplasia signs, or reluctance to walk")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "💉 Preventive & Wellness Pet Care",
            items = listOf(
                "Puppy & Kitten Core Immunization Protocols",
                "Routine Deworming & Tick/Flea Prevention",
                "Pet Microchipping & Health Passport Certification",
                "Senior Pet Geriatric Checkups"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🪲 Dermatology & Parasitic Infections",
            items = listOf(
                "Fungal & Bacterial Dermatitis in Pets",
                "Sarcoptic & Demodectic Mange (Mites)",
                "Tick Fever (Ehrlichiosis / Babesiosis) Screening",
                "Food Allergy & Itchy Coat Management"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🍲 Clinical Pet Nutrition & Digestion",
            items = listOf(
                "Canine & Feline Gastrointestinal Colic",
                "Parvovirus & Viral Enteritis Supportive Care",
                "Breed-Specific Calibrated Nutrition Plans",
                "Obesity & Weight Control in House Pets"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Veterinary Surgery & Dental Care",
            items = listOf(
                "Spaying & Neutering (Sterilization Guidance)",
                "Dental Scaling & Tartar Care for Dogs/Cats",
                "Wound Suture, Abscess & Fracture First-Aid",
                "Orthopedic Hip Dysplasia & Arthritis Care"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Pet History & Breed Profile", "Discussion of pet breed, age, weight, vaccination history, diet brand, and symptom onset."),
        SpecialityConsultationStep("2", "Visual Examination & Video Triage", "Observing pet demeanor, skin coat, breathing pattern, gait, and gum color on video call."),
        SpecialityConsultationStep("3", "Medication & Care Prescription", "Prescribing veterinary-grade antibiotics, antiparasitics, ear drops, pain relievers, and diet charts."),
        SpecialityConsultationStep("4", "Home Nursing & Follow-up Guide", "Clear instructions on medication administration, wound dressing, hydration, and recovery checks.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "What essential vaccinations do puppies and kittens need?",
            answer = "Puppies require the DHPPi (Distemper, Hepatitis, Parvovirus, Parainfluenza) starting at 6-8 weeks, followed by boosters and the Anti-Rabies Vaccine (ARV) at 3 months. Kittens require Tricat/FVRCP and Anti-Rabies vaccines."
        ),
        SpecialityFaqItem(
            question = "How often should pets be dewormed and treated for ticks?",
            answer = "Puppies and kittens should be dewormed every 2 weeks until 3 months of age, then monthly until 6 months, and once every 3 months as adults. Spot-on or oral tick preventatives should be administered monthly."
        ),
        SpecialityFaqItem(
            question = "Can human medications (like Paracetamol or Ibuprofen) be given to dogs or cats?",
            answer = "NEVER give human painkillers like Paracetamol, Ibuprofen, or Aspirin to dogs or cats. They are highly toxic and can cause fatal liver and kidney failure. Always consult a veterinarian for pet-safe medications."
        ),
        SpecialityFaqItem(
            question = "What should I have ready for a video consultation with a vet?",
            answer = "Have your pet nearby in a well-lit room, your pet's vaccination card, notes on their current food brand, and photos/videos of the problem area (stool, vomit, or skin lesion)."
        )
    )
)
