import { PrismaClient, Location } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateLocationData {
  name: string;
  address?: string | null;
  companyTaxId?: string | null;
}

export interface UpdateLocationData {
  name?: string;
  address?: string | null;
  companyTaxId?: string | null;
}

export async function findAllLocations(): Promise<Location[]> {
  return prisma.location.findMany();
}

export async function findLocationById(id: number): Promise<Location | null> {
  return prisma.location.findUnique({
    where: { id },
  });
}

export async function createNewLocation(data: CreateLocationData): Promise<Location> {
  const finalData = {
    ...data,
    companyTaxId: data.companyTaxId === '' ? null : data.companyTaxId,
  };
  return prisma.location.create({ data: finalData });
}

export async function updateLocationById(id: number, data: UpdateLocationData): Promise<Location> {
  const finalData = {
    ...data,
    companyTaxId: data.companyTaxId === '' ? undefined : (data.companyTaxId === undefined ? undefined : (data.companyTaxId === null ? null : data.companyTaxId)),
  };
  if (finalData.companyTaxId === undefined) {
    delete (finalData as Partial<CreateLocationData>).companyTaxId;
  } else if (finalData.companyTaxId === '') {
    finalData.companyTaxId = null;
  }

  return prisma.location.update({
    where: { id },
    data: finalData,
  });
}

export async function deleteLocationById(id: number): Promise<Location> {
  return prisma.location.delete({ where: { id } });
}
