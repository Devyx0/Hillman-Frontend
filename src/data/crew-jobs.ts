/**
 * Signed quotes behind the crews' jobs (JOBS in mock.ts). Every job links to a real quote and client, so
 * the crew view, the work order and the quote builder all read the same values: full site address and
 * phone, gutter colour, the crew note, and the estimator's annotated photos.
 *
 * Pure data (no imports from mock.ts): mock.ts turns each entry into a client + quote, and the quote
 * builder's draft seeding (quote-builder.ts) picks up colour, crew note and photos from here.
 */
import { samplePhoto, type Scene } from './sample-photos'

/** Annotation colour used by the estimator (same red as the annotation editor's first swatch). */
export const MARK = '#e5484d'

export interface DemoShape {
  kind: 'arrow' | 'circle' | 'text'
  x1: number
  y1: number
  x2: number
  y2: number
  /** French text written by the estimator. */
  text?: string
  color?: string
}

export interface CrewJobPhoto {
  label: string
  scene: Scene
  main?: boolean
  shapes: DemoShape[]
}

export interface CrewJobQuote {
  /** Quote number (matches JOBS[].quoteNo). */
  no: string
  company: 'toit' | 'sg' | 'reno'
  repId: string
  status: 'Signé' | 'Terminé' | 'Payé'
  date: string
  amount: number
  workType: string
  /** Gouttières: gutter length on the form (the job label says the same, e.g. "210 pi"). */
  feet?: number
  client: {
    first: string
    last: string
    /** Company name for commercial clients (shown instead of the person). */
    company?: string
    /** Role of the person to call on site, for commercial clients ("Gestionnaire de projets"). */
    contactRole?: string
    phone: string
    mobile?: string
    email: string
    no: string
    street: string
    city: string
    postal: string
    type: 'Résidentiel' | 'Commercial'
  }
  /** Gutter colour picked by the estimator (French). */
  color?: string
  /** Downspout colour when different from the gutters. */
  downspoutColor?: string
  /** Note printed on the work order for the crew (French). Internal sales notes never go here. */
  crewNote: string
  photos: CrewJobPhoto[]
}

// Reusable annotation sets (coordinates are fractions of the image).
const NEW_DOWNSPOUT = (x = 0.83): DemoShape[] => [
  { kind: 'arrow', x1: x - 0.2, y1: 0.42, x2: x + 0.06, y2: 0.55 },
  { kind: 'text', x1: x - 0.42, y1: 0.36, x2: x - 0.42, y2: 0.36, text: 'Nouvelle descente ici' },
  { kind: 'text', x1: x - 0.06, y1: 0.74, x2: x - 0.06, y2: 0.74, text: '6 pi' },
]
const CORNER = (text = 'Coin à refaire — mitre'): DemoShape[] => [
  { kind: 'circle', x1: 0.44, y1: 0.18, x2: 0.62, y2: 0.36 },
  { kind: 'text', x1: 0.06, y1: 0.12, x2: 0.06, y2: 0.12, text },
]
const OUTLET = (text = 'Sortie au sol vers la rue'): DemoShape[] => [
  { kind: 'arrow', x1: 0.62, y1: 0.86, x2: 0.9, y2: 0.86 },
  { kind: 'text', x1: 0.3, y1: 0.8, x2: 0.3, y2: 0.8, text },
]

