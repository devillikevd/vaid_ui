import os
import re

strings_en = {
    "monitoring_paused": "Monitoring Paused",
    "live_monitoring_active": "Live Monitoring Active",
    "turn_on_guardian": "Turn on Guardian to resume live monitoring.",
    "sensors_are_actively": "Sensors are actively tracking your safety parameters.",
    "telemetry_orientation": "Orientation",
    "telemetry_upright": "Upright",
    "telemetry_tilted": "Tilted",
    "telemetry_speed": "Speed",
    "telemetry_speed_val": "%1$s km/h",
    "telemetry_activity": "Activity",
    "fall_detection_alerts": "Fall Detection Alerts",
    "impact_tumble_checking": "Impact & tumble checking",
    "vehicle_crash_detection": "Vehicle Crash Detection",
    "high_speed_collision": "High-speed collision checking",
    "mobility_analysis": "Mobility Analysis",
    "gait_balance_tracking": "Gait and balance tracking",
    "status_active": "Active",
    "status_off": "Off",
    "no_falls_detected": "✅ No falls detected in the last 7 days",
    "falls_detected_format": "⚠️ %1$d fall(s) detected in the last 7 days",
    "gait_stability_score": "Gait Stability Score",
    "last_7_days_higher_is_better": "Last 7 Days (Higher is better)",

    "guardian_fall_alert": "Fall Alert",
    "guardian_crash_sos": "Crash SOS",
    "guardian_mobility": "Mobility",
    "guardian_data_sharing": "Data Sharing",
    "guardian_allowed": "Allowed",
    
    "guardian_vision_alignment": "Vision Alignment",
    "guardian_vision_alignment_body": "Guardian is built for preventive-care: emergency response, telemedicine context, and patient-controlled sharing.",
    "guardian_fall_detection_alerts_numbered": "1. Fall Detection Alerts",
    "guardian_fall_detection_reliability": "Firebase notification to emergency contacts only.",
    "guardian_fall_detection_desc": "Uses motion sensors to detect verified falls and notifies your emergency contacts. It does not trigger SOS or ambulance dispatch.",
    "guardian_vehicle_crash_numbered": "2. Vehicle Crash Detection",
    "guardian_vehicle_crash_reliability": "Tightened high-speed impact detection.",
    "guardian_vehicle_crash_desc": "Monitors for severe impacts at vehicle speeds. If the countdown is not cancelled, it triggers SOS ambulance dispatch and notifies emergency contacts.",
    "guardian_mobility_analysis_numbered": "3. Mobility Analysis",
    "guardian_mobility_reliability": "Screening for walking pattern changes.",
    "guardian_mobility_desc": "Analyzes your walking pattern to help doctors track recovery.",
    "guardian_doctor_sharing": "Doctor Sharing",
    "guardian_doctor_reliability": "Private data sharing.",
    "guardian_doctor_desc": "Allow your doctor to see analytics during a consultation."
}

strings_hi = {
    "monitoring_paused": "निगरानी रुकी हुई है",
    "live_monitoring_active": "लाइव निगरानी सक्रिय",
    "turn_on_guardian": "लाइव निगरानी फिर से शुरू करने के लिए गार्जियन चालू करें।",
    "sensors_are_actively": "सेंसर सक्रिय रूप से आपके सुरक्षा मापदंडों को ट्रैक कर रहे हैं।",
    "telemetry_orientation": "अभिमुखीकरण",
    "telemetry_upright": "सीधा",
    "telemetry_tilted": "झुका हुआ",
    "telemetry_speed": "गति",
    "telemetry_speed_val": "%1$s किमी/घंटा",
    "telemetry_activity": "गतिविधि",
    "fall_detection_alerts": "गिरने की चेतावनी",
    "impact_tumble_checking": "प्रभाव और गिरने की जांच",
    "vehicle_crash_detection": "वाहन दुर्घटना का पता लगाना",
    "high_speed_collision": "उच्च गति टक्कर की जाँच",
    "mobility_analysis": "गतिशीलता विश्लेषण",
    "gait_balance_tracking": "चाल और संतुलन ट्रैकिंग",
    "status_active": "सक्रिय",
    "status_off": "बंद",
    "no_falls_detected": "✅ पिछले 7 दिनों में गिरने का कोई मामला नहीं",
    "falls_detected_format": "⚠️ पिछले 7 दिनों में %1$d बार गिरने का पता चला",
    "gait_stability_score": "गैट स्थिरता स्कोर",
    "last_7_days_higher_is_better": "पिछले 7 दिन (अधिक होना बेहतर है)",

    "guardian_fall_alert": "गिरने की चेतावनी",
    "guardian_crash_sos": "क्रैश SOS",
    "guardian_mobility": "गतिशीलता",
    "guardian_data_sharing": "डेटा साझाकरण",
    "guardian_allowed": "अनुमति है",
    
    "guardian_vision_alignment": "Vision Alignment",
    "guardian_vision_alignment_body": "गार्जियन निवारक-देखभाल के लिए बनाया गया है: आपातकालीन प्रतिक्रिया, टेलीमेडिसिन संदर्भ, और रोगी-नियंत्रित साझाकरण।",
    "guardian_fall_detection_alerts_numbered": "1. गिरने की चेतावनी",
    "guardian_fall_detection_reliability": "केवल आपातकालीन संपर्कों को फायरबेस अधिसूचना।",
    "guardian_fall_detection_desc": "सत्यापित गिरावट का पता लगाने के लिए मोशन सेंसर का उपयोग करता है और आपके आपातकालीन संपर्कों को सूचित करता है। यह SOS या एम्बुलेंस को चालू नहीं करता है।",
    "guardian_vehicle_crash_numbered": "2. वाहन दुर्घटना का पता लगाना",
    "guardian_vehicle_crash_reliability": "उच्च गति प्रभाव का पता लगाना।",
    "guardian_vehicle_crash_desc": "वाहन की गति पर गंभीर प्रभावों की निगरानी करता है। यदि उलटी गिनती रद्द नहीं की जाती है, तो यह SOS एम्बुलेंस को कॉल करता है और आपातकालीन संपर्कों को सूचित करता है।",
    "guardian_mobility_analysis_numbered": "3. गतिशीलता विश्लेषण",
    "guardian_mobility_reliability": "चलने के पैटर्न में बदलाव की जांच।",
    "guardian_mobility_desc": "डॉक्टरों को रिकवरी ट्रैक करने में मदद करने के लिए आपके चलने के पैटर्न का विश्लेषण करता है।",
    "guardian_doctor_sharing": "डॉक्टर के साथ साझाकरण",
    "guardian_doctor_reliability": "निजी डेटा साझाकरण।",
    "guardian_doctor_desc": "परामर्श के दौरान अपने डॉक्टर को एनालिटिक्स देखने दें।"
}

