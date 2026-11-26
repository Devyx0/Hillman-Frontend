/** English for the apiCompanies API screens (French source → English). Lowest precedence, like ./api. */
export const apiCompaniesEn: Record<string, string> = {
  // Paramètres › Compagnies (ApiCompaniesTab)
  'Aucune compagnie accessible.': 'No company available.',
  'Lecture seule : seul un administrateur de la compagnie peut modifier ses paramètres.': "Read-only: only an administrator of the company can change its settings.",
  'Aucun logo sur le PDF': 'No logo on the PDF',
  'Logo introuvable : remplacez-le ou retirez-le.': 'Logo not found: replace or remove it.',
  'Logo : PNG, JPG ou WebP, 2 Mo maximum (enregistré dès le téléversement). Pied de page : PNG, JPG, SVG ou WebP, 2 Mo maximum.':
    'Logo: PNG, JPG or WebP, 2 MB max (saved as soon as it is uploaded). Footer: PNG, JPG, SVG or WebP, 2 MB max.',
  'Logo enregistré': 'Logo saved',
  'Logo retiré': 'Logo removed',
  'Retirer le logo?': 'Remove the logo?',
  'Les prochains PDF de {name} seront imprimés sans logo. Les soumissions déjà imprimées gardent le leur.':
    "{name}'s next PDFs will be printed without a logo. Quotes already printed keep theirs.",
  'Raison sociale': 'Legal name',
  Province: 'Province',
  'Télécopieur, courriel affiché et image de pied de page : conservés sur cet appareil seulement.': 'Fax, displayed email and footer image: kept on this device only.',
  'Taux en pourcentage (ex. 5 ou 9.975).': 'Rates as percentages (e.g. 5 or 9.975).',
  'Vide : aucun terme imprimé sur le PDF.': 'Empty: no terms printed on the PDF.',
  'Modalités de paiement par défaut': 'Default payment terms',
  'Copiées dans les nouvelles soumissions.': 'Copied into new quotes.',
  'Marge cible (%)': 'Target margin (%)',
  'Vide : aucune marge cible. Visible par l’administration et la coordination seulement.': 'Empty: no target margin. Visible to administration and coordination only.',
  'Maximum {n} caractères.': 'Maximum {n} characters.',

  // Paramètres › Numérotation (ApiNumberingTab)
  'Une seule série de numéros pour le groupe : chaque compagnie imprime son préfixe devant le numéro (H64320, G64321). Le prochain numéro doit être supérieur au plus haut numéro déjà utilisé.':
    'One number series for the whole group: each company prints its prefix before the number (H64320, G64321). The next number must be higher than the highest number already used.',
  'Prochain numéro de soumission': 'Next quote number',
  'Aucun numéro utilisé pour l’instant.': 'No number used yet.',
  'Plus haut numéro utilisé : {n}': 'Highest number used: {n}',
  'Le numéro suit la série du groupe.': "The number follows the group's series.",

  // Server messages (Hillman-Backend settings module) shown through errorMessage / field errors
  'Entrez le nom de la compagnie.': 'Enter the company name.',
  'Entrez la raison sociale.': 'Enter the legal name.',
  'Préfixe : 1 à 3 lettres.': 'Prefix: 1 to 3 letters.',
  'Lien invalide.': 'Invalid link.',
  'Code postal invalide (ex. G1K 3A1).': 'Invalid postal code (e.g. G1K 3A1).',
  'Province : 2 lettres (QC).': 'Province: 2 letters (QC).',
  'Pourcentage invalide (ex. "35" ou "9.975").': 'Invalid percentage (e.g. "35" or "9.975").',
  'Taux entre 0 et 99.999 %.': 'Rate between 0 and 99.999%.',
  'Marge entre 0 et 99.99 %.': 'Margin between 0 and 99.99%.',
  'Couleur attendue au format #RRGGBB.': 'Colour expected as #RRGGBB.',
  'Format non pris en charge (PNG, JPG, WebP).': 'Unsupported format (PNG, JPG, WebP).',
  'Image trop lourde (2 Mo maximum).': 'Image too large (2 MB max).',
  'Le contenu du fichier ne correspond pas à une image PNG, JPG, WebP.': "The file's content isn't a PNG, JPG or WebP image.",
  'Fichier « file » manquant.': 'Missing file.',
  'Seul un administrateur de la compagnie peut modifier ses paramètres.': 'Only an administrator of the company can change its settings.',
  'La numérotation est partagée par les compagnies : réservée aux administrateurs de toutes les compagnies.':
    'Numbering is shared by the companies: reserved for administrators of every company.',
  'Compagnie introuvable.': 'Company not found.',
}
