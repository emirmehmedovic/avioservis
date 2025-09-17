import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CalibrationPlanData {
  naziv_opreme: string;
  identifikacijski_broj: string;
  vlasnik_opreme: string;
  mjesto_koristenja_opreme: string;
  napomene?: string;
  
  // Osnovni instrumenti
  volumetar_kalibracija_od?: Date;
  volumetar_kalibracija_do?: Date;
  glavni_volumetar_kalibracija_od?: Date;
  glavni_volumetar_kalibracija_do?: Date;
  manometri_kalibracija_od?: Date;
  manometri_kalibracija_do?: Date;
  crijevo_punjenje_kalibracija_od?: Date;
  crijevo_punjenje_kalibracija_do?: Date;
  glavni_manometar_kalibracija_od?: Date;
  glavni_manometar_kalibracija_do?: Date;
  termometar_kalibracija_od?: Date;
  termometar_kalibracija_do?: Date;
  hidrometar_kalibracija_od?: Date;
  hidrometar_kalibracija_do?: Date;
  elektricni_denziometar_kalibracija_od?: Date;
  elektricni_denziometar_kalibracija_do?: Date;
  mjerac_provodljivosti_kalibracija_od?: Date;
  mjerac_provodljivosti_kalibracija_do?: Date;
  mjerac_otpora_provoda_kalibracija_od?: Date;
  mjerac_otpora_provoda_kalibracija_do?: Date;
  moment_kljuc_kalibracija_od?: Date;
  moment_kljuc_kalibracija_do?: Date;
  shal_detector_kalibracija_od?: Date;
  shal_detector_kalibracija_do?: Date;
  
  // Sigurnosni instrumenti
  kalibraza_vatro_dojava_od?: Date;
  kalibraza_vatro_dojava_do?: Date;
  kalibraza_pp_aparata_od?: Date;
  kalibraza_pp_aparata_do?: Date;
  vatro_dojava_od?: Date;
  vatro_dojava_do?: Date;
  
  // Radni dokumenti
  strucne_licence_radnika_od?: Date;
  strucne_licence_radnika_do?: Date;
  adr_dozvole_radnika_od?: Date;
  adr_dozvole_radnika_do?: Date;
  
  // Električni instrumenti
  mjerenje_otpora_uzemljenja_od?: Date;
  mjerenje_otpora_uzemljenja_do?: Date;
  ispitivanje_elektro_instalacija_od?: Date;
  ispitivanje_elektro_instalacija_do?: Date;
}

