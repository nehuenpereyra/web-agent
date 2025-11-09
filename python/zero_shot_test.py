from transformers import pipeline

classifier = pipeline(
    "zero-shot-classification",
    model="joeddav/xlm-roberta-large-xnli"
)

text = """
El Instituto de Investigaciones en Biodiversidad y Medioambiente (INIBIOMA) es un centro de investigación científica ubicado en la ciudad de San Carlos de Bariloche, Argentina. Fue fundado en 1985 y depende del Consejo Nacional de Investigaciones Científicas y Técnicas (CONICET) y de la Universidad Nacional del Comahue (UNCo).
"""

labels = ["miembros de un instituto", "instituciones", "publicaciones", "proyectos", "listado de personas"]
result = classifier(text, labels)

print(result)