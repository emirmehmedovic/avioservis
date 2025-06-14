/**
 * Konfiguracija putanja za različita okruženja
 * Ova konfiguracija omogućava fleksibilno upravljanje putanjama dokumenata
 * na različitim hosting platformama.
 */
import path from 'path';
import fs from 'fs';

// Detekcija okruženja (Render, lokalno, itd.)
const isRender = process.env.RENDER === 'true';

// Osnovne putanje za različita okruženja
const paths = {
  // Putanja do korijena projekta
  projectRoot: isRender 
    ? '/opt/render/project/src' 
    : path.resolve(__dirname, '../../..'),
  
  // Putanja do javnih datoteka
  publicDir: isRender 
    ? '/opt/render/project/src/public' 
    : path.resolve(__dirname, '../../../public'),
  
  // Putanja do direktorija za upload
  uploadsDir: isRender 
    ? '/opt/render/project/src/public/uploads' 
    : path.resolve(__dirname, '../../../public/uploads'),
};

/**
 * Funkcija koja rješava putanju dokumenta
 * @param documentPath - Relativna putanja dokumenta (npr. '/uploads/fuel_documents/file.pdf')
 * @returns Apsolutna putanja do dokumenta
 */
export function resolveDocumentPath(documentPath: string): string {
  if (!documentPath) {
    console.error('Prazan documentPath proslijeđen u resolveDocumentPath');
    return '';
  }

  // Izvuci ime datoteke iz putanje
  const filename = path.basename(documentPath);
  
  // Ukloni početni slash ako postoji
  const cleanPath = documentPath.startsWith('/') ? documentPath.substring(1) : documentPath;
  
  // Ako putanja već sadrži 'uploads', ukloni taj dio za neke putanje
  const pathWithoutUploads = cleanPath.startsWith('uploads/') 
    ? cleanPath.substring(8) 
    : cleanPath;
  
  // Generiraj nekoliko mogućih putanja za dokument
  const possiblePaths = [
    // 1. Direktno u uploads direktoriju
    path.join(paths.uploadsDir, pathWithoutUploads),
    
    // 2. Ako je putanja već potpuna
    path.join(paths.projectRoot, cleanPath),
    
    // 3. Ako je putanja relativna prema public direktoriju
    path.join(paths.publicDir, cleanPath),
    
    // 4. Samo ime datoteke u uploads direktoriju
    path.join(paths.uploadsDir, filename),
    
    // 5. Za slučaj da je putanja spremljena s '/uploads' prefiksom
    path.join(paths.publicDir, cleanPath.replace(/^uploads\//, '')),
    
    // 6. Za slučaj da je putanja spremljena s '/uploads/fuel_documents' prefiksom
    path.join(paths.projectRoot, 'public', 'uploads', 'fuel_documents', filename),
    
    // 7. Za slučaj da je putanja u backend/public/uploads/fuel_documents
    path.join(paths.projectRoot, 'backend', 'public', 'uploads', 'fuel_documents', filename),
    
    // 8. Za slučaj da je putanja u backend/uploads/fuel_documents
    path.join(paths.projectRoot, 'backend', 'uploads', 'fuel_documents', filename),
    
    // 9. Za slučaj da je putanja za dokumente operacija točenja goriva
    path.join(paths.projectRoot, 'backend', 'public', 'uploads', 'fueling_documents', filename),
    
    // 10. Za slučaj da je putanja za dokumente operacija točenja goriva u public direktoriju
    path.join(paths.projectRoot, 'public', 'uploads', 'fueling_documents', filename),
    
    // 11. Za slučaj da je putanja za dokumente operacija točenja goriva u uploads direktoriju
    path.join(paths.uploadsDir, 'fueling_documents', filename),
  ];
  
  // Ispiši sve putanje za debugging
  console.log('Tražim dokument:', documentPath);
  console.log('Moguće putanje:', possiblePaths);
  
  // Pronađi prvu putanju koja postoji
  for (const tryPath of possiblePaths) {
    if (fs.existsSync(tryPath)) {
      console.log('Dokument pronađen na putanji:', tryPath);
      return tryPath;
    }
  }
  
  console.error('Dokument nije pronađen ni na jednoj putanji');
  
  // Ako nijedna putanja ne postoji, vrati prvu kao default
  return possiblePaths[0];
}

export default paths;