strings_bn = {
    "monitoring_paused": "পর্যবেক্ষণ স্থগিত করা হয়েছে",
    "live_monitoring_active": "লাইভ মনিটরিং সক্রিয়",
    "turn_on_guardian": "লাইভ মনিটরিং পুনরায় শুরু করতে গার্ডিয়ান চালু করুন।",
    "sensors_are_actively": "সেন্সরগুলো সক্রিয়ভাবে আপনার নিরাপত্তা পরামিতি ট্র্যাক করছে।",
    "telemetry_orientation": "ওরিয়েন্টেশন",
    "telemetry_upright": "সোজা",
    "telemetry_tilted": "কাত",
    "telemetry_speed": "গতি",
    "telemetry_speed_val": "%1$s কিমি/ঘন্টা",
    "telemetry_activity": "ক্রিয়াকলাপ",
    "fall_detection_alerts": "পতনের সতর্কতা",
    "impact_tumble_checking": "প্রভাব এবং পতন চেকিং",
    "vehicle_crash_detection": "যানবাহন দুর্ঘটনা সনাক্তকরণ",
    "high_speed_collision": "উচ্চ-গতির সংঘর্ষ চেকিং",
    "mobility_analysis": "গতিশীলতা বিশ্লেষণ",
    "gait_balance_tracking": "হাঁটার ধরণ এবং ভারসাম্য ট্র্যাকিং",
    "status_active": "সক্রিয়",
    "status_off": "বন্ধ",
    "no_falls_detected": "✅ গত 7 দিনে কোনো পতনের ঘটনা নেই",
    "falls_detected_format": "⚠️ গত 7 দিনে %1$d টি পতন সনাক্ত করা হয়েছে",
    "gait_stability_score": "হাঁটার স্থিতিশীলতা স্কোর",
    "last_7_days_higher_is_better": "গত 7 দিন (বেশি হওয়া ভালো)",

    "guardian_fall_alert": "পতনের সতর্কতা",
    "guardian_crash_sos": "ক্র্যাশ এসওএস",
    "guardian_mobility": "গতিশীলতা",
    "guardian_data_sharing": "ডেটা ভাগাভাগি",
    "guardian_allowed": "অনুমোদিত",
    
    "guardian_vision_alignment": "Vision Alignment",
    "guardian_vision_alignment_body": "গার্ডিয়ান প্রতিরোধমূলক যত্নের জন্য তৈরি করা হয়েছে: জরুরি প্রতিক্রিয়া, টেলিমেডিসিন প্রসঙ্গ এবং রোগী-নিয়ন্ত্রিত ভাগাভাগি।",
    "guardian_fall_detection_alerts_numbered": "১. পতনের সতর্কতা",
    "guardian_fall_detection_reliability": "শুধুমাত্র জরুরি পরিচিতিদের ফায়ারবেস বিজ্ঞপ্তি।",
    "guardian_fall_detection_desc": "যাচাইকৃত পতন শনাক্ত করতে মোশন সেন্সর ব্যবহার করে এবং আপনার জরুরি পরিচিতিদের অবহিত করে। এটি এসওএস বা অ্যাম্বুলেন্স প্রেরণ করে না।",
    "guardian_vehicle_crash_numbered": "২. যানবাহন দুর্ঘটনা সনাক্তকরণ",
    "guardian_vehicle_crash_reliability": "কঠোর উচ্চ-গতির প্রভাব সনাক্তকরণ।",
    "guardian_vehicle_crash_desc": "যানবাহনের গতিতে গুরুতর প্রভাবগুলির জন্য পর্যবেক্ষণ করে। যদি কাউন্টডাউন বাতিল না করা হয়, তাহলে এটি এসওএস অ্যাম্বুলেন্স প্রেরণ করে এবং জরুরি পরিচিতিদের অবহিত করে।",
    "guardian_mobility_analysis_numbered": "৩. গতিশীলতা বিশ্লেষণ",
    "guardian_mobility_reliability": "হাঁটার ধরণের পরিবর্তনের জন্য স্ক্রীনিং।",
    "guardian_mobility_desc": "ডাক্তারদের পুনরুদ্ধারের ট্র্যাক করতে সাহায্য করার জন্য আপনার হাঁটার ধরণ বিশ্লেষণ করে।",
    "guardian_doctor_sharing": "ডাক্তারের সাথে ভাগাভাগি",
    "guardian_doctor_reliability": "ব্যক্তিগত ডেটা ভাগাভাগি।",
    "guardian_doctor_desc": "পরামর্শের সময় আপনার ডাক্তারকে অ্যানালিটিক্স দেখতে দিন।"
}

strings_te = {
    "monitoring_paused": "పర్యవేక్షణ పాజ్ చేయబడింది",
    "live_monitoring_active": "లైవ్ పర్యవేక్షణ సక్రియంగా ఉంది",
    "turn_on_guardian": "లైవ్ పర్యవేక్షణను తిరిగి ప్రారంభించడానికి గార్డియన్‌ను ఆన్ చేయండి.",
    "sensors_are_actively": "సెన్సార్‌లు మీ భద్రతా పారామితులను చురుకుగా ట్రాక్ చేస్తున్నాయి.",
    "telemetry_orientation": "ఓరియంటేషన్",
    "telemetry_upright": "నిటారుగా",
    "telemetry_tilted": "వంగి ఉంటుంది",
    "telemetry_speed": "వేగం",
    "telemetry_speed_val": "%1$s కిమీ/గం",
    "telemetry_activity": "కార్యకలాపం",
    "fall_detection_alerts": "ఫాల్ డిటెక్షన్ హెచ్చరికలు",
    "impact_tumble_checking": "ప్రభావం & పడిపోవడం తనిఖీ",
    "vehicle_crash_detection": "వాహన ప్రమాద గుర్తింపు",
    "high_speed_collision": "అధిక-వేగ ఢీకొనడం తనిఖీ",
    "mobility_analysis": "మొబిలిటీ విశ్లేషణ",
    "gait_balance_tracking": "నడక మరియు సమతుల్యత ట్రాకింగ్",
    "status_active": "సక్రియ",
    "status_off": "ఆఫ్",
    "no_falls_detected": "✅ గత 7 రోజుల్లో పడిపోవడం కనుగొనబడలేదు",
    "falls_detected_format": "⚠️ గత 7 రోజుల్లో %1$d సార్లు పడిపోవడం గుర్తించబడింది",
    "gait_stability_score": "నడక స్థిరత్వం స్కోరు",
    "last_7_days_higher_is_better": "గత 7 రోజులు (ఎక్కువ ఉంటే మంచిది)",

    "guardian_fall_alert": "ఫాల్ హెచ్చరిక",
    "guardian_crash_sos": "క్రాష్ SOS",
    "guardian_mobility": "మొబిలిటీ",
    "guardian_data_sharing": "డేటా షేరింగ్",
    "guardian_allowed": "అనుమతించబడింది",
    
    "guardian_vision_alignment": "Vision Alignment",
    "guardian_vision_alignment_body": "గార్డియన్ నివారణ సంరక్షణ కోసం నిర్మించబడింది: అత్యవసర ప్రతిస్పందన, టెలిమెడిసిన్ సందర్భం మరియు రోగి-నియంత్రిత భాగస్వామ్యం.",
    "guardian_fall_detection_alerts_numbered": "1. ఫాల్ డిటెక్షన్ హెచ్చరికలు",
    "guardian_fall_detection_reliability": "అత్యవసర పరిచయాలకు మాత్రమే ఫైర్‌బేస్ నోటిఫికేషన్.",
    "guardian_fall_detection_desc": "ధృవీకరించబడిన పడిపోవడాన్ని గుర్తించడానికి మోషన్ సెన్సార్‌లను ఉపయోగిస్తుంది మరియు మీ అత్యవసర పరిచయాలకు తెలియజేస్తుంది. ఇది SOS లేదా అంబులెన్స్‌ను ప్రేరేపించదు.",
    "guardian_vehicle_crash_numbered": "2. వాహన ప్రమాద గుర్తింపు",
    "guardian_vehicle_crash_reliability": "కఠినమైన హై-స్పీడ్ ఇంపాక్ట్ డిటెక్షన్.",
    "guardian_vehicle_crash_desc": "వాహన వేగంలో తీవ్ర ప్రభావాల కోసం పర్యవేక్షిస్తుంది. కౌంట్‌డౌన్ రద్దు చేయబడకపోతే, ఇది SOS అంబులెన్స్ పంపకానికి ట్రిగ్గర్ చేస్తుంది మరియు అత్యవసర పరిచయాలకు తెలియజేస్తుంది.",
    "guardian_mobility_analysis_numbered": "3. మొబిలిటీ విశ్లేషణ",
    "guardian_mobility_reliability": "నడక నమూనా మార్పుల కోసం స్క్రీనింగ్.",
    "guardian_mobility_desc": "వైద్యులు కోలుకోవడాన్ని ట్రాక్ చేయడంలో సహాయపడటానికి మీ నడక నమూనాను విశ్లేషిస్తుంది.",
    "guardian_doctor_sharing": "డాక్టర్ భాగస్వామ్యం",
    "guardian_doctor_reliability": "ప్రైవేట్ డేటా షేరింగ్.",
    "guardian_doctor_desc": "సంప్రదింపుల సమయంలో మీ డాక్టర్ విశ్లేషణలను చూడటానికి అనుమతించండి."
}