export const CREW_JOB_QUOTES: CrewJobQuote[] = [
  // ── Toitures ────────────────────────────────────────────────────────────────
  {
    no: 'H63907', company: 'toit', repId: 'jph', status: 'Terminé', date: '2026-09-21', amount: 14000, workType: 'Toit en pente · Bardeaux',
    client: { first: 'Robert', last: 'Croteau', phone: '418 623-5512', mobile: '581 702-3341', email: 'r.croteau@videotron.ca', no: '812', street: 'rue des Bouleaux', city: 'Charlesbourg', postal: 'G1H 4L2', type: 'Résidentiel' },
    crewNote: 'Bardeaux Timberline HDZ Charbon. Remplacer le solin de la cheminée. Conteneur dans l’entrée, côté gauche.',
    photos: [
      { label: 'Façade avant', scene: 'facade', main: true, shapes: [{ kind: 'circle', x1: 0.42, y1: 0.02, x2: 0.58, y2: 0.2 }, { kind: 'text', x1: 0.06, y1: 0.06, x2: 0.06, y2: 0.06, text: 'Faîte à refaire au complet' }] },
      { label: 'Cheminée', scene: 'roof', shapes: [{ kind: 'arrow', x1: 0.35, y1: 0.18, x2: 0.57, y2: 0.34 }, { kind: 'text', x1: 0.06, y1: 0.12, x2: 0.06, y2: 0.12, text: 'Solin fissuré — remplacer' }] },
    ],
  },
  {
    no: 'H64026', company: 'toit', repId: 'jph', status: 'Signé', date: '2026-10-02', amount: 14889, workType: 'Toit en pente · Bardeaux',
    client: { first: 'Pierre', last: 'Simard', phone: '418 842-1176', mobile: '581 309-7720', email: 'pierre.simard@gmail.com', no: '2214', street: 'boulevard Henri-Bourassa', city: 'Neufchâtel', postal: 'G2B 1R6', type: 'Résidentiel' },
    crewNote: 'Timberline Charbon sur OSB ½ neuf (pontage complet). Chien dans la cour arrière : garder la clôture fermée.',
    photos: [
      { label: 'Façade avant', scene: 'facade', main: true, shapes: [{ kind: 'arrow', x1: 0.2, y1: 0.12, x2: 0.36, y2: 0.24 }, { kind: 'text', x1: 0.04, y1: 0.07, x2: 0.04, y2: 0.07, text: 'Pontage mou ici' }] },
      { label: 'Cheminée', scene: 'roof', shapes: [{ kind: 'circle', x1: 0.55, y1: 0.05, x2: 0.73, y2: 0.4 }, { kind: 'text', x1: 0.06, y1: 0.12, x2: 0.06, y2: 0.12, text: 'Contre-solin neuf' }] },
    ],
  },
  {
    no: 'H64174', company: 'toit', repId: 'jph', status: 'Signé', date: '2026-10-05', amount: 14000, workType: 'Toit plat · Élastomère',
    client: { first: 'Hélène', last: 'Paré', phone: '418 849-6620', email: 'helene.pare@hotmail.com', no: '47', street: 'chemin du Lac', city: 'Lac-Beauport', postal: 'G3B 0B9', type: 'Résidentiel' },
    crewNote: 'Élastomère 2 couches. Deux drains à remplacer (côté rue). Accès au toit par la cour arrière seulement.',
    photos: [{ label: 'Drains de toit', scene: 'roof', main: true, shapes: [{ kind: 'circle', x1: 0.12, y1: 0.4, x2: 0.26, y2: 0.56 }, { kind: 'text', x1: 0.06, y1: 0.12, x2: 0.06, y2: 0.12, text: 'Drain bouché — remplacer' }] }],
  },
  {
    no: 'H63771', company: 'toit', repId: 'jph', status: 'Signé', date: '2026-10-08', amount: 6500, workType: 'Toit plat · Élastomère',
    client: { first: 'Claude', last: 'Grenier', phone: '418 681-2290', mobile: '581 888-4103', email: 'claude.grenier@outlook.com', no: '1390', street: 'avenue Maguire', city: 'Sillery', postal: 'G1T 1Z3', type: 'Résidentiel' },
    crewNote: 'Réfection élastomère sur la partie arrière seulement (cuisine). Ne pas toucher au toit du garage.',
    photos: [{ label: 'Façade arrière', scene: 'side', main: true, shapes: [{ kind: 'circle', x1: 0.15, y1: 0.05, x2: 0.55, y2: 0.3 }, { kind: 'text', x1: 0.56, y1: 0.08, x2: 0.56, y2: 0.08, text: 'Zone à refaire' }] }],
  },
  {
    no: 'H63759', company: 'toit', repId: 'jph', status: 'Signé', date: '2026-10-09', amount: 6000, workType: 'Toit en pente · Bardeaux',
    client: { first: 'Véronique', last: 'Beaudoin', phone: '418 663-9087', email: 'v.beaudoin@live.ca', no: '305', street: 'avenue Royale', city: 'Beauport', postal: 'G1E 2L8', type: 'Résidentiel' },
    crewNote: 'Versant arrière seulement (9 carrés). Bardeaux agencés au versant avant (IKO Dynasty Granite).',
    photos: [{ label: 'Façade arrière', scene: 'side', main: true, shapes: [{ kind: 'arrow', x1: 0.7, y1: 0.08, x2: 0.55, y2: 0.18 }, { kind: 'text', x1: 0.6, y1: 0.04, x2: 0.6, y2: 0.04, text: 'Versant arrière' }] }],
  },
  {
    no: 'H63840', company: 'toit', repId: 'jph', status: 'Payé', date: '2026-09-14', amount: 12750, workType: 'Toit en pente · Bardeaux',
    client: { first: 'Gilles', last: 'Leclerc', phone: '418 667-4415', email: 'gilles.leclerc@videotron.ca', no: '96', street: 'rue Seigneuriale', city: 'Beauport', postal: 'G1E 4Y5', type: 'Résidentiel' },
    crewNote: 'Bardeaux complets. Ventilateur de faîte Cobra.',
    photos: [{ label: 'Façade avant', scene: 'facade', main: true, shapes: [{ kind: 'text', x1: 0.06, y1: 0.07, x2: 0.06, y2: 0.07, text: 'Ventilateur de faîte' }, { kind: 'arrow', x1: 0.3, y1: 0.1, x2: 0.48, y2: 0.05 }] }],
  },
  {
    no: 'H64305', company: 'toit', repId: 'jph', status: 'Signé', date: '2026-10-15', amount: 16300, workType: 'Toit en pente · Bardeaux',
    client: { first: 'Annie', last: 'Larouche', phone: '418 845-3020', mobile: '581 444-2187', email: 'annie.larouche@gmail.com', no: '5530', street: 'boulevard Louis-XIV', city: 'Lebourgneuf', postal: 'G2K 1N9', type: 'Résidentiel' },
    crewNote: 'Bardeaux 24 carrés. Puits de lumière à conserver (protéger pendant les travaux).',
    photos: [{ label: 'Façade avant', scene: 'facade', main: true, shapes: [{ kind: 'circle', x1: 0.6, y1: 0.06, x2: 0.76, y2: 0.2 }, { kind: 'text', x1: 0.56, y1: 0.25, x2: 0.56, y2: 0.25, text: 'Puits de lumière' }] }],
  },

  // ── Signature Gouttières ────────────────────────────────────────────────────
  {
    no: 'G64251', company: 'sg', repId: 'dpe', status: 'Signé', date: '2026-10-07', amount: 4870, workType: 'Gouttières · T-Rex XL M-5800', feet: 210,
    client: { first: 'Julie', last: 'Mercier', company: 'Habitations Mica', contactRole: 'Gestionnaire de projets', phone: '418 627-8800', mobile: '581 990-4512', email: 'jmercier@habitationsmica.ca', no: '1250', street: 'rue Jacques-Bédard', city: 'Lebourgneuf', postal: 'G2K 2B4', type: 'Commercial' },
    color: 'Blanc',
    downspoutColor: 'Brun commercial',
    crewNote: 'Immeuble de 6 logements, chantier actif : se présenter au bureau de chantier (roulotte) avant de commencer. Descentes brunes, gouttières blanches. Sortie de la descente arrière vers le drain français.',
    photos: [
      { label: 'Façade avant', scene: 'facade', main: true, shapes: [...NEW_DOWNSPOUT(0.83), { kind: 'circle', x1: 0.0, y1: 0.24, x2: 0.12, y2: 0.36 }, { kind: 'text', x1: 0.02, y1: 0.4, x2: 0.02, y2: 0.4, text: 'Bouchon' }] },
      { label: 'Coins et angles', scene: 'corner', shapes: CORNER('Coin extérieur — mitre') },
      { label: 'Façade arrière', scene: 'side', shapes: OUTLET('Vers le drain français') },
    ],
  },
  {
    no: 'G64219', company: 'sg', repId: 'dpe', status: 'Signé', date: '2026-10-06', amount: 2140, workType: 'Gouttières · T-Rex M-5200', feet: 120,
    client: { first: 'Denis', last: 'Duchesne', phone: '418 661-3348', mobile: '581 556-7103', email: 'denis.duchesne@videotron.ca', no: '41', street: 'rue de la Faune', city: 'Beauport', postal: 'G1E 6J4', type: 'Résidentiel' },
    color: 'Noir',
    crewNote: 'Enlever les vieilles gouttières en acier (rouillées) et les jeter. Une descente déplacée vers le coin arrière gauche.',
    photos: [
      { label: 'Façade avant', scene: 'facade', main: true, shapes: NEW_DOWNSPOUT(0.83) },
      { label: 'Côté gauche', scene: 'side', shapes: [{ kind: 'arrow', x1: 0.3, y1: 0.5, x2: 0.08, y2: 0.4 }, { kind: 'text', x1: 0.3, y1: 0.46, x2: 0.3, y2: 0.46, text: 'Déplacer la descente ici' }] },
    ],
  },
  {
    no: 'G64196', company: 'sg', repId: 'dps', status: 'Signé', date: '2026-10-04', amount: 1890, workType: 'Gouttières · T-Rex M-5200', feet: 96,
    client: { first: 'Alain', last: 'Dumas', phone: '418 833-5571', email: 'alain.dumas@gmail.com', no: '3120', street: 'rue Saint-Louis', city: 'Lévis', postal: 'G6V 4E2', type: 'Résidentiel' },
    color: 'Blanc',
    crewNote: 'Gouttières 5 po et coudes seulement — pas de protège-gouttières. Stationner dans la rue (entrée en pavé neuf).',
    photos: [{ label: 'Façade avant', scene: 'facade', main: true, shapes: [...NEW_DOWNSPOUT(0.83), { kind: 'text', x1: 0.06, y1: 0.86, x2: 0.06, y2: 0.86, text: 'Entrée en pavé neuf — ne pas stationner' }] }],
  },
  {
    no: 'G64157', company: 'sg', repId: 'bto', status: 'Signé', date: '2026-10-01', amount: 3260, workType: 'Gouttières · DoublePro D-11500', feet: 140,
    client: { first: 'Monique', last: 'Michaud', phone: '418 651-2204', mobile: '581 300-8812', email: 'monique.michaud@outlook.com', no: '4466', street: 'chemin Sainte-Foy', city: 'Cap-Rouge', postal: 'G1Y 1Z9', type: 'Résidentiel' },
    color: 'Brun commercial',
    crewNote: 'DoublePro sur toute la longueur : arbres matures côté cour. Prendre une photo avant/après de chaque côté.',
    photos: [
      { label: 'Façade arrière', scene: 'side', main: true, shapes: [{ kind: 'circle', x1: 0.05, y1: 0.24, x2: 0.95, y2: 0.36 }, { kind: 'text', x1: 0.06, y1: 0.12, x2: 0.06, y2: 0.12, text: 'DoublePro partout — arbres' }] },
      { label: 'Coins et angles', scene: 'corner', shapes: CORNER() },
    ],
  },
  {
    no: 'G64298', company: 'sg', repId: 'plc', status: 'Signé', date: '2026-10-15', amount: 450, workType: 'Pare-feuilles', feet: 30,
    client: { first: '', last: '', phone: '', email: '', no: '', street: '', city: '', postal: '', type: 'Résidentiel' }, // existing client (Mathieu Fournier): see mock.ts
    color: 'Blanc',
    crewNote: 'Pare-feuilles 5000 sur la façade avant seulement (30 pi). Nettoyer et vidanger les gouttières avant la pose. Sonner à la porte en arrivant : le client travaille de la maison.',
    photos: [
      { label: 'Façade avant', scene: 'facade', main: true, shapes: [{ kind: 'circle', x1: 0.05, y1: 0.24, x2: 0.95, y2: 0.36 }, { kind: 'text', x1: 0.06, y1: 0.12, x2: 0.06, y2: 0.12, text: 'Pare-feuilles 5000 — avant seulement' }, { kind: 'text', x1: 0.74, y1: 0.42, x2: 0.74, y2: 0.42, text: '30 pi' }] },
    ],
  },
  {
    no: 'G64187', company: 'sg', repId: 'bto', status: 'Payé', date: '2026-09-28', amount: 2380, workType: 'Gouttières · T-Rex XL M-5800', feet: 105,
    client: { first: 'Louise', last: 'Caron', phone: '418 653-7741', email: 'louise.caron@gmail.com', no: '2780', street: 'chemin des Quatre-Bourgeois', city: 'Sainte-Foy', postal: 'G1V 1W9', type: 'Résidentiel' },
    color: 'Gris ardoise',
    crewNote: 'Gouttières gris ardoise, descentes agencées. Sortie arrière dans le baril récupérateur de pluie.',
    photos: [{ label: 'Façade avant', scene: 'facade', main: true, shapes: [...NEW_DOWNSPOUT(0.83), ...OUTLET('Vers le baril de pluie')] }],
  },
  {
    no: 'G64312', company: 'sg', repId: 'plc', status: 'Signé', date: '2026-10-16', amount: 1540, workType: 'Gouttières · T-Rex M-5200', feet: 90,
    client: { first: 'France', last: 'Paradis', phone: '418 628-0934', email: 'france.paradis@videotron.ca', no: '615', street: 'rue du Golf', city: 'Charlesbourg', postal: 'G1H 5S2', type: 'Résidentiel' },
    color: 'Blanc',
    crewNote: 'Bungalow, façade avant et côté droit seulement.',
    photos: [{ label: 'Façade avant', scene: 'facade', main: true, shapes: NEW_DOWNSPOUT(0.83) }],
  },
  {
    no: 'G64176', company: 'sg', repId: 'dps', status: 'Signé', date: '2026-10-17', amount: 980, workType: 'Pare-feuilles', feet: 60,
    client: { first: 'Sylvie', last: 'Corriveau', phone: '418 524-6618', email: 'sylvie.corriveau@hotmail.com', no: '182', street: 'rue Racine', city: 'Limoilou', postal: 'G1L 3T6', type: 'Résidentiel' },
    color: 'Blanc',
    crewNote: 'Pare-feuilles 5300 zip sur les gouttières existantes (en bon état). Vérifier les crochets au passage.',
    photos: [{ label: 'Façade avant', scene: 'facade', main: true, shapes: [{ kind: 'circle', x1: 0.05, y1: 0.24, x2: 0.95, y2: 0.36 }, { kind: 'text', x1: 0.06, y1: 0.12, x2: 0.06, y2: 0.12, text: 'Pare-feuilles sur gouttières existantes' }] }],
  },

  // ── Rénovations ─────────────────────────────────────────────────────────────
  {
    no: 'R63978', company: 'reno', repId: 'pau', status: 'Signé', date: '2026-09-25', amount: 48200, workType: 'Garage',
    client: { first: 'Marc', last: 'Lavoie', phone: '418 688-5521', mobile: '581 233-0098', email: 'marc.lavoie@videotron.ca', no: '1745', street: 'chemin Saint-Louis', city: 'Sillery', postal: 'G1S 1G2', type: 'Résidentiel' },
    crewNote: 'Garage détaché + revêtement Canexel (couleur Cèdre). Électricien le jour 6. Garder l’accès au garage voisin dégagé.',
    photos: [{ label: 'Façade avant', scene: 'garage', main: true, shapes: [{ kind: 'arrow', x1: 0.2, y1: 0.85, x2: 0.28, y2: 0.62 }, { kind: 'text', x1: 0.04, y1: 0.9, x2: 0.04, y2: 0.9, text: 'Accès voisin à garder libre' }] }],
  },
]

export const crewJobQuote = (no?: string) => CREW_JOB_QUOTES.find((c) => c.no === no)

/** The estimator's photos for a crew-job quote, with the drawn demo images. */
export function crewJobPhotos(no: string) {
  const c = crewJobQuote(no)
  if (!c) return []
  return c.photos.map((p, i) => ({
    id: `e${i}`,
    label: p.label,
    main: !!p.main,
    src: samplePhoto(p.scene, { gutter: c.company === 'sg' ? (c.color === 'Noir' ? '#262626' : c.color === 'Brun commercial' ? '#5a3d2b' : c.color === 'Gris ardoise' ? '#5b6168' : '#f2f2ef') : '#f2f2ef' }),
    shapes: p.shapes.map((s) => ({ color: MARK, ...s })),
  }))
}
