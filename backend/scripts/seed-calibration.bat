@echo off
REM Seed skripta za plan kalibracije (Windows)
REM Ova skripta pokreće seedovanje test podataka za plan kalibracije

echo 🚀 Pokretanje seed skripte za plan kalibracije...
echo.

REM Provjeri da li smo u backend direktoriju
if not exist "package.json" (
    echo ❌ Greška: Skripta mora biti pokrenuta iz backend direktorija
    echo 💡 Uputstvo: cd backend ^&^& scripts\seed-calibration.bat
    pause
    exit /b 1
)

REM Provjeri da li postoji .env fajl
if not exist ".env" (
    echo ❌ Greška: .env fajl nije pronađen
    echo 💡 Uputstvo: Kreiraj .env fajl sa DATABASE_URL varijablom
    pause
    exit /b 1
)

echo ✅ Provjere prošle uspješno
echo.

REM Pokreni seed skriptu
echo 🌱 Pokretanje seedovanja...
npm run seed:calibration

REM Provjeri exit kod
if %errorlevel% equ 0 (
    echo.
    echo 🎉 Seedovanje završeno uspješno!
    echo 💡 Možete sada otvoriti aplikaciju i testirati planove kalibracije
) else (
    echo.
    echo ❌ Seedovanje neuspješno!
    echo 💡 Provjerite greške iznad i pokušajte ponovo
)

pause