strings_ta = {
    "monitoring_paused": "கண்காணிப்பு இடைநிறுத்தப்பட்டுள்ளது",
    "live_monitoring_active": "நேரலை கண்காணிப்பு செயலில் உள்ளது",
    "turn_on_guardian": "நேரலை கண்காணிப்பைத் தொடர கார்டியனை இயக்கவும்.",
    "sensors_are_actively": "சென்சார்கள் உங்கள் பாதுகாப்பு அளவுருக்களை தீவிரமாகக் கண்காணிக்கின்றன.",
    "telemetry_orientation": "நோக்குநிலை",
    "telemetry_upright": "நேராக",
    "telemetry_tilted": "சாய்ந்தது",
    "telemetry_speed": "வேகம்",
    "telemetry_speed_val": "%1$s கிமீ/மணி",
    "telemetry_activity": "செயல்பாடு",
    "fall_detection_alerts": "வீழ்ச்சி எச்சரிக்கைகள்",
    "impact_tumble_checking": "தாக்கம் மற்றும் வீழ்ச்சி சரிபார்ப்பு",
    "vehicle_crash_detection": "வாகன விபத்து கண்டறிதல்",
    "high_speed_collision": "அதிக வேக மோதல் சரிபார்ப்பு",
    "mobility_analysis": "மொபிலிட்டி பகுப்பாய்வு",
    "gait_balance_tracking": "நடை மற்றும் சமநிலை கண்காணிப்பு",
    "status_active": "செயலில்",
    "status_off": "ஆஃப்",
    "no_falls_detected": "✅ கடந்த 7 நாட்களில் வீழ்ச்சி கண்டறியப்படவில்லை",
    "falls_detected_format": "⚠️ கடந்த 7 நாட்களில் %1$d முறை வீழ்ச்சி கண்டறியப்பட்டுள்ளது",
    "gait_stability_score": "நடை நிலைத்தன்மை மதிப்பெண்",
    "last_7_days_higher_is_better": "கடந்த 7 நாட்கள் (அதிகமாக இருப்பது சிறந்தது)",

    "guardian_fall_alert": "வீழ்ச்சி எச்சரிக்கை",
    "guardian_crash_sos": "கிராஷ் SOS",
    "guardian_mobility": "மொபிலிட்டி",
    "guardian_data_sharing": "தரவு பகிர்வு",
    "guardian_allowed": "அனுமதிக்கப்பட்டது",
    
    "guardian_vision_alignment": "Vision Alignment",
    "guardian_vision_alignment_body": "கார்டியன் தடுப்பு-பராமரிப்புக்காக உருவாக்கப்பட்டது: அவசரகால பதில், டெலிமெடிசின் சூழல் மற்றும் நோயாளி கட்டுப்பாட்டு பகிர்வு.",
    "guardian_fall_detection_alerts_numbered": "1. வீழ்ச்சி எச்சரிக்கைகள்",
    "guardian_fall_detection_reliability": "அவசரகால தொடர்புகளுக்கு மட்டுமே ஃபயர்பேஸ் அறிவிப்பு.",
    "guardian_fall_detection_desc": "சரிபார்க்கப்பட்ட வீழ்ச்சிகளைக் கண்டறிய மோஷன் சென்சார்களைப் பயன்படுத்துகிறது மற்றும் உங்கள் அவசரகால தொடர்புகளுக்குத் தெரிவிக்கிறது. இது SOS அல்லது ஆம்புலன்ஸைத் தூண்டாது.",
    "guardian_vehicle_crash_numbered": "2. வாகன விபத்து கண்டறிதல்",
    "guardian_vehicle_crash_reliability": "கடுமையான அதிவேக தாக்க கண்டறிதல்.",
    "guardian_vehicle_crash_desc": "வாகன வேகத்தில் கடுமையான தாக்கங்களை கண்காணிக்கிறது. கவுண்ட்டவுன் ரத்து செய்யப்படாவிட்டால், அது SOS ஆம்புலன்ஸை தூண்டுகிறது மற்றும் அவசர தொடர்புகளுக்கு தெரிவிக்கிறது.",
    "guardian_mobility_analysis_numbered": "3. మొபிலிட்டி பகுப்பாய்வு",
    "guardian_mobility_reliability": "நடை முறை மாற்றங்களுக்கான ஸ்கிரீனிங்.",
    "guardian_mobility_desc": "மருத்துவர்கள் மீட்பைக் கண்காணிக்க உதவ உங்கள் நடை முறையைப் பகுப்பாய்வு செய்கிறது.",
    "guardian_doctor_sharing": "டாக்டர் பகிர்வு",
    "guardian_doctor_reliability": "தனிப்பட்ட தரவு பகிர்வு.",
    "guardian_doctor_desc": "ஆலோசனை நேரத்தில் உங்கள் மருத்துவர் பகுப்பாய்வுகளைக் காண அனுமதிக்கவும்."
}

