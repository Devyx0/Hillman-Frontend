/**
 * Toitures Hillman scope clauses (Travaux) — 135 clauses in the same 13 sections as the mockup's
 * `SCOPE_SECTIONS` (mock.ts). The mockup's 52 clauses are kept verbatim; the rest extend each section
 * with standard Québec roofing clauses (the plan calls for about 135; Logicia had about 187).
 *
 * Clauses that fill themselves in: `{pi²}`, `{carrés}` and `{pi lin.}` are replaced in the builder
 * and on the PDF by the values of the roof form (area, squares = area / 100, eaves length); see
 * `fillClause` in `./quote-builder`. English translations live in `src/i18n/en/quoteFlow.ts`
 * (builder block), keyed by the French text with the tokens left in place.
 *
 * Both the quote builder and the catalogue read from here.
 */
import { DEFAULT_SCOPE, type ScopeSection } from './mock'

export const ROOF_SCOPE_SECTIONS: ScopeSection[] = [
  {
    name: 'Préparation de chantier',
    lines: [
      'Ancrages et harnais de sécurité conformes aux normes de la SST',
      "Montage et démontage d'une chute à déchets",
      'Installation de garde-corps conformes aux exigences de la SST',
      "Montage et démontage d'échafaudage au besoin selon les normes de la SST",
      'Service de nacelle inclus',
      'Visite de chantier et prise de mesures avant le début des travaux',
      'Avis aux voisins avant le début des travaux',
      "Installation de points d'ancrage permanents sur la toiture",
      'Plan de sécurité et analyse de risques du chantier (SST)',
      'Accès au chantier par la cour arrière',
      'Grue ou monte-matériaux pour la livraison des matériaux sur le toit',
    ],
  },
  {
    name: 'Conteneur',
    lines: [
      "Fourniture d'un conteneur pour disposer des rebuts",
      "Conteneur de 20 vg placé dans l'entrée",
      'Conteneur de 30 vg pour toiture multicouche',
      'Remorque à déchets au lieu du conteneur (accès restreint)',
      "Permis d'occupation du domaine public pour le conteneur (si requis par la ville)",
    ],
  },
  {
    name: 'Protection de chantier',
    lines: [
      "Installation de toiles pour protéger l'aménagement paysager et le bâtiment",
      "Installation de madriers sous le conteneur de façon à protéger l'entrée",
      'Installation de toiles sur la piscine',
      "Installation d'un périmètre de sécurité au besoin",
      "Protection des fils haute tension faite par le client auprès d'Hydro-Québec",
      'Protection des fenêtres et des portes-patio avec contreplaqué au besoin',
      'Protection du revêtement extérieur sous les zones de travail',
      'Protection des thermopompes et unités extérieures',
      "Protection de l'entretoit contre la poussière sous les zones de pontage remplacé",
    ],
  },
  {
    name: 'Démantèlement',
    lines: [
      "Démantèlement de la toiture existante (bardeaux) jusqu'au pontage de bois (une couche)",
      "Démantèlement de la toiture existante (membrane élastomère) jusqu'au pontage de bois",
      'Démantèlement des gouttières et des descentes',
      'Démantèlement des soffites',
      'Démantèlement des fascias',
      "Démantèlement d'une deuxième couche de bardeaux",
      'Démantèlement de la toiture existante (bardeaux) sur {pi²} pi² ({carrés} carrés)',
      "Démantèlement de la toiture existante (multicouche asphalte et gravier) jusqu'au pontage",
      'Démantèlement des solins de cheminée existants',
      'Démantèlement des ventilateurs de toit existants',
      'Démantèlement des puits de lumière existants',
      'Retrait et disposition des antennes et soucoupes inutilisées',
    ],
  },
  {
    name: 'Pontage',
    lines: [
      'Fourniture de 64 pi² de contreplaqué ½ po pour réparation du pontage au besoin',
      "Fourniture et installation d'un contreplaqué ½ po standard en épinette sur la totalité de la toiture",
      "Fourniture et installation d'un panneau OSB 15/32 (Super Roof) avec H-clips",
      'Remplacement du pontage endommagé au-delà de la réserve : 95 $ la feuille de 4 × 8',
      'Fourniture et installation de contreplaqué ⅝ po sur {pi²} pi²',
      'Fixation du pontage existant (clous annelés) au besoin',
      'Installation de H-clips entre les feuilles de pontage',
      'Remplacement des planches de pontage (planches de 1 × 6) pourries',
      'Reprofilage de la pente (fourrures) au besoin, toit plat',
    ],
  },
  {
    name: 'Solins de toiture',
    lines: [
      "Fourniture et installation de solins d'aluminium 3 po de couleur agencée",
      "Fourniture et installation de solins d'acier 3 po de couleur agencée",
      'Conserver les solins existants',
      'Fourniture et installation de larmiers en aluminium sur {pi lin.} pi lin.',
      'Solins de cheminée neufs en aluminium agencé avec contre-solins',
      'Solins de noue en acier galvanisé (noue ouverte)',
      'Solins muraux en escalier le long des murs',
      'Solin de puits de lumière (trousse du fabricant)',
      'Scellement des solins existants au scellant Flextra',
    ],
  },
  {
    name: 'Membrane et sous-couche',
    lines: [
      'Membrane pare-glace Stormguard de GAF aux abords périphériques (6 pi)',
      'Sous-couche synthétique Feltbuster de GAF à la grandeur',
      'Membrane autocollante dans les noues sur 36 po (Stormguard de GAF)',
      'Membrane autocollante à la grandeur',
      'Sous-couche synthétique Feltbuster de GAF sur {pi²} pi²',
      'Membrane pare-glace Stormguard de GAF aux abords périphériques (3 pi)',
      'Membrane autocollante autour des cheminées et des puits de lumière',
      'Membrane pare-glace Grace Ice & Water Shield aux abords périphériques',
      'Sous-couche synthétique IKO Stormtite à la grandeur',
      'Membrane de sous-couche Soprema Sopraply Base 520 (toit plat)',
      'Membrane de finition Soprema Sopraply Traffic Cap 560 granulée (toit plat)',
      'Membrane élastomère deux couches sur {pi²} pi²',
      'Panneau de support Soprema Sopraboard ¼ po sur isolant',
    ],
  },
  {
    name: 'Mode de fixation',
    lines: [
      'Système fixé mécaniquement',
      'Système thermosoudé',
      'Système collé à froid (adhésif)',
      'Fixation des bardeaux avec 6 clous par bardeau (zones de grands vents)',
      'Fixation des bardeaux avec 4 clous par bardeau, selon le fabricant',
      'Système fixé mécaniquement et collé en périphérie',
      'Clous galvanisés à tige annelée 1¼ po',
    ],
  },
  {
    name: "Ventilation de l'entretoit",
    lines: [
      'Ventilateur de faîte Cobra Snowcountry',
      'Ventilateurs statiques Maximum (2)',
      'Évaluation de la ventilation existante',
      'Ouverture de la fente de faîte (coupe du pontage) pour la ventilation',
      'Ventilateurs statiques Maximum (4)',
      'Ventilateur de toit motorisé avec thermostat',
      "Déflecteurs de ventilation (chutes d'air) aux soffites",
      "Calcul de ventilation selon le Code (1 pi² par 300 pi² d'entretoit)",
      'Obturation des anciennes ouvertures de ventilation',
      'Ventilateurs de soffite continus en aluminium',
    ],
  },
  {
    name: "Sorties d'évent",
    lines: [
      "Solin d'évent en aluminium de type Évent 2000",
      'Remplacement des chapeaux de sortie de sécheuse',
      'Remplacement des solins de colonne de plomberie',
      'Remplacement des sorties de ventilation de salle de bain',
      'Prolongement des colonnes de plomberie trop courtes',
      'Sortie de hotte de cuisine avec clapet',
    ],
  },
  {
    name: "Bardeaux d'asphalte",
    lines: [
      "Bardeau d'asphalte GAF Timberline HDZ (armature en fibre de verre)",
      "Bardeau d'asphalte IKO Dynasty",
      'Pose de faîtières (chapeau) Seal-A-Ridge de GAF',
      'Bande de départ Pro-Start de GAF',
      "Bardeau d'asphalte GAF Timberline HDZ sur {pi²} pi² ({carrés} carrés)",
      "Bardeau d'asphalte BP Mystique 42",
      "Bardeau d'asphalte BP Vanguard",
      "Bardeau d'asphalte IKO Cambridge",
      "Bardeau d'asphalte CertainTeed Landmark Pro",
      'Faîtières IKO Hip and Ridge',
      'Bande de départ IKO Leading Edge Plus',
      'Couleur des bardeaux choisie par le client avant la commande',
      'Noues fermées (bardeaux tissés ou coupés)',
    ],
  },
  {
    name: 'Inclus généraux',
    lines: [
      'Gestion de projet',
      'Quincaillerie',
      'Manutention matériaux et outillage',
      'Passer le balai magnétique pendant et à la fin des travaux',
      'Disposer des déchets et garder les lieux propres quotidiennement',
      'Expertise de la toiture lors des travaux',
      'Nettoyage des gouttières à la fin des travaux',
      'Scellant Flextra de couleur agencée à chaque sortie de toit',
      'Inspection finale avec le client à la fin des travaux',
      'Photos avant et après les travaux remises au client',
      'Enregistrement de la garantie du fabricant au nom du client',
      'Couvreurs certifiés CCQ',
      'Assurance responsabilité civile de 5 000 000 $',
      'Licence RBQ en règle',
      'Retouche de peinture des solins et des évents au besoin',
      'Toiture étanche à la fin de chaque journée de travail',
    ],
  },
  {
    name: 'Exclusions',
    lines: [
      'Travaux de ventilation',
      'Travaux de menuiserie',
      "Travaux d'isolation",
      'Permis de construction',
      'Plans de construction',
      'Travaux électriques',
      'Déneigement, déglaçage et travaux hivernaux',
      'Remplacement du pontage au-delà de la réserve incluse',
      'Réparation de la maçonnerie de la cheminée',
      'Travaux de gouttières, soffites et fascias',
      'Remplacement des puits de lumière',
      'Décontamination (amiante, moisissures, vermiculite)',
      "Déplacement d'antennes, de panneaux solaires ou de soucoupes",
      'Dommages causés par une structure non conforme existante',
      "Frais d'occupation du domaine public exigés par la ville",
    ],
  },
]

/** Clauses ticked on a new Toitures quote: the mockup's defaults plus the new standard ones. */
export const ROOF_DEFAULT_SCOPE = new Set<string>([
  ...DEFAULT_SCOPE,
  'Visite de chantier et prise de mesures avant le début des travaux',
  'Fourniture et installation de larmiers en aluminium sur {pi lin.} pi lin.',
  'Solins de cheminée neufs en aluminium agencé avec contre-solins',
  'Inspection finale avec le client à la fin des travaux',
  'Enregistrement de la garantie du fabricant au nom du client',
  'Couvreurs certifiés CCQ',
  'Toiture étanche à la fin de chaque journée de travail',
  'Remplacement du pontage au-delà de la réserve incluse',
  'Réparation de la maçonnerie de la cheminée',
])
