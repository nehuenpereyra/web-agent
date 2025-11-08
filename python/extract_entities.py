#!/usr/bin/env uv
# coding: utf-8

# uv add spacy
import sys
import json
import spacy

def main():
    # Cargamos el modelo español
    nlp = spacy.load("es_core_news_sm")

    # Leer texto desde stdin o argumento
    if not sys.stdin.isatty():
        text = sys.stdin.read().strip()
    elif len(sys.argv) > 1:
        text = " ".join(sys.argv[1:])
    else:
        print("Uso: uv run extract_entities.py 'Texto a analizar'")
        sys.exit(1)

    # Procesar texto
    doc = nlp(text)
    entities = [{"text": ent.text, "label": ent.label_} for ent in doc.ents]

    # Salida JSON
    print(json.dumps({"entities": entities}, ensure_ascii=False))

if __name__ == "__main__":
    main()