strings_mr = {
    "monitoring_paused": "देखरेख थांबवली आहे",
    "live_monitoring_active": "लाइव्ह देखरेख सक्रिय",
    "turn_on_guardian": "लाइव्ह मॉनिटरिंग पुन्हा सुरू करण्यासाठी गार्जियन चालू करा.",
    "sensors_are_actively": "सेन्सर तुमच्या सुरक्षिततेच्या परिमाणांचा सक्रियपणे मागोवा घेत आहेत.",
    "telemetry_orientation": "ओरिएंटेशन",
    "telemetry_upright": "सरळ",
    "telemetry_tilted": "कललेला",
    "telemetry_speed": "गती",
    "telemetry_speed_val": "%1$s किमी/तास",
    "telemetry_activity": "क्रियाकलाप",
    "fall_detection_alerts": "पडल्याच्या सूचना",
    "impact_tumble_checking": "प्रभाव आणि पडण्याची तपासणी",
    "vehicle_crash_detection": "वाहन अपघात शोध",
    "high_speed_collision": "हाय-स्पीड टक्कर तपासणी",
    "mobility_analysis": "गतिशीलता विश्लेषण",
    "gait_balance_tracking": "चाल आणि समतोल ट्रॅकिंग",
    "status_active": "सक्रिय",
    "status_off": "बंद",
    "no_falls_detected": "✅ गेल्या 7 दिवसांत पडल्याची नोंद नाही",
    "falls_detected_format": "⚠️ गेल्या 7 दिवसांत %1$d वेळा पडल्याचे आढळले",
    "gait_stability_score": "गॅट स्थिरता स्कोअर",
    "last_7_days_higher_is_better": "गेले 7 दिवस (जास्त असणे चांगले)",

    "guardian_fall_alert": "पडल्याची सूचना",
    "guardian_crash_sos": "क्रॅश SOS",
    "guardian_mobility": "गतिशीलता",
    "guardian_data_sharing": "डेटा शेअरिंग",
    "guardian_allowed": "अनुमती आहे",
    
    "guardian_vision_alignment": "Vision Alignment",
    "guardian_vision_alignment_body": "गार्जियन प्रतिबंधात्मक काळजीसाठी बनविलेले आहे: आपत्कालीन प्रतिसाद, टेलिमेडिसिन संदर्भ आणि रुग्ण-नियंत्रित शेअरिंग.",
    "guardian_fall_detection_alerts_numbered": "1. पडल्याच्या सूचना",
    "guardian_fall_detection_reliability": "केवळ आपत्कालीन संपर्कांना फायरबेस सूचना.",
    "guardian_fall_detection_desc": "पडल्याची पडताळणी करण्यासाठी मोशन सेन्सर वापरते आणि आपल्या आपत्कालीन संपर्कांना सूचित करते. हे SOS किंवा रुग्णवाहिका पाठवत नाही.",
    "guardian_vehicle_crash_numbered": "2. वाहन अपघात शोध",
    "guardian_vehicle_crash_reliability": "कडक हाय-स्पीड इम्पॅक्ट शोध.",
    "guardian_vehicle_crash_desc": "वाहन वेगात गंभीर प्रभावांवर लक्ष ठेवते. जर काउंटडाउन रद्द केले नाही, तर ते SOS रुग्णवाहिका पाठवते आणि आपत्कालीन संपर्कांना सूचित करते.",
    "guardian_mobility_analysis_numbered": "3. गतिशीलता विश्लेषण",
    "guardian_mobility_reliability": "चालण्याच्या पद्धतीत बदल तपासत आहे.",
    "guardian_mobility_desc": "डॉक्टरांना रिकव्हरी ट्रॅक करण्यास मदत करण्यासाठी तुमच्या चालण्याच्या पद्धतीचे विश्लेषण करते.",
    "guardian_doctor_sharing": "डॉक्टर शेअरिंग",
    "guardian_doctor_reliability": "खाजगी डेटा शेअरिंग.",
    "guardian_doctor_desc": "सल्लामसलत करताना आपल्या डॉक्टरांना विश्लेषण पाहू द्या."
}

