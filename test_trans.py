from googletrans import Translator
translator = Translator()
res = translator.translate("Hello world", dest='hi')
print(res.text)