// Helper funkcija za kreiranje datuma
const createDate = (daysFromNow: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

// Test podaci
const testPlans: CalibrationPlanData[] = [
  {
    naziv_opreme: "Glavni gorionik A1",
    identifikacijski_broj: "GG-A1-2024",
    vlasnik_opreme: "Avio Servis d.o.o.",
    mjesto_koristenja_opreme: "Hangar 1 - Glavni terminal",
    napomene: "Kritična oprema za glavni gorionik. Redovna kalibracija obavezna.",
    
    // Osnovni instrumenti - važeći
    volumetar_kalibracija_od: createDate(-30),
    volumetar_kalibracija_do: createDate(300),
    glavni_volumetar_kalibracija_od: createDate(-45),
    glavni_volumetar_kalibracija_do: createDate(315),
    manometri_kalibracija_od: createDate(-20),
    manometri_kalibracija_do: createDate(340),
    crijevo_punjenje_kalibracija_od: createDate(-25),
    crijevo_punjenje_kalibracija_do: createDate(335),
    glavni_manometar_kalibracija_od: createDate(-40),
    glavni_manometar_kalibracija_do: createDate(320),
    termometar_kalibracija_od: createDate(-35),
    termometar_kalibracija_do: createDate(325),
    hidrometar_kalibracija_od: createDate(-15),
    hidrometar_kalibracija_do: createDate(345),
    elektricni_denziometar_kalibracija_od: createDate(-50),
    elektricni_denziometar_kalibracija_do: createDate(310),
    mjerac_provodljivosti_kalibracija_od: createDate(-60),
    mjerac_provodljivosti_kalibracija_do: createDate(300),
    mjerac_otpora_provoda_kalibracija_od: createDate(-55),
    mjerac_otpora_provoda_kalibracija_do: createDate(305),
    moment_kljuc_kalibracija_od: createDate(-45),
    moment_kljuc_kalibracija_do: createDate(315),
    shal_detector_kalibracija_od: createDate(-70),
    shal_detector_kalibracija_do: createDate(290),
    
    // Sigurnosni instrumenti - ističu uskoro
    kalibraza_vatro_dojava_od: createDate(-330),
    kalibraza_vatro_dojava_do: createDate(30),
    kalibraza_pp_aparata_od: createDate(-340),
    kalibraza_pp_aparata_do: createDate(20),
    vatro_dojava_od: createDate(-350),
    vatro_dojava_do: createDate(10),
    
    // Radni dokumenti - važeći
    strucne_licence_radnika_od: createDate(-365),
    strucne_licence_radnika_do: createDate(365),
    adr_dozvole_radnika_od: createDate(-400),
    adr_dozvole_radnika_do: createDate(330),
    
    // Električni instrumenti - važeći
    mjerenje_otpora_uzemljenja_od: createDate(-90),
    mjerenje_otpora_uzemljenja_do: createDate(270),
    ispitivanje_elektro_instalacija_od: createDate(-100),
    ispitivanje_elektro_instalacija_do: createDate(260),
  },
  {
    naziv_opreme: "Rezervni gorionik B2",
    identifikacijski_broj: "RG-B2-2024",
    vlasnik_opreme: "Avio Servis d.o.o.",
    mjesto_koristenja_opreme: "Hangar 2 - Rezervni terminal",
    napomene: "Rezervni gorionik. Kalibracija obavezna svakih 12 mjeseci.",
    
    // Osnovni instrumenti - mješoviti status
    volumetar_kalibracija_od: createDate(-400),
    volumetar_kalibracija_do: createDate(-10), // istekao
    glavni_volumetar_kalibracija_od: createDate(-380),
    glavni_volumetar_kalibracija_do: createDate(20), // ističe uskoro
    manometri_kalibracija_od: createDate(-360),
    manometri_kalibracija_do: createDate(40),
    crijevo_punjenje_kalibracija_od: createDate(-350),
    crijevo_punjenje_kalibracija_do: createDate(50),
    glavni_manometar_kalibracija_od: createDate(-370),
    glavni_manometar_kalibracija_do: createDate(30),
    termometar_kalibracija_od: createDate(-340),
    termometar_kalibracija_do: createDate(60),
    hidrometar_kalibracija_od: createDate(-330),
    hidrometar_kalibracija_do: createDate(70),
    elektricni_denziometar_kalibracija_od: createDate(-320),
    elektricni_denziometar_kalibracija_do: createDate(80),
    mjerac_provodljivosti_kalibracija_od: createDate(-310),
    mjerac_provodljivosti_kalibracija_do: createDate(90),
    mjerac_otpora_provoda_kalibracija_od: createDate(-300),
    mjerac_otpora_provoda_kalibracija_do: createDate(100),
    moment_kljuc_kalibracija_od: createDate(-290),
    moment_kljuc_kalibracija_do: createDate(110),
    shal_detector_kalibracija_od: createDate(-280),
    shal_detector_kalibracija_do: createDate(120),
    
    // Sigurnosni instrumenti - važeći
    kalibraza_vatro_dojava_od: createDate(-200),
    kalibraza_vatro_dojava_do: createDate(200),
    kalibraza_pp_aparata_od: createDate(-180),
    kalibraza_pp_aparata_do: createDate(220),
    vatro_dojava_od: createDate(-160),
    vatro_dojava_do: createDate(240),
    
    // Radni dokumenti - ističu uskoro
    strucne_licence_radnika_od: createDate(-730),
    strucne_licence_radnika_do: createDate(25),
    adr_dozvole_radnika_od: createDate(-700),
    adr_dozvole_radnika_do: createDate(15),
    
    // Električni instrumenti - važeći
    mjerenje_otpora_uzemljenja_od: createDate(-120),
    mjerenje_otpora_uzemljenja_do: createDate(280),
    ispitivanje_elektro_instalacija_od: createDate(-130),
    ispitivanje_elektro_instalacija_do: createDate(270),
  },
  {
    naziv_opreme: "Mobilni gorionik C3",
    identifikacijski_broj: "MG-C3-2024",
    vlasnik_opreme: "Avio Servis d.o.o.",
    mjesto_koristenja_opreme: "Mobilni hangar - Terminal C",
    napomene: "Mobilna oprema za terenske operacije. Posebna pažnja pri transportu.",
    
    // Osnovni instrumenti - neki nisu postavljeni
    volumetar_kalibracija_od: createDate(-365),
    volumetar_kalibracija_do: createDate(365),
    glavni_volumetar_kalibracija_od: createDate(-350),
    glavni_volumetar_kalibracija_do: createDate(380),
    // manometri - nije postavljeno
    crijevo_punjenje_kalibracija_od: createDate(-340),
    crijevo_punjenje_kalibracija_do: createDate(400),
    glavni_manometar_kalibracija_od: createDate(-320),
    glavni_manometar_kalibracija_do: createDate(420),
    // termometar - nije postavljeno
    hidrometar_kalibracija_od: createDate(-300),
    hidrometar_kalibracija_do: createDate(440),
    elektricni_denziometar_kalibracija_od: createDate(-280),
    elektricni_denziometar_kalibracija_do: createDate(460),
    mjerac_provodljivosti_kalibracija_od: createDate(-260),
    mjerac_provodljivosti_kalibracija_do: createDate(480),
    mjerac_otpora_provoda_kalibracija_od: createDate(-240),
    mjerac_otpora_provoda_kalibracija_do: createDate(500),
    moment_kljuc_kalibracija_od: createDate(-220),
    moment_kljuc_kalibracija_do: createDate(520),
    shal_detector_kalibracija_od: createDate(-200),
    shal_detector_kalibracija_do: createDate(540),
    
    // Sigurnosni instrumenti - važeći
    kalibraza_vatro_dojava_od: createDate(-150),
    kalibraza_vatro_dojava_do: createDate(590),
    kalibraza_pp_aparata_od: createDate(-140),
    kalibraza_pp_aparata_do: createDate(600),
    vatro_dojava_od: createDate(-130),
    vatro_dojava_do: createDate(610),
    
    // Radni dokumenti - važeći
    strucne_licence_radnika_od: createDate(-365),
    strucne_licence_radnika_do: createDate(365),
    adr_dozvole_radnika_od: createDate(-400),
    adr_dozvole_radnika_do: createDate(330),
    
    // Električni instrumenti - važeći
    mjerenje_otpora_uzemljenja_od: createDate(-180),
    mjerenje_otpora_uzemljenja_do: createDate(560),
    ispitivanje_elektro_instalacija_od: createDate(-190),
    ispitivanje_elektro_instalacija_do: createDate(550),
  },
  {
    naziv_opreme: "Testni gorionik D4",
    identifikacijski_broj: "TG-D4-2024",
    vlasnik_opreme: "Avio Servis d.o.o.",
    mjesto_koristenja_opreme: "Test laboratorij - Zgrada A",
    napomene: "Testna oprema za kalibraciju i testiranje. Nije za produkciju.",
    
    // Osnovni instrumenti - svi istekli
    volumetar_kalibracija_od: createDate(-500),
    volumetar_kalibracija_do: createDate(-50),
    glavni_volumetar_kalibracija_od: createDate(-480),
    glavni_volumetar_kalibracija_do: createDate(-40),
    manometri_kalibracija_od: createDate(-460),
    manometri_kalibracija_do: createDate(-30),
    crijevo_punjenje_kalibracija_od: createDate(-440),
    crijevo_punjenje_kalibracija_do: createDate(-20),
    glavni_manometar_kalibracija_od: createDate(-420),
    glavni_manometar_kalibracija_do: createDate(-10),
    termometar_kalibracija_od: createDate(-400),
    termometar_kalibracija_do: createDate(-5),
    hidrometar_kalibracija_od: createDate(-380),
    hidrometar_kalibracija_do: createDate(-3),
    elektricni_denziometar_kalibracija_od: createDate(-360),
    elektricni_denziometar_kalibracija_do: createDate(-1),
    mjerac_provodljivosti_kalibracija_od: createDate(-340),
    mjerac_provodljivosti_kalibracija_do: createDate(-2),
    mjerac_otpora_provoda_kalibracija_od: createDate(-320),
    mjerac_otpora_provoda_kalibracija_do: createDate(-4),
    moment_kljuc_kalibracija_od: createDate(-300),
    moment_kljuc_kalibracija_do: createDate(-6),
    shal_detector_kalibracija_od: createDate(-280),
    shal_detector_kalibracija_do: createDate(-8),
    
    // Sigurnosni instrumenti - svi istekli
    kalibraza_vatro_dojava_od: createDate(-700),
    kalibraza_vatro_dojava_do: createDate(-100),
    kalibraza_pp_aparata_od: createDate(-680),
    kalibraza_pp_aparata_do: createDate(-80),
    vatro_dojava_od: createDate(-660),
    vatro_dojava_do: createDate(-60),
    
    // Radni dokumenti - svi istekli
    strucne_licence_radnika_od: createDate(-1095),
    strucne_licence_radnika_do: createDate(-730),
    adr_dozvole_radnika_od: createDate(-1065),
    adr_dozvole_radnika_do: createDate(-700),
    
    // Električni instrumenti - svi istekli
    mjerenje_otpora_uzemljenja_od: createDate(-500),
    mjerenje_otpora_uzemljenja_do: createDate(-50),
    ispitivanje_elektro_instalacija_od: createDate(-480),
    ispitivanje_elektro_instalacija_do: createDate(-40),
  },
  {
    naziv_opreme: "Specijalni gorionik E5",
    identifikacijski_broj: "SG-E5-2024",
    vlasnik_opreme: "Avio Servis d.o.o.",
    mjesto_koristenja_opreme: "Specijalni hangar - Terminal E",
    napomene: "Specijalna oprema za teške uvjete rada. Redovna kalibracija svakih 6 mjeseci.",
    
    // Osnovni instrumenti - svi važeći
    volumetar_kalibracija_od: createDate(-180),
    volumetar_kalibracija_do: createDate(180),
    glavni_volumetar_kalibracija_od: createDate(-170),
    glavni_volumetar_kalibracija_do: createDate(190),
    manometri_kalibracija_od: createDate(-160),
    manometri_kalibracija_do: createDate(200),
    crijevo_punjenje_kalibracija_od: createDate(-150),
    crijevo_punjenje_kalibracija_do: createDate(210),
    glavni_manometar_kalibracija_od: createDate(-140),
    glavni_manometar_kalibracija_do: createDate(220),
    termometar_kalibracija_od: createDate(-130),
    termometar_kalibracija_do: createDate(230),
    hidrometar_kalibracija_od: createDate(-120),
    hidrometar_kalibracija_do: createDate(240),
    elektricni_denziometar_kalibracija_od: createDate(-110),
    elektricni_denziometar_kalibracija_do: createDate(250),
    mjerac_provodljivosti_kalibracija_od: createDate(-100),
    mjerac_provodljivosti_kalibracija_do: createDate(260),
    mjerac_otpora_provoda_kalibracija_od: createDate(-90),
    mjerac_otpora_provoda_kalibracija_do: createDate(270),
    moment_kljuc_kalibracija_od: createDate(-80),
    moment_kljuc_kalibracija_do: createDate(280),
    shal_detector_kalibracija_od: createDate(-70),
    shal_detector_kalibracija_do: createDate(290),
    
    // Sigurnosni instrumenti - svi važeći
    kalibraza_vatro_dojava_od: createDate(-90),
    kalibraza_vatro_dojava_do: createDate(270),
    kalibraza_pp_aparata_od: createDate(-85),
    kalibraza_pp_aparata_do: createDate(275),
    vatro_dojava_od: createDate(-80),
    vatro_dojava_do: createDate(280),
    
    // Radni dokumenti - svi važeći
    strucne_licence_radnika_od: createDate(-180),
    strucne_licence_radnika_do: createDate(180),
    adr_dozvole_radnika_od: createDate(-200),
    adr_dozvole_radnika_do: createDate(160),
    
    // Električni instrumenti - svi važeći
    mjerenje_otpora_uzemljenja_od: createDate(-60),
    mjerenje_otpora_uzemljenja_do: createDate(300),
    ispitivanje_elektro_instalacija_od: createDate(-65),
    ispitivanje_elektro_instalacija_do: createDate(295),
  }
];

async function seedCalibrationPlans() {
  try {
    console.log('🌱 Početak seedovanja planova kalibracije...');
    
    // Obriši postojeće test podatke
    await prisma.planKalibracije.deleteMany({
      where: {
        identifikacijski_broj: {
          startsWith: 'GG-A1-2024'
        }
      }
    });
    
    await prisma.planKalibracije.deleteMany({
      where: {
        identifikacijski_broj: {
          startsWith: 'RG-B2-2024'
        }
      }
    });
    
    await prisma.planKalibracije.deleteMany({
      where: {
        identifikacijski_broj: {
          startsWith: 'MG-C3-2024'
        }
      }
    });
    
    await prisma.planKalibracije.deleteMany({
      where: {
        identifikacijski_broj: {
          startsWith: 'TG-D4-2024'
        }
      }
    });
    
    await prisma.planKalibracije.deleteMany({
      where: {
        identifikacijski_broj: {
          startsWith: 'SG-E5-2024'
        }
      }
    });
    
    console.log('🗑️  Obrisani postojeći test podaci');
    
    // Dodaj nove test podatke
    for (const planData of testPlans) {
      const plan = await prisma.planKalibracije.create({
        data: planData
      });
      
      console.log(`✅ Kreiran plan: ${plan.naziv_opreme} (${plan.identifikacijski_broj})`);
    }
    
    console.log('🎉 Uspešno seedovanje planova kalibracije!');
    console.log(`📊 Ukupno kreiranih planova: ${testPlans.length}`);
    
    // Prikaži statistiku
    const totalPlans = await prisma.planKalibracije.count();
    console.log(`📈 Ukupan broj planova u bazi: ${totalPlans}`);
    
  } catch (error) {
    console.error('❌ Greška pri seedovanju:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Pokreni seedovanje
if (require.main === module) {
  seedCalibrationPlans()
    .then(() => {
      console.log('✅ Seedovanje završeno uspješno!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Greška:', error);
      process.exit(1);
    });
}

export default seedCalibrationPlans;