strings_kn = {
    "monitoring_paused": "ವೀಕ್ಷಣೆ ವಿರಾಮಗೊಳಿಸಲಾಗಿದೆ",
    "live_monitoring_active": "ಲೈವ್ ವೀಕ್ಷಣೆ ಸಕ್ರಿಯವಾಗಿದೆ",
    "turn_on_guardian": "ಲೈವ್ ಮಾನಿಟರಿಂಗ್ ಪುನರಾರಂಭಿಸಲು ಗಾರ್ಡಿಯನ್ ಆನ್ ಮಾಡಿ.",
    "sensors_are_actively": "ಸಂವೇದಕಗಳು ನಿಮ್ಮ ಸುರಕ್ಷತಾ ನಿಯತಾಂಕಗಳನ್ನು ಸಕ್ರಿಯವಾಗಿ ಟ್ರ್ಯಾಕ್ ಮಾಡುತ್ತಿವೆ.",
    "telemetry_orientation": "ದೃಷ್ಟಿಕೋನ",
    "telemetry_upright": "ನೇರ",
    "telemetry_tilted": "ಬಾಗಿದೆ",
    "telemetry_speed": "ವೇಗ",
    "telemetry_speed_val": "%1$s ಕಿಮೀ/ಗಂ",
    "telemetry_activity": "ಚಟುವಟಿಕೆ",
    "fall_detection_alerts": "ಪತನದ ಎಚ್ಚರಿಕೆಗಳು",
    "impact_tumble_checking": "ಪರಿಣಾಮ ಮತ್ತು ಪತನದ ತಪಾಸಣೆ",
    "vehicle_crash_detection": "ವಾಹನ ಅಪಘಾತ ಪತ್ತೆ",
    "high_speed_collision": "ಹೈ-ಸ್ಪೀಡ್ ಘರ್ಷಣೆ ತಪಾಸಣೆ",
    "mobility_analysis": "ಮೊಬಿಲಿಟಿ ವಿಶ್ಲೇಷಣೆ",
    "gait_balance_tracking": "ನಡಿಗೆ ಮತ್ತು ಸಮತೋಲನ ಟ್ರ್ಯಾಕಿಂಗ್",
    "status_active": "ಸಕ್ರಿಯ",
    "status_off": "ಆಫ್",
    "no_falls_detected": "✅ ಕಳೆದ 7 ದಿನಗಳಲ್ಲಿ ಯಾವುದೇ ಪತನ ಕಂಡುಬಂದಿಲ್ಲ",
    "falls_detected_format": "⚠️ ಕಳೆದ 7 ದಿನಗಳಲ್ಲಿ %1$d ಬಾರಿ ಪತನ ಪತ್ತೆಯಾಗಿದೆ",
    "gait_stability_score": "ನಡಿಗೆಯ ಸ್ಥಿರತೆ ಸ್ಕೋರ್",
    "last_7_days_higher_is_better": "ಕಳೆದ 7 ದಿನಗಳು (ಹೆಚ್ಚಿರುವುದು ಉತ್ತಮ)",

    "guardian_fall_alert": "ಪತನದ ಎಚ್ಚರಿಕೆ",
    "guardian_crash_sos": "ಕ್ರ್ಯಾಶ್ SOS",
    "guardian_mobility": "ಮೊಬಿಲಿಟಿ",
    "guardian_data_sharing": "ಡೇಟಾ ಹಂಚಿಕೆ",
    "guardian_allowed": "ಅನುಮತಿಸಲಾಗಿದೆ",
    
    "guardian_vision_alignment": "Vision Alignment",
    "guardian_vision_alignment_body": "ಗಾರ್ಡಿಯನ್ ತಡೆಗಟ್ಟುವ ಕಾಳಜಿಗಾಗಿ ನಿರ್ಮಿಸಲಾಗಿದೆ: ತುರ್ತು ಪ್ರತಿಕ್ರಿಯೆ, ಟೆಲಿಮೆಡಿಸಿನ್ ಸಂದರ್ಭ ಮತ್ತು ರೋಗಿ-ನಿಯಂತ್ರಿತ ಹಂಚಿಕೆ.",
    "guardian_fall_detection_alerts_numbered": "1. ಪತನದ ಎಚ್ಚರಿಕೆಗಳು",
    "guardian_fall_detection_reliability": "ತುರ್ತು ಸಂಪರ್ಕಗಳಿಗೆ ಮಾತ್ರ ಫೈರ್‌ಬೇಸ್ ಅಧಿಸೂಚನೆ.",
    "guardian_fall_detection_desc": "ಪರಿಶೀಲಿಸಿದ ಪತನಗಳನ್ನು ಪತ್ತೆಹಚ್ಚಲು ಮೋಷನ್ ಸೆನ್ಸಾರ್‌ಗಳನ್ನು ಬಳಸುತ್ತದೆ ಮತ್ತು ನಿಮ್ಮ ತುರ್ತು ಸಂಪರ್ಕಗಳಿಗೆ ತಿಳಿಸುತ್ತದೆ. ಇದು SOS ಅಥವಾ ಆಂಬ್ಯುಲೆನ್ಸ್ ರವಾನೆಯನ್ನು ಪ್ರಚೋದಿಸುವುದಿಲ್ಲ.",
    "guardian_vehicle_crash_numbered": "2. ವಾಹನ ಅಪಘಾತ ಪತ್ತೆ",
    "guardian_vehicle_crash_reliability": "ಬಿಗಿಯಾದ ಹೈ-ಸ್ಪೀಡ್ ಪ್ರಭಾವ ಪತ್ತೆ.",
    "guardian_vehicle_crash_desc": "ವಾಹನದ ವೇಗದಲ್ಲಿ ತೀವ್ರ ಪರಿಣಾಮಗಳನ್ನು ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡುತ್ತದೆ. ಕೌಂಟ್‌ಡೌನ್ ರದ್ದುಗೊಳಿಸದಿದ್ದರೆ, ಇದು SOS ಆಂಬ್ಯುಲೆನ್ಸ್ ರವಾನೆಯನ್ನು ಪ್ರಚೋದಿಸುತ್ತದೆ ಮತ್ತು ತುರ್ತು ಸಂಪರ್ಕಗಳಿಗೆ ತಿಳಿಸುತ್ತದೆ.",
    "guardian_mobility_analysis_numbered": "3. ಮೊಬಿಲಿಟಿ ವಿಶ್ಲೇಷಣೆ",
    "guardian_mobility_reliability": "ನಡೆಯುವ ಮಾದರಿ ಬದಲಾವಣೆಗಳಿಗಾಗಿ ಸ್ಕ್ರೀನಿಂಗ್.",
    "guardian_mobility_desc": "ವೈದ್ಯರು ಚೇತರಿಕೆಯನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಲು ಸಹಾಯ ಮಾಡಲು ನಿಮ್ಮ ನಡೆಯುವ ಮಾದರಿಯನ್ನು ವಿಶ್ಲೇಷಿಸುತ್ತದೆ.",
    "guardian_doctor_sharing": "ವೈದ್ಯರೊಂದಿಗೆ ಹಂಚಿಕೆ",
    "guardian_doctor_reliability": "ಖಾಸಗಿ ಡೇಟಾ ಹಂಚಿಕೆ.",
    "guardian_doctor_desc": "ಸಮಾಲೋಚನೆಯ ಸಮಯದಲ್ಲಿ ನಿಮ್ಮ ವೈದ್ಯರಿಗೆ ಅನಾಲಿಟಿಕ್ಸ್ ನೋಡಲು ಅನುಮತಿಸಿ."
}

