# Physical Tanks - Cistern Fueling Logic

## Koncept

Fueling operacije oduzimaju gorivo iz cisterne koristeći FIFO princip, NEZAVISNO od MRN broja u fueling operation zapisu.

## Workflow

1. Fuel Intake → Physical Tanks
2. Transfer → Physical Cisterns (FIFO)
3. Fueling Operation → Oduzima iz cisterni (FIFO)

## Implementacija

Transfer Physical Tank → Cistern: VEĆ IMPLEMENTIRANO
Fueling Cistern → Aircraft: TREBA IMPLEMENTIRATI

Princip: Najstariji MRN prvi (FIFO)
