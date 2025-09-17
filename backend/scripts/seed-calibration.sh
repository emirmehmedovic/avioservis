#!/bin/bash

# Seed skripta za plan kalibracije
# Ova skripta pokreće seedovanje test podataka za plan kalibracije

echo "🚀 Pokretanje seed skripte za plan kalibracije..."
echo ""

# Provjeri da li smo u backend direktoriju
if [ ! -f "package.json" ]; then
    echo "❌ Greška: Skripta mora biti pokrenuta iz backend direktorija"
    echo "💡 Uputstvo: cd backend && ./scripts/seed-calibration.sh"
    exit 1
fi

# Provjeri da li postoji .env fajl
if [ ! -f ".env" ]; then
    echo "❌ Greška: .env fajl nije pronađen"
    echo "💡 Uputstvo: Kreiraj .env fajl sa DATABASE_URL varijablom"
    exit 1
fi

# Provjeri da li je ts-node instaliran
if ! command -v npx &> /dev/null; then
    echo "❌ Greška: npx nije instaliran"
    exit 1
fi

echo "✅ Provjere prošle uspješno"
echo ""

# Pokreni seed skriptu
echo "🌱 Pokretanje seedovanja..."
npm run seed:calibration

# Provjeri exit kod
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Seedovanje završeno uspješno!"
    echo "💡 Možete sada otvoriti aplikaciju i testirati planove kalibracije"
else
    echo ""
    echo "❌ Seedovanje neuspješno!"
    echo "💡 Provjerite greške iznad i pokušajte ponovo"
    exit 1
fi