translations = {
    'en': strings_en,
    'hi': strings_hi,
    'bn': strings_bn,
    'kn': strings_kn,
    'mr': strings_mr,
    'ta': strings_ta,
    'te': strings_te
}

base_dir = r"c:\Users\Divyanshu\OneDrive\Desktop\Project Vaididea\app\src\main\res"

def append_strings_to_file(file_path, translated_dict):
    if not os.path.exists(file_path):
        return
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    if "</resources>" not in content:
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
        print(f"Updated XML: {file_path}")

# 1. Update XML files
for lang, text_dict in translations.items():
    if lang == 'en':
        file_path = os.path.join(base_dir, "values", "strings.xml")
    else:
        file_path = os.path.join(base_dir, f"values-{lang}", "strings.xml")
    append_strings_to_file(file_path, text_dict)


# 2. Search and replace in code
def modify_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

card_kt = r"c:\Users\Divyanshu\OneDrive\Desktop\Project Vaididea\app\src\main\java\com\example\swastik\ui\screens\patient\components\SwastikGuardianCard.kt"
dash_kt = r"c:\Users\Divyanshu\OneDrive\Desktop\Project Vaididea\app\src\main\java\com\example\swastik\ui\screens\patient\guardian\GuardianDashboardScreen.kt"

card_replacements = [
    ('label = "Fall Alert"', 'label = stringResource(R.string.guardian_fall_alert)'),
    ('status = if (featurePreferences.fallDetection) "Allowed" else "Off"', 'status = if (featurePreferences.fallDetection) stringResource(R.string.guardian_allowed) else stringResource(R.string.guardian_off)'),
    ('label = "Crash SOS"', 'label = stringResource(R.string.guardian_crash_sos)'),
    ('status = if (featurePreferences.crashDetection) "Allowed" else "Off"', 'status = if (featurePreferences.crashDetection) stringResource(R.string.guardian_allowed) else stringResource(R.string.guardian_off)'),
    ('label = "Mobility"', 'label = stringResource(R.string.guardian_mobility)'),
    ('status = if (featurePreferences.mobilityAnalysis) "Allowed" else "Off"', 'status = if (featurePreferences.mobilityAnalysis) stringResource(R.string.guardian_allowed) else stringResource(R.string.guardian_off)'),
    ('label = "Data Sharing"', 'label = stringResource(R.string.guardian_data_sharing)'),
    ('status = if (featurePreferences.doctorQrSharing) "Allowed" else "Off"', 'status = if (featurePreferences.doctorQrSharing) stringResource(R.string.guardian_allowed) else stringResource(R.string.guardian_off)'),
    
    ('title = "Vision Alignment"', 'title = stringResource(R.string.guardian_vision_alignment)'),
    ('body = "Guardian is built for preventive-care: emergency response, telemedicine context, and patient-controlled sharing."', 'body = stringResource(R.string.guardian_vision_alignment_body)'),
    
    ('title = "1. Fall Detection Alerts"', 'title = stringResource(R.string.guardian_fall_detection_alerts_numbered)'),
    ('reliability = "Firebase notification to emergency contacts only."', 'reliability = stringResource(R.string.guardian_fall_detection_reliability)'),
    ('description = "Uses motion sensors to detect verified falls and notifies your emergency contacts. It does not trigger SOS or ambulance dispatch."', 'description = stringResource(R.string.guardian_fall_detection_desc)'),
    
    ('title = "2. Vehicle Crash Detection"', 'title = stringResource(R.string.guardian_vehicle_crash_numbered)'),
    ('reliability = "Tightened high-speed impact detection."', 'reliability = stringResource(R.string.guardian_vehicle_crash_reliability)'),
    ('description = "Monitors for severe impacts at vehicle speeds. If the countdown is not cancelled, it triggers SOS ambulance dispatch and notifies emergency contacts."', 'description = stringResource(R.string.guardian_vehicle_crash_desc)'),
    
    ('title = "3. Mobility Analysis"', 'title = stringResource(R.string.guardian_mobility_analysis_numbered)'),
    ('reliability = "Screening for walking pattern changes."', 'reliability = stringResource(R.string.guardian_mobility_reliability)'),
    ('description = "Analyzes your walking pattern to help doctors track recovery."', 'description = stringResource(R.string.guardian_mobility_desc)'),
    
    ('title = "Doctor Sharing"', 'title = stringResource(R.string.guardian_doctor_sharing)'),
    ('reliability = "Private data sharing."', 'reliability = stringResource(R.string.guardian_doctor_reliability)'),
    ('description = "Allow your doctor to see analytics during a consultation."', 'description = stringResource(R.string.guardian_doctor_desc)')
]

