/** English for the apiSources API screens (French source → English). Lowest precedence, like ./api. */
export const apiSourcesEn: Record<string, string> = {
  // Paramètres › Sources de leads (ApiLeadSourcesTab)
  'Source renommée': 'Source renamed',
  'Source réactivée': 'Source reactivated',
  'Source désactivée': 'Source deactivated',
  'Une source déjà utilisée par des leads, des soumissions ou une clé de réception ne peut pas être supprimée : désactivez-la plutôt. Sinon, cette action est définitive.':
    'A source already used by leads, quotes or an intake key cannot be deleted: deactivate it instead. Otherwise, this cannot be undone.',
  'Les sources sont partagées par les compagnies : seuls les administrateurs de toutes les compagnies les modifient.':
    'Sources are shared by the companies: only administrators of every company can change them.',
  'Monter': 'Move up',
  'Descendre': 'Move down',

  // Réception des leads: intake keys
  'Clés de réception': 'Intake keys',
  'Nouvelle clé': 'New key',
  'Nouvelle clé de réception': 'New intake key',
  'Une clé par point d’entrée (formulaire du site, plateforme publicitaire). La clé décide de la source et, pour une clé de compagnie, de la compagnie.':
    'One key per entry point (website form, ad platform). The key sets the source and, for a company key, the company.',
  'Adresse de réception (POST)': 'Intake URL (POST)',
  'En-tête de la clé': 'Key header',
  'Une clé « Tout le groupe » exige aussi le champ company dans chaque envoi (toit, sg ou reno).':
    'A “Whole group” key also requires the company field in every submission (toit, sg or reno).',
  'Aucune clé': 'No keys',
  'Nom de la clé': 'Key name',
  'Tout le groupe': 'Whole group',
  'Créée le {date}': 'Created {date}',
  'Clé active': 'Active key',
  'Clé renommée': 'Key renamed',
  'Clé réactivée': 'Key reactivated',
  'Clé désactivée': 'Key deactivated',
  'Désactiver la clé « {name} »?': 'Deactivate the key “{name}”?',
  'Les leads envoyés avec cette clé seront refusés. Vous pourrez la réactiver.': 'Leads sent with this key will be refused. You can reactivate it later.',
  'ex. Site web Signature Gouttières': 'e.g. Signature Gouttières website',
  'Choisir une source': 'Choose a source',
  'Choisissez une compagnie.': 'Choose a company.',
  'Créer la clé': 'Create key',
  'Clé « {name} » créée': 'Key “{name}” created',
  'Copiez cette clé maintenant : elle ne sera plus jamais affichée. Seule son empreinte est conservée.':
    'Copy this key now: it will never be shown again. Only its fingerprint is stored.',
  'Clé de réception': 'Intake key',
  'Envoyez chaque lead en POST à {url}, avec la clé dans l’en-tête {header}.': 'Send each lead as a POST to {url}, with the key in the {header} header.',
  'Fermer sans copier la clé?': 'Close without copying the key?',
  'Elle ne pourra plus jamais être affichée. Il faudrait créer une nouvelle clé.': 'It can never be shown again. You would have to create a new key.',
  'Terminé': 'Done',

  // Backend messages (lead-sources, intake-keys)
  'Entrez un nom (ex. « Site web Signature Gouttières »).': 'Enter a name (e.g. “Signature Gouttières website”).',
  'Choisissez une source de leads active.': 'Choose an active lead source.',
  'Seul un administrateur de la compagnie peut gérer la réception des leads.': 'Only an administrator of the company can manage lead intake.',
  'Un formulaire de groupe crée des leads dans toutes les compagnies : réservé aux administrateurs de toutes les compagnies.':
    'A group form creates leads in every company: reserved for administrators of every company.',
  'Les sources de leads sont partagées par les compagnies : réservées aux administrateurs de toutes les compagnies.':
    'Lead sources are shared by the companies: reserved for administrators of every company.',
  'Cette source est utilisée par des leads, des soumissions ou un formulaire : désactivez-la plutôt.':
    'This source is used by leads, quotes or a form: deactivate it instead.',
  'Cet élément existe déjà.': 'This item already exists.',
  'Entrez le nom de la source.': 'Enter the source name.',
  'Entrez un nom.': 'Enter a name.',
  'Source introuvable.': 'Source not found.',
  'Clé introuvable.': 'Key not found.',
}
