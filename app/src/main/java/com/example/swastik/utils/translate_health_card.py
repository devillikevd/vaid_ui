import os

translations = {
    'en': {
        "fitness_steps": "Steps",
        "fitness_active": "Active",
        "fitness_burned": "Burned",
        "fitness_kcal_suffix": "kcal",
        "fitness_minutes_suffix": "m",
        "generate_secure_qr_code": "Generate Secure QR Code",
        "generate_secure_qr_code_desc": "Tap Generate QR Code to create your unique, time-limited health identity QR.",
        "present_at_check_in": "Present at Check-In",
        "present_at_check_in_desc": "Show the QR code at the hospital, clinic, pharmacy, or healthcare desk.",
        "instant_identity_verification": "Instant Identity Verification",
        "instant_identity_verification_desc": "Staff scan the QR code to securely verify your health identity and profile.",
        "access_healthcare_services": "Access Healthcare Services",
        "access_healthcare_services_desc": "Receive appointments, prescriptions, medical records, insurance benefits, and healthcare services faster.",
        "get_health_connect": "Get Health Connect",
        "get_health_connect_desc": "Make sure the 'Health Connect' app by Google is installed on your phone from the Play Store.",
        "link_your_smartwatch_app": "Link your Smartwatch App",
        "link_your_smartwatch_app_desc": "Open your fitness app (like Samsung Health, Google Fit, or your watch's app) and connect it to Health Connect in its settings.",
        "allow_access_to_vaididea": "Allow Access to VAIDIDEA",
        "allow_access_to_vaididea_desc": "Tap the 'Sync Now' button above. A screen will pop up asking for permissions. Please tap 'Allow All' so we can read your health data.",
        "see_your_daily_health": "See Your Daily Health",
        "see_your_daily_health_desc": "That's it! Your daily steps, heart rate, and body temperature will now automatically show up here every day."
    },
    'hi': {
        "fitness_steps": "कदम",
        "fitness_active": "सक्रिय",
        "fitness_burned": "बर्न",
        "fitness_kcal_suffix": "kcal",
        "fitness_minutes_suffix": "m",
        "generate_secure_qr_code": "सुरक्षित QR कोड जनरेट करें",
        "generate_secure_qr_code_desc": "अपना विशिष्ट, समय-सीमित स्वास्थ्य पहचान QR बनाने के लिए QR कोड जनरेट करें पर टैप करें।",
        "present_at_check_in": "चेक-इन पर प्रस्तुत करें",
        "present_at_check_in_desc": "अस्पताल, क्लिनिक, फार्मेसी या स्वास्थ्य डेस्क पर QR कोड दिखाएं।",
        "instant_identity_verification": "त्वरित पहचान सत्यापन",
        "instant_identity_verification_desc": "आपकी स्वास्थ्य पहचान और प्रोफ़ाइल को सुरक्षित रूप से सत्यापित करने के लिए कर्मचारी QR कोड स्कैन करते हैं।",
        "access_healthcare_services": "स्वास्थ्य सेवाओं तक पहुँचें",
        "access_healthcare_services_desc": "अपॉइंटमेंट, नुस्खे, मेडिकल रिकॉर्ड, बीमा लाभ और स्वास्थ्य सेवाएँ तेज़ी से प्राप्त करें।",
        "get_health_connect": "हेल्थ कनेक्ट प्राप्त करें",
        "get_health_connect_desc": "सुनिश्चित करें कि Google का 'Health Connect' ऐप Play Store से आपके फ़ोन में इंस्टॉल है।",
        "link_your_smartwatch_app": "अपने स्मार्टवॉच ऐप को लिंक करें",
        "link_your_smartwatch_app_desc": "अपना फिटनेस ऐप (जैसे सैमसंग हेल्थ, गूगल फिट, या अपनी घड़ी का ऐप) खोलें और इसे इसकी सेटिंग्स में हेल्थ कनेक्ट से कनेक्ट करें।",
        "allow_access_to_vaididea": "VAIDIDEA तक पहुंच की अनुमति दें",
        "allow_access_to_vaididea_desc": "ऊपर 'सिंक नाउ' बटन पर टैप करें। एक स्क्रीन पॉप अप होगी जो अनुमतियाँ मांगेगी। कृपया 'सभी को अनुमति दें' पर टैप करें ताकि हम आपका स्वास्थ्य डेटा पढ़ सकें।",
        "see_your_daily_health": "अपना दैनिक स्वास्थ्य देखें",
        "see_your_daily_health_desc": "इतना ही! आपके दैनिक कदम, हृदय गति और शरीर का तापमान अब हर दिन स्वचालित रूप से यहां दिखाई देंगे।"
    },
    'bn': {
        "fitness_steps": "পদক্ষেপ",
        "fitness_active": "সক্রিয়",
        "fitness_burned": "পোড়া",
        "fitness_kcal_suffix": "kcal",
        "fitness_minutes_suffix": "m",
        "generate_secure_qr_code": "নিরাপদ QR কোড জেনারেট করুন",
        "generate_secure_qr_code_desc": "আপনার অনন্য, সময়-সীমিত স্বাস্থ্য পরিচয় QR তৈরি করতে QR কোড জেনারেট করুন-এ ট্যাপ করুন।",
        "present_at_check_in": "চেক-ইনে উপস্থাপন করুন",
        "present_at_check_in_desc": "হাসপাতাল, ক্লিনিক, ফার্মেসি বা হেলথকেয়ার ডেস্কে QR কোড দেখান।",
        "instant_identity_verification": "তাত্ক্ষণিক পরিচয় যাচাইকরণ",
        "instant_identity_verification_desc": "কর্মচারীরা আপনার স্বাস্থ্য পরিচয় এবং প্রোফাইল নিরাপদে যাচাই করতে QR কোড স্ক্যান করে।",
        "access_healthcare_services": "স্বাস্থ্যসেবা অ্যাক্সেস করুন",
        "access_healthcare_services_desc": "অ্যাপয়েন্টমেন্ট, প্রেসক্রিপশন, মেডিকেল রেকর্ড, বীমা সুবিধা এবং স্বাস্থ্যসেবা দ্রুত পান।",
        "get_health_connect": "হেলথ কানেক্ট পান",
        "get_health_connect_desc": "প্লে স্টোর থেকে আপনার ফোনে গুগলের 'Health Connect' অ্যাপ ইনস্টল করা আছে তা নিশ্চিত করুন।",
        "link_your_smartwatch_app": "আপনার স্মার্টওয়াচ অ্যাপ লিঙ্ক করুন",
        "link_your_smartwatch_app_desc": "আপনার ফিটনেস অ্যাপ (যেমন Samsung Health, Google Fit, বা আপনার ঘড়ির অ্যাপ) খুলুন এবং সেটিংসে Health Connect এর সাথে সংযুক্ত করুন।",
        "allow_access_to_vaididea": "VAIDIDEA-তে অ্যাক্সেসের অনুমতি দিন",
        "allow_access_to_vaididea_desc": "উপরে 'এখন সিঙ্ক করুন' বোতামে আলতো চাপুন। একটি স্ক্রিন পপ আপ হয়ে অনুমতি চাইবে। আমরা যাতে আপনার স্বাস্থ্য ডেটা পড়তে পারি সেজন্য অনুগ্রহ করে 'সব অনুমতি দিন'-এ আলতো চাপুন।",
        "see_your_daily_health": "আপনার দৈনন্দিন স্বাস্থ্য দেখুন",
        "see_your_daily_health_desc": "এটুকুই! আপনার দৈনন্দিন পদক্ষেপ, হৃদস্পন্দন এবং শরীরের তাপমাত্রা এখন প্রতিদিন স্বয়ংক্রিয়ভাবে এখানে প্রদর্শিত হবে।"
    },
    'kn': {
        "fitness_steps": "ಹಂತಗಳು",
        "fitness_active": "ಸಕ್ರಿಯ",
        "fitness_burned": "ಬರ್ನ್",
        "fitness_kcal_suffix": "kcal",
        "fitness_minutes_suffix": "m",
        "generate_secure_qr_code": "ಸುರಕ್ಷಿತ QR ಕೋಡ್ ರಚಿಸಿ",
        "generate_secure_qr_code_desc": "ನಿಮ್ಮ ವಿಶಿಷ್ಟವಾದ, ಸಮಯ-ಸೀಮಿತ ಆರೋಗ್ಯ ಗುರುತಿನ QR ಅನ್ನು ರಚಿಸಲು QR ಕೋಡ್ ರಚಿಸಿ ಟ್ಯಾಪ್ ಮಾಡಿ.",
        "present_at_check_in": "ಚೆಕ್-ಇನ್‌ನಲ್ಲಿ ಪ್ರಸ್ತುತಪಡಿಸಿ",
        "present_at_check_in_desc": "ಆಸ್ಪತ್ರೆ, ಕ್ಲಿನಿಕ್, ಫಾರ್ಮಸಿ, ಅಥವಾ ಆರೋಗ್ಯ ಡೆಸ್ಕ್‌ನಲ್ಲಿ QR ಕೋಡ್ ಅನ್ನು ತೋರಿಸಿ.",
        "instant_identity_verification": "ತ್ವರಿತ ಗುರುತಿನ ಪರಿಶೀಲನೆ",
        "instant_identity_verification_desc": "ನಿಮ್ಮ ಆರೋಗ್ಯದ ಗುರುತು ಮತ್ತು ಪ್ರೊಫೈಲ್ ಅನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಪರಿಶೀಲಿಸಲು ಸಿಬ್ಬಂದಿ QR ಕೋಡ್ ಅನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡುತ್ತಾರೆ.",
        "access_healthcare_services": "ಆರೋಗ್ಯ ಸೇವೆಗಳನ್ನು ಪ್ರವೇಶಿಸಿ",
        "access_healthcare_services_desc": "ನೇಮಕಾತಿಗಳು, ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ಗಳು, ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳು, ವಿಮಾ ಪ್ರಯೋಜನಗಳು ಮತ್ತು ಆರೋಗ್ಯ ಸೇವೆಗಳನ್ನು ವೇಗವಾಗಿ ಪಡೆಯಿರಿ.",
        "get_health_connect": "ಹೆಲ್ತ್ ಕನೆಕ್ಟ್ ಪಡೆಯಿರಿ",
        "get_health_connect_desc": "ಪ್ಲೇ ಸ್ಟೋರ್‌ನಿಂದ ನಿಮ್ಮ ಫೋನ್‌ನಲ್ಲಿ Google ನ 'Health Connect' ಅಪ್ಲಿಕೇಶನ್ ಸ್ಥಾಪಿಸಲಾಗಿದೆಯೆ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
        "link_your_smartwatch_app": "ನಿಮ್ಮ ಸ್ಮಾರ್ಟ್‌ವಾಚ್ ಅಪ್ಲಿಕೇಶನ್ ಲಿಂಕ್ ಮಾಡಿ",
        "link_your_smartwatch_app_desc": "ನಿಮ್ಮ ಫಿಟ್‌ನೆಸ್ ಅಪ್ಲಿಕೇಶನ್ (Samsung Health, Google Fit ಅಥವಾ ನಿಮ್ಮ ವಾಚ್ ಅಪ್ಲಿಕೇಶನ್) ತೆರೆಯಿರಿ ಮತ್ತು ಅದರ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ Health Connect ಗೆ ಸಂಪರ್ಕಪಡಿಸಿ.",
        "allow_access_to_vaididea": "VAIDIDEA ಗೆ ಪ್ರವೇಶವನ್ನು ಅನುಮತಿಸಿ",
        "allow_access_to_vaididea_desc": "ಮೇಲಿನ 'ಈಗ ಸಿಂಕ್ ಮಾಡಿ' ಬಟನ್ ಅನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ. ಅನುಮತಿಗಳನ್ನು ಕೇಳುವ ಪರದೆಯು ಪಾಪ್ ಅಪ್ ಆಗುತ್ತದೆ. ದಯವಿಟ್ಟು 'ಎಲ್ಲವನ್ನೂ ಅನುಮತಿಸು' ಟ್ಯಾಪ್ ಮಾಡಿ ಇದರಿಂದ ನಾವು ನಿಮ್ಮ ಆರೋಗ್ಯದ ಡೇಟಾವನ್ನು ಓದಬಹುದು.",
        "see_your_daily_health": "ನಿಮ್ಮ ದೈನಂದಿನ ಆರೋಗ್ಯವನ್ನು ನೋಡಿ",
        "see_your_daily_health_desc": "ಅಷ್ಟೆ! ನಿಮ್ಮ ದೈನಂದಿನ ಹಂತಗಳು, ಹೃದಯ ಬಡಿತ ಮತ್ತು ದೇಹದ ಉಷ್ಣತೆಯು ಈಗ ಪ್ರತಿದಿನ ಇಲ್ಲಿ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಗೋಚರಿಸುತ್ತದೆ."
    },
    'mr': {
        "fitness_steps": "पावले",
        "fitness_active": "सक्रिय",
        "fitness_burned": "बर्न",
        "fitness_kcal_suffix": "kcal",
        "fitness_minutes_suffix": "m",
        "generate_secure_qr_code": "सुरक्षित QR कोड तयार करा",
        "generate_secure_qr_code_desc": "तुमचा अनन्य, वेळ-मर्यादित आरोग्य ओळख QR तयार करण्यासाठी QR कोड तयार करा वर टॅप करा.",
        "present_at_check_in": "चेक-इनवर सादर करा",
        "present_at_check_in_desc": "रुग्णालय, क्लिनिक, फार्मसी किंवा हेल्थकेअर डेस्कवर QR कोड दाखवा.",
        "instant_identity_verification": "त्वरित ओळख पडताळणी",
        "instant_identity_verification_desc": "तुमची आरोग्य ओळख आणि प्रोफाइल सुरक्षितपणे पडताळण्यासाठी कर्मचारी QR कोड स्कॅन करतात.",
        "access_healthcare_services": "आरोग्य सेवांमध्ये प्रवेश करा",
        "access_healthcare_services_desc": "अपॉइंटमेंट्स, प्रिस्क्रिप्शन्स, मेडिकल रेकॉर्ड्स, इन्शुरन्स फायदे आणि आरोग्य सेवा जलद मिळवा.",
        "get_health_connect": "हेल्थ कनेक्ट मिळवा",
        "get_health_connect_desc": "तुमच्या फोनवर प्ले स्टोअरवरून गुगलचे 'Health Connect' अ‍ॅप इंस्टॉल असल्याची खात्री करा.",
        "link_your_smartwatch_app": "तुमचे स्मार्टवॉच अ‍ॅप लिंक करा",
        "link_your_smartwatch_app_desc": "तुमचे फिटनेस अ‍ॅप (जसे की Samsung Health, Google Fit किंवा तुमच्या घड्याळाचे अ‍ॅप) उघडा आणि त्याच्या सेटिंग्जमध्ये Health Connect शी कनेक्ट करा.",
        "allow_access_to_vaididea": "VAIDIDEA ला प्रवेशाची अनुमती द्या",
        "allow_access_to_vaididea_desc": "वरील 'आता सिंक करा' बटणावर टॅप करा. एक स्क्रीन पॉप अप होईल आणि परवानग्या मागेल. कृपया 'सर्व अनुमती द्या' वर टॅप करा जेणेकरून आम्ही तुमचा आरोग्य डेटा वाचू शकू.",
        "see_your_daily_health": "तुमचे दैनंदिन आरोग्य पहा",
        "see_your_daily_health_desc": "बस्स! तुमची रोजची पावले, हृदयगती आणि शरीराचे तापमान आता दररोज येथे आपोआप दिसून येईल."
    },
    'ta': {
        "fitness_steps": "படிகள்",
        "fitness_active": "செயல்படும்",
        "fitness_burned": "எரிக்கப்பட்டது",
        "fitness_kcal_suffix": "kcal",
        "fitness_minutes_suffix": "m",
        "generate_secure_qr_code": "பாதுகாப்பான QR குறியீட்டை உருவாக்கவும்",
        "generate_secure_qr_code_desc": "உங்கள் தனித்துவமான, நேர-வரையறுக்கப்பட்ட சுகாதார அடையாள QR ஐ உருவாக்க QR குறியீட்டை உருவாக்கு என்பதைத் தட்டவும்.",
        "present_at_check_in": "செக்-இன் செய்யும் போது வழங்கவும்",
        "present_at_check_in_desc": "மருத்துவமனை, கிளினிக், மருந்தகம் அல்லது சுகாதார மையத்தில் QR குறியீட்டைக் காட்டவும்.",
        "instant_identity_verification": "உடனடி அடையாளச் சரிபார்ப்பு",
        "instant_identity_verification_desc": "உங்கள் சுகாதார அடையாளம் மற்றும் சுயவிவரத்தை பாதுகாப்பாக சரிபார்க்க ஊழியர்கள் QR குறியீட்டை ஸ்கேன் செய்கிறார்கள்.",
        "access_healthcare_services": "சுகாதார சேவைகளை அணுகவும்",
        "access_healthcare_services_desc": "நியமனங்கள், மருந்துச் சீட்டுகள், மருத்துவ பதிவுகள், காப்பீட்டு சலுகைகள் மற்றும் சுகாதார சேவைகளை விரைவாகப் பெறுங்கள்.",
        "get_health_connect": "ஹெல்த் கனெக்டைப் பெறுங்கள்",
        "get_health_connect_desc": "Play Store இலிருந்து உங்கள் போனில் Google இன் 'Health Connect' ஆப்ஸ் நிறுவப்பட்டுள்ளதா என்பதை உறுதிப்படுத்தவும்.",
        "link_your_smartwatch_app": "உங்கள் ஸ்மார்ட்வாட்ச் ஆப்ஸை இணைக்கவும்",
        "link_your_smartwatch_app_desc": "உங்கள் ஃபிட்னஸ் ஆப்ஸை (Samsung Health, Google Fit அல்லது உங்கள் வாட்சின் ஆப்ஸ் போன்றவை) திறந்து, அதன் அமைப்புகளில் Health Connect உடன் இணைக்கவும்.",
        "allow_access_to_vaididea": "VAIDIDEA க்கான அணுகலை அனுமதிக்கவும்",
        "allow_access_to_vaididea_desc": "மேலே உள்ள 'இப்போது ஒத்திசை' பொத்தானைத் தட்டவும். அனுமதிகள் கேட்கும் திரை தோன்றும். உங்கள் சுகாதாரத் தரவை நாங்கள் படிப்பதற்காக 'அனைத்தையும் அனுமதி' என்பதைத் தட்டவும்.",
        "see_your_daily_health": "உங்கள் தினசரி ஆரோக்கியத்தைப் பார்க்கவும்",
        "see_your_daily_health_desc": "அவ்வளவுதான்! உங்கள் தினசரி படிகள், இதயத் துடிப்பு மற்றும் உடல் வெப்பநிலை இப்போது தினமும் தானாகவே இங்கு தோன்றும்."
    },
    'te': {
        "fitness_steps": "దశలు",
        "fitness_active": "క్రియాశీల",
        "fitness_burned": "కాలిపోయింది",
        "fitness_kcal_suffix": "kcal",
        "fitness_minutes_suffix": "m",
        "generate_secure_qr_code": "సురక్షిత QR కోడ్‌ను రూపొందించండి",
        "generate_secure_qr_code_desc": "మీ ప్రత్యేకమైన, సమయ-పరిమిత ఆరోగ్య గుర్తింపు QR ని సృష్టించడానికి QR కోడ్‌ను రూపొందించండి పై నొక్కండి.",
        "present_at_check_in": "చెక్-ఇన్ వద్ద సమర్పించండి",
        "present_at_check_in_desc": "ఆసుపత్రి, క్లినిక్, ఫార్మసీ లేదా హెల్త్‌కేర్ డెస్క్ వద్ద QR కోడ్‌ను చూపించండి.",
        "instant_identity_verification": "తక్షణ గుర్తింపు ధృవీకరణ",
        "instant_identity_verification_desc": "మీ ఆరోగ్య గుర్తింపు మరియు ప్రొఫైల్‌ను సురక్షితంగా ధృవీకరించడానికి సిబ్బంది QR కోడ్‌ను స్కాన్ చేస్తారు.",
        "access_healthcare_services": "ఆరోగ్య సంరక్షణ సేవలను యాక్సెస్ చేయండి",
        "access_healthcare_services_desc": "అపాయింట్‌మెంట్‌లు, ప్రిస్క్రిప్షన్‌లు, వైద్య రికార్డులు, బీమా ప్రయోజనాలు మరియు ఆరోగ్య సంరక్షణ సేవలను వేగంగా పొందండి.",
        "get_health_connect": "హెల్త్ కనెక్ట్ పొందండి",
        "get_health_connect_desc": "ప్లే స్టోర్ నుండి మీ ఫోన్‌లో Google యొక్క 'Health Connect' యాప్ ఇన్‌స్టాల్ చేయబడిందని నిర్ధారించుకోండి.",
        "link_your_smartwatch_app": "మీ స్మార్ట్‌వాచ్ యాప్‌ను లింక్ చేయండి",
        "link_your_smartwatch_app_desc": "మీ ఫిట్‌నెస్ యాప్ (Samsung Health, Google Fit లేదా మీ వాచ్ యాప్ వంటివి) తెరిచి, దాని సెట్టింగ్‌లలో Health Connect కి కనెక్ట్ చేయండి.",
        "allow_access_to_vaididea": "VAIDIDEA కి ప్రాప్యతను అనుమతించండి",
        "allow_access_to_vaididea_desc": "పైన ఉన్న 'ఇప్పుడే సింక్ చేయండి' బటన్‌పై నొక్కండి. అనుమతులను అడుగుతూ ఒక స్క్రీన్ పాప్ అప్ అవుతుంది. దయచేసి 'అన్నిటినీ అనుమతించు' నొక్కండి, తద్వారా మేము మీ ఆరోగ్య డేటాను చదవగలుగుతాము.",
        "see_your_daily_health": "మీ రోజువారీ ఆరోగ్యాన్ని చూడండి",
        "see_your_daily_health_desc": "అంతే! మీ రోజువారీ దశలు, హృదయ స్పందన రేటు మరియు శరీర ఉష్ణోగ్రత ఇప్పుడు ప్రతిరోజూ స్వయంచాలకంగా ఇక్కడ కనిపిస్తాయి."
    }
}

base_dir = r"c:\Users\Divyanshu\OneDrive\Desktop\Project Vaididea\app\src\main\res"

def append_strings_to_file(file_path, translated_dict):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    if "</resources>" not in content:
        print(f"Could not find </resources> in {file_path}")
        return
        
    new_xml = ""
    for k, v in translated_dict.items():
        if f'name="{k}"' in content:
            continue
        v = v.replace("'", "\\'").replace("&", "&amp;")
        new_xml += f'    <string name="{k}">{v}</string>\n'
        
    if new_xml:
        content = content.replace("</resources>", new_xml + "</resources>")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {file_path}")

# English strings
append_strings_to_file(os.path.join(base_dir, "values", "strings.xml"), translations['en'])

# Other languages
for lang_code in ['hi', 'bn', 'kn', 'mr', 'ta', 'te']:
    file_path = os.path.join(base_dir, f"values-{lang_code}", "strings.xml")
    append_strings_to_file(file_path, translations[lang_code])

print("Done translating and updating strings.")