dash_replacements = [
    ('text = if (isActive) "Live Monitoring Active" else "Monitoring Paused"', 'text = if (isActive) stringResource(R.string.live_monitoring_active) else stringResource(R.string.monitoring_paused)'),
    ('text = if (isActive) "Sensors are actively tracking your safety parameters." else "Turn on Guardian to resume live monitoring."', 'text = if (isActive) stringResource(R.string.sensors_are_actively) else stringResource(R.string.turn_on_guardian)'),
    
    ('label = "Orientation"', 'label = stringResource(R.string.telemetry_orientation)'),
    ('value = if (telemetry.isUpright) "Upright" else "Tilted"', 'value = if (telemetry.isUpright) stringResource(R.string.telemetry_upright) else stringResource(R.string.telemetry_tilted)'),
    ('label = "Speed"', 'label = stringResource(R.string.telemetry_speed)'),
    ('value = "$speedVal km/h"', 'value = stringResource(R.string.telemetry_speed_val, speedVal)'),
    ('label = "Activity"', 'label = stringResource(R.string.telemetry_activity)'),
    
    ('title = "Fall Detection Alerts"', 'title = stringResource(R.string.fall_detection_alerts)'),
    ('description = "Impact & tumble checking"', 'description = stringResource(R.string.impact_tumble_checking)'),
    ('title = "Vehicle Crash Detection"', 'title = stringResource(R.string.vehicle_crash_detection)'),
    ('description = "High-speed collision checking"', 'description = stringResource(R.string.high_speed_collision)'),
    ('title = "Mobility Analysis"', 'title = stringResource(R.string.mobility_analysis)'),
    ('description = "Gait and balance tracking"', 'description = stringResource(R.string.gait_balance_tracking)'),
    
    ('text = if (actuallyActive) "Active" else "Off"', 'text = if (actuallyActive) stringResource(R.string.status_active) else stringResource(R.string.status_off)'),
    
    ('val fallText = if (falls == 0) "✅ No falls detected in the last 7 days" else "⚠️ $falls fall(s) detected in the last 7 days"', 'val fallText = if (falls == 0) stringResource(R.string.no_falls_detected) else stringResource(R.string.falls_detected_format, falls)'),
    
    ('title = "Gait Stability Score"', 'title = stringResource(R.string.gait_stability_score)'),
    ('subtitle = "Last 7 Days (Higher is better)"', 'subtitle = stringResource(R.string.last_7_days_higher_is_better)')
]

modify_file(card_kt, card_replacements)
modify_file(dash_kt, dash_replacements)
print("Code modified successfully.")
