import os

strings = {
    'hi': """
    <string name="flight_ticket_boarding_pass">बोर्डिंग पास</string>
    <string name="flight_ticket_flight">उड़ान</string>
    <string name="flight_ticket_seat">सीट</string>
    <string name="flight_ticket_swastik_air">स्वास्तिक एयर</string>
    <string name="empty_records_title">कोई रिकॉर्ड नहीं मिला</string>
    <string name="empty_records_desc">आपने अभी तक कोई मेडिकल रिकॉर्ड या प्रिस्क्रिप्शन अपलोड नहीं किया है।</string>
    <string name="empty_appointments_title">अभी तक कोई अपॉइंटमेंट नहीं</string>
    <string name="empty_appointments_desc">आपके आगामी अपॉइंटमेंट बुक करने के बाद यहां दिखाई देंगे।</string>
    <string name="empty_notifications_title">सब कुछ देख लिया!</string>
    <string name="empty_notifications_desc">आपके पास इस समय कोई नया नोटिफिकेशन नहीं है।</string>
    <string name="add_record_button">रिकॉर्ड जोड़ें</string>
    <string name="book_appointment_button">अपॉइंटमेंट बुक करें</string>
    <string name="book_now">अभी बुक करें</string>
    <string name="instant">तुरंत</string>
    <string name="video">वीडियो</string>
    <string name="connect_with_doctors_online">डॉक्टरों से ऑनलाइन जुड़ें</string>
    <string name="search_doctors_specialist">डॉक्टर खोजें</string>
    <string name="most_searched_specialities">सबसे ज्यादा खोजी गई विशेषज्ञताएं</string>
    <string name="view_all_specialities">सभी विशेषज्ञताएं देखें</string>
    <string name="surgery_conditions">सर्जरी से इलाज की जाने वाली स्थितियां</string>
    <string name="common_symptoms">सबसे आम लक्षण</string>
    <string name="book_doctor_by_speciality">विशेषज्ञता से डॉक्टर खोजें</string>
    <string name="all_specialities">सभी विशेषज्ञताएं</string>
    <string name="search_doctors">डॉक्टरों को खोजें…</string>
    <string name="doctors_available">उपलब्ध डॉक्टर</string>
    <string name="no_doctors_found">कोई डॉक्टर नहीं मिला।</string>
    <string name="try_adjusting_filters">अपने फिल्टर या खोज को बदलने का प्रयास करें।</string>
    <string name="book_clinic_visit">क्लिनिक विजिट बुक करें</string>
    <string name="book_video_consult">वीडियो कंसल्ट बुक करें</string>
    <string name="next_available_at">अगला उपलब्ध समय</string>
    <string name="select_date_time">दिनांक और समय चुनें</string>
    <string name="clinic_visit">क्लिनिक विजिट</string>
    <string name="video_consult">वीडियो कंसल्ट</string>
    <string name="select_date">दिनांक चुनें</string>
    <string name="select_time">समय चुनें</string>
    <string name="fee">फीस</string>
    <string name="consultation_type">परामर्श का प्रकार</string>
    <string name="booking_ellipsis">बुकिंग हो रही है…</string>
    <string name="in_person_consultation_desc">इन-पर्सन परामर्श — आस-पास के डॉक्टर खोजें</string>
    <string name="video_consultation_desc">वीडियो परामर्श — डॉक्टरों से ऑनलाइन जुड़ें</string>
    <string name="learn_how_to_book">अपॉइंटमेंट बुक करना सीखें</string>
    <string name="search_symptoms_specialities">लक्षण / विशेषज्ञताएं खोजें</string>
""",
    'mr': """
    <string name="flight_ticket_boarding_pass">बोर्डिंग पास</string>
    <string name="flight_ticket_flight">फ्लाइट</string>
    <string name="flight_ticket_seat">सीट</string>
    <string name="flight_ticket_swastik_air">स्वास्तिक एअर</string>
    <string name="empty_records_title">कोणतेही रेकॉर्ड आढळले नाहीत</string>
    <string name="empty_records_desc">तुम्ही अद्याप कोणतेही वैद्यकीय रेकॉर्ड किंवा प्रिस्क्रिप्शन अपलोड केलेले नाही.</string>
    <string name="empty_appointments_title">अद्याप कोणतीही अपॉइंटमेंट नाही</string>
    <string name="empty_appointments_desc">तुमच्या आगामी अपॉइंटमेंट बुक केल्यानंतर येथे दिसतील.</string>
    <string name="empty_notifications_title">सर्व पाहिले!</string>
    <string name="empty_notifications_desc">तुमच्याकडे सध्या कोणतीही नवीन सूचना नाही.</string>
    <string name="add_record_button">रेकॉर्ड जोडा</string>
    <string name="book_appointment_button">अपॉइंटमेंट बुक करा</string>
    <string name="book_now">आता बुक करा</string>
    <string name="instant">त्वरित</string>
    <string name="video">व्हिडिओ</string>
    <string name="connect_with_doctors_online">डॉक्टरांशी ऑनलाइन संपर्क साधा</string>
    <string name="search_doctors_specialist">डॉक्टर शोधा</string>
    <string name="most_searched_specialities">सर्वाधिक शोधल्या गेलेल्या स्पेशालिटी</string>
    <string name="view_all_specialities">सर्व स्पेशालिटी पहा</string>
    <string name="surgery_conditions">शस्त्रक्रियेद्वारे उपचार करण्यायोग्य स्थिती</string>
    <string name="common_symptoms">सर्वाधिक सामान्य लक्षणे</string>
    <string name="book_doctor_by_speciality">स्पेशालिटीनुसार डॉक्टर शोधा</string>
    <string name="all_specialities">सर्व स्पेशालिटी</string>
    <string name="search_doctors">डॉक्टर शोधा…</string>
    <string name="doctors_available">डॉक्टर उपलब्ध</string>
    <string name="no_doctors_found">कोणतेही डॉक्टर आढळले नाहीत.</string>
    <string name="try_adjusting_filters">तुमचे फिल्टर किंवा शोध बदलून पहा.</string>
    <string name="book_clinic_visit">क्लिनिक भेट बुक करा</string>
    <string name="book_video_consult">व्हिडिओ कन्सल्ट बुक करा</string>
    <string name="next_available_at">पुढील उपलब्ध वेळ</string>
    <string name="select_date_time">तारीख आणि वेळ निवडा</string>
    <string name="clinic_visit">क्लिनिक भेट</string>
    <string name="video_consult">व्हिडिओ कन्सल्ट</string>
    <string name="select_date">तारीख निवडा</string>
    <string name="select_time">वेळ निवडा</string>
    <string name="fee">फी</string>
    <string name="consultation_type">कन्सल्टेशनचा प्रकार</string>
    <string name="booking_ellipsis">बुकिंग होत आहे…</string>
    <string name="in_person_consultation_desc">प्रत्यक्ष कन्सल्टेशन — जवळचे डॉक्टर शोधा</string>
    <string name="video_consultation_desc">व्हिडिओ कन्सल्टेशन — डॉक्टरांशी ऑनलाइन संपर्क साधा</string>
    <string name="learn_how_to_book">अपॉइंटमेंट कशी बुक करायची ते शिका</string>
    <string name="search_symptoms_specialities">लक्षणे / स्पेशालिटी शोधा</string>
""",
    'bn': """
    <string name="flight_ticket_boarding_pass">বোর্ডিং পাস</string>
    <string name="flight_ticket_flight">ফ্লাইট</string>
    <string name="flight_ticket_seat">আসন</string>
    <string name="flight_ticket_swastik_air">স্বস্তিক এয়ার</string>
    <string name="empty_records_title">কোনো রেকর্ড পাওয়া যায়নি</string>
    <string name="empty_records_desc">আপনি এখনও কোনো মেডিকেল রেকর্ড বা প্রেসক্রিপশন আপলোড করেননি।</string>
    <string name="empty_appointments_title">এখনও কোনো অ্যাপয়েন্টমেন্ট নেই</string>
    <string name="empty_appointments_desc">আপনার আসন্ন অ্যাপয়েন্টমেন্টগুলি বুক করার পরে এখানে প্রদর্শিত হবে।</string>
    <string name="empty_notifications_title">সব দেখা হয়েছে!</string>
    <string name="empty_notifications_desc">এই মুহূর্তে আপনার কোনো নতুন বিজ্ঞপ্তি নেই।</string>
    <string name="add_record_button">রেকর্ড যোগ করুন</string>
    <string name="book_appointment_button">অ্যাপয়েন্টমেন্ট বুক করুন</string>
    <string name="book_now">এখন বুক করুন</string>
    <string name="instant">তাৎক্ষণিক</string>
    <string name="video">ভিডিও</string>
    <string name="connect_with_doctors_online">অনলাইনে ডাক্তারদের সাথে যুক্ত হন</string>
    <string name="search_doctors_specialist">ডাক্তার খুঁজুন</string>
    <string name="most_searched_specialities">সবচেয়ে বেশি খোঁজা বিশেষজ্ঞ</string>
    <string name="view_all_specialities">সব বিশেষজ্ঞ দেখুন</string>
    <string name="surgery_conditions">যে অবস্থাগুলোর চিকিৎসা সার্জারির মাধ্যমে হয়</string>
    <string name="common_symptoms">সবচেয়ে সাধারণ লক্ষণ</string>
    <string name="book_doctor_by_speciality">বিশেষজ্ঞ অনুযায়ী ডাক্তার খুঁজুন</string>
    <string name="all_specialities">সব বিশেষজ্ঞ</string>
    <string name="search_doctors">ডাক্তার খুঁজুন…</string>
    <string name="doctors_available">ডাক্তার উপলব্ধ</string>
    <string name="no_doctors_found">কোনো ডাক্তার পাওয়া যায়নি।</string>
    <string name="try_adjusting_filters">আপনার ফিল্টার বা অনুসন্ধান পরিবর্তন করার চেষ্টা করুন।</string>
    <string name="book_clinic_visit">ক্লিনিক ভিজিট বুক করুন</string>
    <string name="book_video_consult">ভিডিও কনসাল্ট বুক করুন</string>
    <string name="next_available_at">পরবর্তী উপলব্ধ সময়</string>
    <string name="select_date_time">তারিখ এবং সময় নির্বাচন করুন</string>
    <string name="clinic_visit">ক্লিনিক ভিজিট</string>
    <string name="video_consult">ভিডিও কনসাল্ট</string>
    <string name="select_date">তারিখ নির্বাচন করুন</string>
    <string name="select_time">সময় নির্বাচন করুন</string>
    <string name="fee">ফি</string>
    <string name="consultation_type">পরামর্শের ধরণ</string>
    <string name="booking_ellipsis">বুকিং হচ্ছে…</string>
    <string name="in_person_consultation_desc">সরাসরি পরামর্শ — কাছাকাছি ডাক্তার খুঁজুন</string>
    <string name="video_consultation_desc">ভিডিও পরামর্শ — অনলাইনে ডাক্তারদের সাথে যুক্ত হন</string>
    <string name="learn_how_to_book">কীভাবে অ্যাপয়েন্টমেন্ট বুক করতে হয় তা শিখুন</string>
    <string name="search_symptoms_specialities">লক্ষণ / বিশেষজ্ঞ খুঁজুন</string>
""",
    'kn': """
    <string name="flight_ticket_boarding_pass">ಬೋರ್ಡಿಂಗ್ ಪಾಸ್</string>
    <string name="flight_ticket_flight">ಫ್ಲೈಟ್</string>
    <string name="flight_ticket_seat">ಸೀಟ್</string>
    <string name="flight_ticket_swastik_air">ಸ್ವಸ್ತಿಕ್ ಏರ್</string>
    <string name="empty_records_title">ಯಾವುದೇ ದಾಖಲೆಗಳಿಲ್ಲ</string>
    <string name="empty_records_desc">ನೀವು ಇನ್ನೂ ಯಾವುದೇ ವೈದ್ಯಕೀಯ ದಾಖಲೆ ಅಥವಾ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಅಪ್ಲೋಡ್ ಮಾಡಿಲ್ಲ.</string>
    <string name="empty_appointments_title">ಇನ್ನೂ ಯಾವುದೇ ಅಪಾಯಿಂಟ್ಮೆಂಟ್ ಇಲ್ಲ</string>
    <string name="empty_appointments_desc">ನಿಮ್ಮ ಮುಂದಿನ ಅಪಾಯಿಂಟ್ಮೆಂಟ್‌ಗಳು ಬುಕ್ ಮಾಡಿದ ನಂತರ ಇಲ್ಲಿ ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತವೆ.</string>
    <string name="empty_notifications_title">ಎಲ್ಲವನ್ನೂ ನೋಡಲಾಗಿದೆ!</string>
    <string name="empty_notifications_desc">ಈ ಸಮಯದಲ್ಲಿ ನಿಮಗೆ ಯಾವುದೇ ಹೊಸ ನೋಟಿಫಿಕೇಶನ್‌ಗಳಿಲ್ಲ.</string>
    <string name="add_record_button">ದಾಖಲೆ ಸೇರಿಸಿ</string>
    <string name="book_appointment_button">ಅಪಾಯಿಂಟ್ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ</string>
    <string name="book_now">ಈಗ ಬುಕ್ ಮಾಡಿ</string>
    <string name="instant">ತಕ್ಷಣ</string>
    <string name="video">ವಿಡಿಯೋ</string>
    <string name="connect_with_doctors_online">ವೈದ್ಯರೊಂದಿಗೆ ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಸಂಪರ್ಕ ಸಾಧಿಸಿ</string>
    <string name="search_doctors_specialist">ವೈದ್ಯರನ್ನು ಹುಡುಕಿ</string>
    <string name="most_searched_specialities">ಹೆಚ್ಚು ಹುಡುಕಲಾದ ಸ್ಪೆಷಾಲಿಟಿಗಳು</string>
    <string name="view_all_specialities">ಎಲ್ಲಾ ಸ್ಪೆಷಾಲಿಟಿಗಳನ್ನು ವೀಕ್ಷಿಸಿ</string>
    <string name="surgery_conditions">ಶಸ್ತ್ರಚಿಕಿತ್ಸೆಯಿಂದ ಚಿಕಿತ್ಸೆ ನೀಡಬಹುದಾದ ಸ್ಥಿತಿಗಳು</string>
    <string name="common_symptoms">ಅತ್ಯಂತ ಸಾಮಾನ್ಯ ರೋಗಲಕ್ಷಣಗಳು</string>
    <string name="book_doctor_by_speciality">ಸ್ಪೆಷಾಲಿಟಿ ಮೂಲಕ ವೈದ್ಯರನ್ನು ಹುಡುಕಿ</string>
    <string name="all_specialities">ಎಲ್ಲಾ ಸ್ಪೆಷಾಲಿಟಿಗಳು</string>
    <string name="search_doctors">ವೈದ್ಯರನ್ನು ಹುಡುಕಿ…</string>
    <string name="doctors_available">ವೈದ್ಯರು ಲಭ್ಯ</string>
    <string name="no_doctors_found">ಯಾವುದೇ ವೈದ್ಯರು ಕಂಡುಬಂದಿಲ್ಲ.</string>
    <string name="try_adjusting_filters">ನಿಮ್ಮ ಫಿಲ್ಟರ್ ಅಥವಾ ಹುಡುಕಾಟವನ್ನು ಬದಲಾಯಿಸಲು ಪ್ರಯತ್ನಿಸಿ.</string>
    <string name="book_clinic_visit">ಕ್ಲಿನಿಕ್ ಭೇಟಿ ಬುಕ್ ಮಾಡಿ</string>
    <string name="book_video_consult">ವಿಡಿಯೋ ಕನ್ಸಲ್ಟ್ ಬುಕ್ ಮಾಡಿ</string>
    <string name="next_available_at">ಮುಂದಿನ ಲಭ್ಯವಿರುವ ಸಮಯ</string>
    <string name="select_date_time">ದಿನಾಂಕ ಮತ್ತು ಸಮಯ ಆಯ್ಕೆಮಾಡಿ</string>
    <string name="clinic_visit">ಕ್ಲಿನಿಕ್ ಭೇಟಿ</string>
    <string name="video_consult">ವಿಡಿಯೋ ಕನ್ಸಲ್ಟ್</string>
    <string name="select_date">ದಿನಾಂಕ ಆಯ್ಕೆಮಾಡಿ</string>
    <string name="select_time">ಸಮಯ ಆಯ್ಕೆಮಾಡಿ</string>
    <string name="fee">ಶುಲ್ಕ</string>
    <string name="consultation_type">ಸಮಾಲೋಚನೆಯ ಪ್ರಕಾರ</string>
    <string name="booking_ellipsis">ಬುಕಿಂಗ್ ಆಗುತ್ತಿದೆ…</string>
    <string name="in_person_consultation_desc">ನೇರ ಸಮಾಲೋಚನೆ — ಹತ್ತಿರದ ವೈದ್ಯರನ್ನು ಹುಡುಕಿ</string>
    <string name="video_consultation_desc">ವಿಡಿಯೋ ಸಮಾಲೋಚನೆ — ವೈದ್ಯರೊಂದಿಗೆ ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಸಂಪರ್ಕ ಸಾಧಿಸಿ</string>
    <string name="learn_how_to_book">ಅಪಾಯಿಂಟ್ಮೆಂಟ್ ಹೇಗೆ ಬುಕ್ ಮಾಡುವುದು ಎಂದು ಕಲಿಯಿರಿ</string>
    <string name="search_symptoms_specialities">ರೋಗಲಕ್ಷಣಗಳು / ಸ್ಪೆಷಾಲಿಟಿಗಳನ್ನು ಹುಡುಕಿ</string>
""",
    'ta': """
    <string name="flight_ticket_boarding_pass">போர்டிங் பாஸ்</string>
    <string name="flight_ticket_flight">விமானம்</string>
    <string name="flight_ticket_seat">இருக்கை</string>
    <string name="flight_ticket_swastik_air">ஸ்வஸ்திக் ஏர்</string>
    <string name="empty_records_title">எந்தப் பதிவுகளும் இல்லை</string>
    <string name="empty_records_desc">நீங்கள் இன்னும் எந்த மருத்துவப் பதிவும் அல்லது மருந்துச் சீட்டையும் பதிவேற்றவில்லை.</string>
    <string name="empty_appointments_title">இன்னும் எந்த அப்பாயின்ட்மென்ட்டும் இல்லை</string>
    <string name="empty_appointments_desc">நீங்கள் முன்பதிவு செய்த பிறகு உங்களின் அடுத்தடுத்த அப்பாயின்ட்மென்ட்கள் இங்கே தோன்றும்.</string>
    <string name="empty_notifications_title">அனைத்தும் பார்க்கப்பட்டது!</string>
    <string name="empty_notifications_desc">உங்களிடம் தற்போது புதிய அறிவிப்புகள் எதுவும் இல்லை.</string>
    <string name="add_record_button">பதிவைச் சேர்</string>
    <string name="book_appointment_button">அப்பாயின்ட்மென்ட்டைப் பதிவு செய்</string>
    <string name="book_now">இப்போது பதிவு செய்</string>
    <string name="instant">உடனடி</string>
    <string name="video">வீடியோ</string>
    <string name="connect_with_doctors_online">மருத்துவர்களுடன் ஆன்லைனில் இணையுங்கள்</string>
    <string name="search_doctors_specialist">மருத்துவர்களைத் தேடு</string>
    <string name="most_searched_specialities">அதிகம் தேடப்பட்ட சிறப்புகள்</string>
    <string name="view_all_specialities">அனைத்து சிறப்புகளையும் பார்க்க</string>
    <string name="surgery_conditions">அறுவை சிகிச்சை மூலம் சிகிச்சையளிக்கக்கூடிய நிலைமைகள்</string>
    <string name="common_symptoms">மிகவும் பொதுவான அறிகுறிகள்</string>
    <string name="book_doctor_by_speciality">சிறப்பு வாரியாக மருத்துவர்களைத் தேடு</string>
    <string name="all_specialities">அனைத்து சிறப்புகள்</string>
    <string name="search_doctors">மருத்துவர்களைத் தேடு…</string>
    <string name="doctors_available">மருத்துவர்கள் உள்ளனர்</string>
    <string name="no_doctors_found">எந்த மருத்துவரும் காணப்படவில்லை.</string>
    <string name="try_adjusting_filters">உங்கள் ஃபில்டர்களை அல்லது தேடலை மாற்றிப் பார்க்கவும்.</string>
    <string name="book_clinic_visit">கிளினிக் வருகையைப் பதிவு செய்</string>
    <string name="book_video_consult">வீடியோ ஆலோசனையைப் பதிவு செய்</string>
    <string name="next_available_at">அடுத்த கிடைக்கும் நேரம்</string>
    <string name="select_date_time">தேதி மற்றும் நேரத்தைத் தேர்ந்தெடு</string>
    <string name="clinic_visit">கிளினிக் வருகை</string>
    <string name="video_consult">வீடியோ ஆலோசனை</string>
    <string name="select_date">தேதியைத் தேர்ந்தெடு</string>
    <string name="select_time">நேரத்தைத் தேர்ந்தெடு</string>
    <string name="fee">கட்டணம்</string>
    <string name="consultation_type">ஆலோசனையின் வகை</string>
    <string name="booking_ellipsis">முன்பதிவு செய்யப்படுகிறது…</string>
    <string name="in_person_consultation_desc">நேரடி ஆலோசனை — அருகிலுள்ள மருத்துவர்களைத் தேடு</string>
    <string name="video_consultation_desc">வீடியோ ஆலோசனை — மருத்துவர்களுடன் ஆன்லைனில் இணையுங்கள்</string>
    <string name="learn_how_to_book">அப்பாயின்ட்மென்ட்டை எவ்வாறு பதிவு செய்வது என்பதை அறியுங்கள்</string>
    <string name="search_symptoms_specialities">அறிகுறிகள் / சிறப்புகளைத் தேடு</string>
""",
    'te': """
    <string name="flight_ticket_boarding_pass">బోర్డింగ్ పాస్</string>
    <string name="flight_ticket_flight">ఫ్లైట్</string>
    <string name="flight_ticket_seat">సీటు</string>
    <string name="flight_ticket_swastik_air">స్వాస్తిక్ ఎయిర్</string>
    <string name="empty_records_title">ఎటువంటి రికార్డులు కనుగొనబడలేదు</string>
    <string name="empty_records_desc">మీరు ఇంకా ఎటువంటి వైద్య రికార్డు లేదా ప్రిస్క్రిప్షన్‌ను అప్‌లోడ్ చేయలేదు.</string>
    <string name="empty_appointments_title">ఇంకా ఎటువంటి అపాయింట్‌మెంట్‌లు లేవు</string>
    <string name="empty_appointments_desc">మీ రాబోయే అపాయింట్‌మెంట్‌లు బుక్ చేసిన తర్వాత ఇక్కడ కనిపిస్తాయి.</string>
    <string name="empty_notifications_title">అన్నీ చూశారు!</string>
    <string name="empty_notifications_desc">మీకు ప్రస్తుతం ఎటువంటి కొత్త నోటిఫికేషన్‌లు లేవు.</string>
    <string name="add_record_button">రికార్డు జోడించండి</string>
    <string name="book_appointment_button">అపాయింట్‌మెంట్ బుక్ చేయండి</string>
    <string name="book_now">ఇప్పుడే బుక్ చేయండి</string>
    <string name="instant">తక్షణం</string>
    <string name="video">వీడియో</string>
    <string name="connect_with_doctors_online">వైద్యులతో ఆన్‌లైన్‌లో కనెక్ట్ అవ్వండి</string>
    <string name="search_doctors_specialist">వైద్యులను కనుగొనండి</string>
    <string name="most_searched_specialities">అత్యధికంగా శోధించిన ప్రత్యేకతలు</string>
    <string name="view_all_specialities">అన్ని ప్రత్యేకతలను వీక్షించండి</string>
    <string name="surgery_conditions">శస్త్రచికిత్స ద్వారా చికిత్స చేయగల పరిస్థితులు</string>
    <string name="common_symptoms">అత్యంత సాధారణ లక్షణాలు</string>
    <string name="book_doctor_by_speciality">ప్రత్యేకత ప్రకారం వైద్యులను కనుగొనండి</string>
    <string name="all_specialities">అన్ని ప్రత్యేకతలు</string>
    <string name="search_doctors">వైద్యుల కోసం శోధించండి…</string>
    <string name="doctors_available">వైద్యులు అందుబాటులో ఉన్నారు</string>
    <string name="no_doctors_found">ఎటువంటి వైద్యులు కనుగొనబడలేదు.</string>
    <string name="try_adjusting_filters">మీ ఫిల్టర్‌లను లేదా శోధనను మార్చడానికి ప్రయత్నించండి.</string>
    <string name="book_clinic_visit">క్లినిక్ సందర్శన బుక్ చేయండి</string>
    <string name="book_video_consult">వీడియో కన్సల్ట్ బుక్ చేయండి</string>
    <string name="next_available_at">తదుపరి అందుబాటు సమయం</string>
    <string name="select_date_time">తేదీ మరియు సమయం ఎంచుకోండి</string>
    <string name="clinic_visit">క్లినిక్ సందర్శన</string>
    <string name="video_consult">వీడియో కన్సల్ట్</string>
    <string name="select_date">తేదీని ఎంచుకోండి</string>
    <string name="select_time">సమయాన్ని ఎంచుకోండి</string>
    <string name="fee">ఫీజు</string>
    <string name="consultation_type">కన్సల్టేషన్ రకం</string>
    <string name="booking_ellipsis">బుకింగ్ అవుతోంది…</string>
    <string name="in_person_consultation_desc">ప్రత్యక్ష కన్సల్టేషన్ — సమీప వైద్యులను కనుగొనండి</string>
    <string name="video_consultation_desc">వీడియో కన్సల్టేషన్ — వైద్యులతో ఆన్‌లైన్‌లో కనెక్ట్ అవ్వండి</string>
    <string name="learn_how_to_book">అపాయింట్‌మెంట్ ఎలా బుక్ చేయాలో నేర్చుకోండి</string>
    <string name="search_symptoms_specialities">లక్షణాలు / ప్రత్యేకతలను శోధించండి</string>
"""
}

base_dir = '/Users/nayanprakash/tech folder/SWASTIK/swastik/app/src/main/res/'

for lang, xml_content in strings.items():
    folder = f"values-{lang}"
    file_path = os.path.join(base_dir, folder, "strings.xml")
    
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if already added
        if 'flight_ticket_boarding_pass' not in content:
            # Insert before </resources>
            content = content.replace('</resources>', xml_content + '\n</resources>')
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Added strings to {folder}/strings.xml")
        else:
            print(f"Strings already exist in {folder}/strings.xml")

