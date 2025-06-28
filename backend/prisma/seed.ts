import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Seed Users
  console.log('Seeding users...');
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: '$2b$10$K8kLN3O8vQrCQE3q5e2RduQOE3mFUJ3LiYA8K5uWxF1aO0K9p1HoC', // admin123
      role: 'ADMIN',
    },
  });

  const fuelOperator = await prisma.user.upsert({
    where: { username: 'fuel_operator' },
    update: {},
    create: {
      username: 'fuel_operator',
      passwordHash: '$2b$10$K8kLN3O8vQrCQE3q5e2RduQOE3mFUJ3LiYA8K5uWxF1aO0K9p1HoC', // admin123
      role: 'FUEL_OPERATOR',
    },
  });

  const servicer = await prisma.user.upsert({
    where: { username: 'servicer' },
    update: {},
    create: {
      username: 'servicer',
      passwordHash: '$2b$10$K8kLN3O8vQrCQE3q5e2RduQOE3mFUJ3LiYA8K5uWxF1aO0K9p1HoC', // admin123
      role: 'SERVICER',
    },
  });

  // Seed Companies
  console.log('Seeding companies...');
  const hifaPetrol = await prisma.company.upsert({
    where: { name: 'HIFA-PETROL d.o.o.' },
    update: {},
    create: {
      name: 'HIFA-PETROL d.o.o.',
      address: 'Branilaca Sarajeva 24',
      city: 'Sarajevo',
      contactPersonName: 'Marko Petrović',
      contactPersonPhone: '+387 33 123-456',
      taxId: '4200123456789',
    },
  });

  const airportServices = await prisma.company.upsert({
    where: { name: 'Airport Services Tuzla' },
    update: {},
    create: {
      name: 'Airport Services Tuzla',
      address: 'Dubrave bb',
      city: 'Tuzla',
      contactPersonName: 'Ana Nikolić',
      contactPersonPhone: '+387 35 654-321',
      taxId: '4201234567890',
    },
  });

  // Seed Locations
  console.log('Seeding locations...');
  const mainTerminal = await prisma.location.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Glavni terminal',
      address: 'Međunarodni aerodrom Tuzla, Dubrave bb',
      companyTaxId: hifaPetrol.taxId,
    },
  });

  const fuelDepot = await prisma.location.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Skladište goriva',
      address: 'Međunarodni aerodrom Tuzla, Zona A',
      companyTaxId: hifaPetrol.taxId,
    },
  });

  // Helper function to create dates
  const createDate = (daysOffset: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date;
  };

  // Seed Vehicles with comprehensive data
  console.log('Seeding vehicles...');

  // Vehicle 1: Main Fuel Truck - Mercedes Actros
  const vehicle1 = await prisma.vehicle.create({
    data: {
      status: 'ACTIVE',
      vehicle_name: 'Cisterna Mercedes Actros 2548',
      license_plate: 'T-123-AB',
      chassis_number: 'WDB9340261L123456',
      vessel_plate_no: 'TK-2024-001',
      notes: 'Glavna cisterna za transport avio goriva. Redovno održavana i kalibrirana.',
      
      // Filter data
      filter_installed: true,
      filter_installation_date: createDate(-730), // 2 years ago
      filter_validity_period_months: 12,
      filter_expiry_date: createDate(60), // 2 months from now
      filter_type_plate_no: 'FLT-MB-2548-001',
      filter_vessel_number: 'MB-TK-001',
      filter_annual_inspection_date: createDate(-30),
      filter_next_annual_inspection_date: createDate(335),
      filter_ew_sensor_inspection_date: createDate(-15),
      filter_cartridge_type: 'FACET CN1051',
      filter_ews: 'EWS-MB-001',
      filter_replacement_date: createDate(-90),
      filter_safety_valve: 'EMCO F002-125',
      filter_separator_type: 'Water separator FACET',
      filter_standard: 'EN 13617',
      filter_vent_valve: 'EMCO V125-002',
      filter_vessel_type: 'Pressure vessel Grade A',
      
      // Inspection dates
      last_annual_inspection_date: createDate(-90),
      next_annual_inspection_date: createDate(275),
      periodicni_pregled_vazi_do: createDate(180),
      registrovano_do: createDate(210),
      adr_vazi_do: createDate(730),
      tromjesecni_pregled_datum: createDate(-30),
      tromjesecni_pregled_vazi_do: createDate(60),
      
      // Hose data
      crijeva_za_tocenje: 'HD63, HD38, TW75',
      broj_crijeva_hd38: 'HD38-MB-001',
      broj_crijeva_hd63: 'HD63-MB-001', 
      broj_crijeva_tw75: 'TW75-MB-001',
      last_hose_hd63_replacement_date: createDate(-365),
      next_hose_hd63_replacement_date: createDate(1095), // 3 years
      last_hose_hd38_replacement_date: createDate(-180),
      next_hose_hd38_replacement_date: createDate(1285),
      last_hose_tw75_replacement_date: createDate(-275),
      next_hose_tw75_replacement_date: createDate(1190),
      last_hose_leak_test_date: createDate(-30),
      next_hose_leak_test_date: createDate(335),
      godina_proizvodnje_crijeva_hd38: 2023,
      godina_proizvodnje_crijeva_hd63: 2022,
      godina_proizvodnje_crijeva_tw75: 2023,
      datum_testiranja_pritiska_crijeva_hd38: createDate(-45),
      datum_testiranja_pritiska_crijeva_hd63: createDate(-45),
      datum_testiranja_pritiska_crijeva_tw75: createDate(-45),
      
      // Overwing hose data
      overwing_hose_diameter: '63mm',
      overwing_hose_installation_date: createDate(-365),
      overwing_hose_length: '15m',
      overwing_hose_lifespan: '4 years',
      overwing_hose_production_date: createDate(-400),
      overwing_hose_size: '63x75mm',
      overwing_hose_standard: 'EN 1361',
      overwing_hose_test_date: createDate(-30),
      overwing_hose_type: 'Fuel transfer hose',
      
      // Underwing hose data  
      underwing_hose_diameter: '38mm',
      underwing_hose_installation_date: createDate(-180),
      underwing_hose_length: '10m',
      underwing_hose_lifespan: '4 years',
      underwing_hose_production_date: createDate(-200),
      underwing_hose_size: '38x50mm',
      underwing_hose_standard: 'EN 1361',
      underwing_hose_test_date: createDate(-30),
      underwing_hose_type: 'Fuel transfer hose',
      
      // Calibration dates
      last_volumeter_calibration_date: createDate(-180),
      next_volumeter_calibration_date: createDate(185),
      last_manometer_calibration_date: createDate(-180),
      next_manometer_calibration_date: createDate(185),
      last_hecpv_ilcpv_test_date: createDate(-120),
      next_hecpv_ilcpv_test_date: createDate(245),
      last_6_month_check_date: createDate(-90),
      next_6_month_check_date: createDate(90),
      datum_kalibracije_hidrometra: createDate(-200),
      datum_kalibracije_moment_kljuca: createDate(-150),
      datum_kalibracije_termometra: createDate(-170),
      datum_kalibracije_uredjaja_elektricne_provodljivosti: createDate(-160),
      
      // Additional calibrations
      manometer_calibration_date: createDate(-180),
      manometer_calibration_valid_until: createDate(185),
      conductivity_meter_calibration_date: createDate(-160),
      conductivity_meter_calibration_valid_until: createDate(205),
      hydrometer_calibration_date: createDate(-200),
      hydrometer_calibration_valid_until: createDate(165),
      main_flow_meter_calibration_date: createDate(-190),
      main_flow_meter_calibration_valid_until: createDate(175),
      resistance_meter_calibration_date: createDate(-155),
      resistance_meter_calibration_valid_until: createDate(210),
      thermometer_calibration_date: createDate(-170),
      thermometer_calibration_valid_until: createDate(195),
      torque_wrench_calibration_date: createDate(-150),
      torque_wrench_calibration_valid_until: createDate(215),
      water_chemical_test_date: createDate(-30),
      water_chemical_test_valid_until: createDate(335),
      
      // Tanker data
      tanker_last_pressure_test_date: createDate(-365),
      tanker_next_pressure_test_date: createDate(1095),
      tanker_last_fire_safety_test_date: createDate(-180),
      tanker_next_fire_safety_test_date: createDate(550),
      cisterna_zadnja_kalibracija: createDate(-365),
      cisterna_naredna_kalibracija: createDate(1095),
      tahograf_zadnja_kalibracija: createDate(-90),
      tahograf_naredna_kalibracija: createDate(275),
      
      // Technical specifications
      chassis_manufacturer: 'Mercedes-Benz',
      chassis_type: 'Actros 2548',
      axle_count: 3,
      body_manufacturer: 'EMCO',
      body_type: 'Fuel tanker',
      carrying_capacity_kg: 28000,
      engine_displacement_ccm: 12800,
      engine_power_kw: 354,
      fuel_type: 'Diesel',
      seat_count: 2,
      tanker_compartments: 3,
      tanker_material: 'Aluminijum',
      tanker_type: 'Pritisni rezervoar',
      year_of_manufacture: 2020,
      kapacitet_cisterne: 30000,
      capacity_kg: 25500,
      current_kg: 15000,
      current_liters: 18750,
      euro_norm: 'Euro 6',
      flow_rate: 1200,
      fueling_type: 'Overwing/Underwing',
      loading_type: 'Top loading',
      supported_fuel_types: 'Jet A-1, Avgas 100LL',
      tank_type: 'Mobile tanker',
      truck_type: 'Heavy duty',
      vehicle_description: 'Mercedes Actros cisterna za transport avio goriva sa tri odvojena odjeljka',
      vehicle_type: 'Fuel truck',
      
      // Volumeter calibration
      volumeter_kalibracija_datum: createDate(-180),
      volumeter_kalibracija_vazi_do: createDate(185),
      
      // License data
      licenca_datum_izdavanja: createDate(-1095),
      licenca_vazi_do: createDate(730),
      
      // CWD data
      datum_isteka_cwd: createDate(365),
      
      // Sensor technology
      sensor_technology: 'EMCO EWS System',
      responsible_person_contact: 'Marko Petrović - +387 33 123-456',
      
      // Relations
      companyId: hifaPetrol.id,
      locationId: mainTerminal.id,
    },
  });

  // Vehicle 2: Secondary Fuel Truck - Volvo FMX
  const vehicle2 = await prisma.vehicle.create({
    data: {
      status: 'ACTIVE',
      vehicle_name: 'Cisterna Volvo FMX 440',
      license_plate: 'T-124-CD',
      chassis_number: 'YV2RT6EC5GA123789',
      vessel_plate_no: 'TK-2024-002',
      notes: 'Rezervna cisterna za transport avio goriva. Koristi se pri velikim zahtjevima.',
      
      // Filter data
      filter_installed: true,
      filter_installation_date: createDate(-600),
      filter_validity_period_months: 12,
      filter_expiry_date: createDate(120),
      filter_type_plate_no: 'FLT-VL-440-002',
      filter_vessel_number: 'VL-TK-002',
      filter_annual_inspection_date: createDate(-60),
      filter_next_annual_inspection_date: createDate(305),
      filter_ew_sensor_inspection_date: createDate(-45),
      filter_cartridge_type: 'FACET CN1052',
      filter_ews: 'EWS-VL-002',
      filter_replacement_date: createDate(-120),
      filter_safety_valve: 'EMCO F002-130',
      filter_separator_type: 'Water separator FACET Pro',
      filter_standard: 'EN 13617',
      filter_vent_valve: 'EMCO V130-003',
      filter_vessel_type: 'Pressure vessel Grade A',
      
      // Inspection dates
      last_annual_inspection_date: createDate(-120),
      next_annual_inspection_date: createDate(245),
      periodicni_pregled_vazi_do: createDate(150),
      registrovano_do: createDate(180),
      adr_vazi_do: createDate(700),
      tromjesecni_pregled_datum: createDate(-45),
      tromjesecni_pregled_vazi_do: createDate(45),
      
      // Hose data
      crijeva_za_tocenje: 'HD63, HD38',
      broj_crijeva_hd38: 'HD38-VL-002',
      broj_crijeva_hd63: 'HD63-VL-002',
      broj_crijeva_tw75: 'TW75-VL-002',
      last_hose_hd63_replacement_date: createDate(-400),
      next_hose_hd63_replacement_date: createDate(1060),
      last_hose_hd38_replacement_date: createDate(-200),
      next_hose_hd38_replacement_date: createDate(1265),
      last_hose_tw75_replacement_date: createDate(-300),
      next_hose_tw75_replacement_date: createDate(1165),
      last_hose_leak_test_date: createDate(-60),
      next_hose_leak_test_date: createDate(305),
      godina_proizvodnje_crijeva_hd38: 2022,
      godina_proizvodnje_crijeva_hd63: 2021,
      godina_proizvodnje_crijeva_tw75: 2022,
      datum_testiranja_pritiska_crijeva_hd38: createDate(-75),
      datum_testiranja_pritiska_crijeva_hd63: createDate(-75),
      datum_testiranja_pritiska_crijeva_tw75: createDate(-75),
      
      // Overwing hose data
      overwing_hose_diameter: '63mm',
      overwing_hose_installation_date: createDate(-400),
      overwing_hose_length: '12m',
      overwing_hose_lifespan: '4 years',
      overwing_hose_production_date: createDate(-430),
      overwing_hose_size: '63x75mm',
      overwing_hose_standard: 'EN 1361',
      overwing_hose_test_date: createDate(-60),
      overwing_hose_type: 'Fuel transfer hose',
      
      // Underwing hose data  
      underwing_hose_diameter: '38mm',
      underwing_hose_installation_date: createDate(-200),
      underwing_hose_length: '8m',
      underwing_hose_lifespan: '4 years',
      underwing_hose_production_date: createDate(-220),
      underwing_hose_size: '38x50mm',
      underwing_hose_standard: 'EN 1361',
      underwing_hose_test_date: createDate(-60),
      underwing_hose_type: 'Fuel transfer hose',
      
      // Calibration dates
      last_volumeter_calibration_date: createDate(-210),
      next_volumeter_calibration_date: createDate(155),
      last_manometer_calibration_date: createDate(-210),
      next_manometer_calibration_date: createDate(155),
      last_hecpv_ilcpv_test_date: createDate(-120),
      next_hecpv_ilcpv_test_date: createDate(245),
      last_6_month_check_date: createDate(-90),
      next_6_month_check_date: createDate(90),
      datum_kalibracije_hidrometra: createDate(-230),
      datum_kalibracije_moment_kljuca: createDate(-180),
      datum_kalibracije_termometra: createDate(-200),
      datum_kalibracije_uredjaja_elektricne_provodljivosti: createDate(-190),
      
      // Additional calibrations
      manometer_calibration_date: createDate(-210),
      manometer_calibration_valid_until: createDate(155),
      conductivity_meter_calibration_date: createDate(-190),
      conductivity_meter_calibration_valid_until: createDate(175),
      hydrometer_calibration_date: createDate(-230),
      hydrometer_calibration_valid_until: createDate(135),
      main_flow_meter_calibration_date: createDate(-220),
      main_flow_meter_calibration_valid_until: createDate(145),
      resistance_meter_calibration_date: createDate(-185),
      resistance_meter_calibration_valid_until: createDate(180),
      thermometer_calibration_date: createDate(-200),
      thermometer_calibration_valid_until: createDate(165),
      torque_wrench_calibration_date: createDate(-180),
      torque_wrench_calibration_valid_until: createDate(185),
      water_chemical_test_date: createDate(-60),
      water_chemical_test_valid_until: createDate(305),
      
      // Tanker data
      tanker_last_pressure_test_date: createDate(-400),
      tanker_next_pressure_test_date: createDate(1060),
      tanker_last_fire_safety_test_date: createDate(-210),
      tanker_next_fire_safety_test_date: createDate(520),
      cisterna_zadnja_kalibracija: createDate(-400),
      cisterna_naredna_kalibracija: createDate(1060),
      tahograf_zadnja_kalibracija: createDate(-120),
      tahograf_naredna_kalibracija: createDate(245),
      
      // Technical specifications
      chassis_manufacturer: 'Volvo',
      chassis_type: 'FMX 440',
      axle_count: 3,
      body_manufacturer: 'EMCO',
      body_type: 'Fuel tanker',
      carrying_capacity_kg: 25000,
      engine_displacement_ccm: 11000,
      engine_power_kw: 324,
      fuel_type: 'Diesel',
      seat_count: 2,
      tanker_compartments: 2,
      tanker_material: 'Aluminijum',
      tanker_type: 'Pritisni rezervoar',
      year_of_manufacture: 2019,
      kapacitet_cisterne: 25000,
      capacity_kg: 21250,
      current_kg: 12000,
      current_liters: 15000,
      euro_norm: 'Euro 6',
      flow_rate: 1000,
      fueling_type: 'Overwing/Underwing',
      loading_type: 'Top loading',
      supported_fuel_types: 'Jet A-1',
      tank_type: 'Mobile tanker',
      truck_type: 'Heavy duty',
      vehicle_description: 'Volvo FMX cisterna za rezervni transport avio goriva',
      vehicle_type: 'Fuel truck',
      
      // Volumeter calibration
      volumeter_kalibracija_datum: createDate(-210),
      volumeter_kalibracija_vazi_do: createDate(155),
      
      // License data
      licenca_datum_izdavanja: createDate(-1200),
      licenca_vazi_do: createDate(650),
      
      // CWD data
      datum_isteka_cwd: createDate(330),
      
      // Sensor technology
      sensor_technology: 'EMCO EWS System',
      responsible_person_contact: 'Ana Nikolić - +387 35 654-321',
      
      // Relations
      companyId: hifaPetrol.id,
      locationId: fuelDepot.id,
    },
  });

  // Vehicle 3: Service Vehicle - Ford Transit
  const vehicle3 = await prisma.vehicle.create({
    data: {
      status: 'ACTIVE',
      vehicle_name: 'Servisno vozilo Ford Transit',
      license_plate: 'T-125-EF',
      chassis_number: 'WF0DXXGCRDXXXXXX1',
      notes: 'Servisno vozilo za održavanje opreme i transport alata.',
      
      // Filter data - N/A for service vehicle
      filter_installed: false,
      
      // Calibration dates (basic for service vehicle)
      last_hecpv_ilcpv_test_date: createDate(-150),
      next_hecpv_ilcpv_test_date: createDate(215),
      last_6_month_check_date: createDate(-120),
      next_6_month_check_date: createDate(60),
      
      // Inspection dates
      last_annual_inspection_date: createDate(-150),
      next_annual_inspection_date: createDate(215),
      periodicni_pregled_vazi_do: createDate(120),
      registrovano_do: createDate(250),
      
      // Technical specifications
      chassis_manufacturer: 'Ford',
      chassis_type: 'Transit 350L',
      axle_count: 2,
      body_manufacturer: 'Ford',
      body_type: 'Van',
      carrying_capacity_kg: 1500,
      engine_displacement_ccm: 2000,
      engine_power_kw: 96,
      fuel_type: 'Diesel',
      seat_count: 3,
      year_of_manufacture: 2021,
      euro_norm: 'Euro 6d',
      truck_type: 'Light commercial',
      vehicle_description: 'Ford Transit servisno vozilo za održavanje aerodromske opreme',
      vehicle_type: 'Service vehicle',
      
      // License data
      licenca_datum_izdavanja: createDate(-800),
      licenca_vazi_do: createDate(900),
      
      // Relations
      companyId: airportServices.id,
      locationId: mainTerminal.id,
    },
  });

  // Vehicle 4: De-icing Vehicle - MAN TGM
  const vehicle4 = await prisma.vehicle.create({
    data: {
      status: 'MAINTENANCE',
      vehicle_name: 'De-icing MAN TGM 18.250',
      license_plate: 'T-126-GH',
      chassis_number: 'WMA06XZZ6FM123456',
      vessel_plate_no: 'DI-2024-001',
      notes: 'Vozilo za odmrzavanje zrakoplova. Trenutno u servisiranju pumpe.',
      
      // Filter data
      filter_installed: true,
      filter_installation_date: createDate(-800),
      filter_validity_period_months: 12,
      filter_expiry_date: createDate(30),
      filter_type_plate_no: 'FLT-MN-250-003',
      filter_vessel_number: 'MN-DI-001',
      filter_annual_inspection_date: createDate(-90),
      filter_next_annual_inspection_date: createDate(275),
      filter_ew_sensor_inspection_date: createDate(-30),
      
      // Inspection dates
      last_annual_inspection_date: createDate(-180),
      next_annual_inspection_date: createDate(185),
      periodicni_pregled_vazi_do: createDate(90),
      registrovano_do: createDate(120),
      adr_vazi_do: createDate(600),
      tromjesecni_pregled_datum: createDate(-60),
      tromjesecni_pregled_vazi_do: createDate(30),
      
      // Hose data
      crijeva_za_tocenje: 'Special de-icing hoses',
      broj_crijeva_hd38: 'DI-HD38-001',
      broj_crijeva_hd63: 'DI-HD63-001',
      last_hose_hd63_replacement_date: createDate(-500),
      next_hose_hd63_replacement_date: createDate(960),
      last_hose_hd38_replacement_date: createDate(-300),
      next_hose_hd38_replacement_date: createDate(1165),
      last_hose_leak_test_date: createDate(-90),
      next_hose_leak_test_date: createDate(275),
      godina_proizvodnje_crijeva_hd38: 2021,
      godina_proizvodnje_crijeva_hd63: 2020,
      datum_testiranja_pritiska_crijeva_hd38: createDate(-105),
      datum_testiranja_pritiska_crijeva_hd63: createDate(-105),
      
      // Calibration dates
      last_volumeter_calibration_date: createDate(-240),
      next_volumeter_calibration_date: createDate(125),
      last_manometer_calibration_date: createDate(-240),
      next_manometer_calibration_date: createDate(125),
      last_hecpv_ilcpv_test_date: createDate(-120),
      next_hecpv_ilcpv_test_date: createDate(245),
      last_6_month_check_date: createDate(-90),
      next_6_month_check_date: createDate(90),
      
      // Tanker data
      tanker_last_pressure_test_date: createDate(-500),
      tanker_next_pressure_test_date: createDate(960),
      tanker_last_fire_safety_test_date: createDate(-240),
      tanker_next_fire_safety_test_date: createDate(490),
      
      // Technical specifications
      chassis_manufacturer: 'MAN',
      chassis_type: 'TGM 18.250',
      axle_count: 2,
      body_manufacturer: 'VESTERGAARD',
      body_type: 'De-icing equipment',
      carrying_capacity_kg: 12000,
      engine_displacement_ccm: 6900,
      engine_power_kw: 184,
      fuel_type: 'Diesel',
      seat_count: 2,
      tanker_compartments: 2,
      tanker_material: 'Nerđajući čelik',
      tanker_type: 'De-icing fluid tank',
      year_of_manufacture: 2018,
      kapacitet_cisterne: 8000,
      capacity_kg: 9600,
      current_kg: 4800,
      current_liters: 6000,
      euro_norm: 'Euro 6',
      flow_rate: 800,
      fueling_type: 'De-icing spray',
      loading_type: 'Side loading',
      supported_fuel_types: 'Type I De-icing fluid',
      tank_type: 'De-icing tank',
      truck_type: 'Special purpose',
      vehicle_description: 'MAN TGM vozilo za odmrzavanje zrakoplova',
      vehicle_type: 'De-icing truck',
      
      // Volumeter calibration
      volumeter_kalibracija_datum: createDate(-240),
      volumeter_kalibracija_vazi_do: createDate(125),
      
      // License data
      licenca_datum_izdavanja: createDate(-1500),
      licenca_vazi_do: createDate(500),
      
      // CWD data
      datum_isteka_cwd: createDate(300),
      
      // Relations
      companyId: airportServices.id,
      locationId: mainTerminal.id,
    },
  });

  console.log('Vehicles seeded successfully!');
  console.log(`Created vehicles:
  1. ${vehicle1.vehicle_name} (${vehicle1.license_plate})
  2. ${vehicle2.vehicle_name} (${vehicle2.license_plate})  
  3. ${vehicle3.vehicle_name} (${vehicle3.license_plate})
  4. ${vehicle4.vehicle_name} (${vehicle4.license_plate})`);

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });