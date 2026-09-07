import os
from gtts import gTTS

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "sample_audio")
os.makedirs(SAMPLE_DIR, exist_ok=True)

# 1. Authentic Gujarati Artisan Speech
gujarati_text = (
    "આ એક પરંપરાગત કચ્છી બાંધણી સાડી છે, જે શુદ્ધ ગજી સિલ્કમાંથી બનાવેલી છે. "
    "તેમાં લાલ અને પીળા રંગનું બારીક ટાઈ એન્ડ ડાઈ કામ છે. "
    "તેને બનાવવામાં અમને પંદર દિવસનો સમય લાગ્યો છે. "
    "આ લગ્નપ્રસંગો માટે ખૂબ જ શુભ માનવામાં આવે છે."
)

# 2. Authentic Marathi Artisan Speech
marathi_text = (
    "ही एक अस्सल पैठणी साडी आहे, जी येवला येथे शुद्ध रेशीम आणि सोन्याच्या जरीने हातमागावर विणलेली आहे. "
    "पदरावर पारंपरिक मोराची आणि पोपटाची नक्षी काढली आहे. "
    "ही जांभळ्या रंगाची साडी पूर्ण करण्यासाठी तीन महिन्यांचा कालावधी लागला आहे."
)

# 3. Authentic Hindi Artisan Speech
hindi_text = (
    "यह एक शुद्ध बनारसी कतान सिल्क साड़ी है, जिसे वाराणसी में हथकरघे पर सोने और चांदी की जरी से बुना गया है। "
    "पल्लू पर पारंपरिक मोर और फूलों की नक्काशीदार बूटी बनाई गई है। "
    "इसे तैयार करने में लगभग एक महीने का समय लगा है।"
)

def generate_samples():
    print("Generating Gujarati artisan audio sample...")
    tts_gu = gTTS(text=gujarati_text, lang="gu", slow=False)
    gu_path = os.path.join(SAMPLE_DIR, "gujarati_bandhani_sample.mp3")
    tts_gu.save(gu_path)
    print(f"Saved: {gu_path} ({os.path.getsize(gu_path)} bytes)")

    print("Generating Marathi artisan audio sample...")
    tts_mr = gTTS(text=marathi_text, lang="mr", slow=False)
    mr_path = os.path.join(SAMPLE_DIR, "marathi_paithani_sample.mp3")
    tts_mr.save(mr_path)
    print(f"Saved: {mr_path} ({os.path.getsize(mr_path)} bytes)")

    print("Generating Hindi artisan audio sample...")
    tts_hi = gTTS(text=hindi_text, lang="hi", slow=False)
    hi_path = os.path.join(SAMPLE_DIR, "hindi_banarasi_sample.mp3")
    tts_hi.save(hi_path)
    print(f"Saved: {hi_path} ({os.path.getsize(hi_path)} bytes)")

if __name__ == "__main__":
    generate_samples()
