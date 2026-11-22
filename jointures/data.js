/* Données pédagogiques : un mini-portefeuille d'assurance (volontairement imparfait) */
const DB = {
  individus: {
    pk: 'id_indiv',
    cols: ['id_indiv', 'nom', 'sexe', 'annee_naiss'],
    rows: [
      { id_indiv: 'I1', nom: 'Aïcha', sexe: 'F', annee_naiss: 1985 },
      { id_indiv: 'I2', nom: 'Bruno', sexe: 'M', annee_naiss: 1972 },
      { id_indiv: 'I3', nom: 'Chloé', sexe: 'F', annee_naiss: 1990 },
      { id_indiv: 'I4', nom: 'David', sexe: 'M', annee_naiss: 1960 },
      { id_indiv: 'I5', nom: 'Emma', sexe: 'F', annee_naiss: 1998 },   // prospect : aucun contrat
      { id_indiv: 'I6', nom: 'Farid', sexe: 'M', annee_naiss: 1955 }   // prospect : aucun contrat
    ]
  },
  contrats: {
    pk: 'id_contrat',
    cols: ['id_contrat', 'id_indiv', 'produit', 'date_effet', 'statut'],
    rows: [
      { id_contrat: 'C1', id_indiv: 'I1', produit: 'Santé', date_effet: '2022-01-01', statut: 'actif' },
      { id_contrat: 'C2', id_indiv: 'I1', produit: 'Prévoyance', date_effet: '2023-03-01', statut: 'actif' },
      { id_contrat: 'C3', id_indiv: 'I2', produit: 'Santé', date_effet: '2021-06-01', statut: 'actif' },
      { id_contrat: 'C4', id_indiv: 'I3', produit: 'Santé', date_effet: '2024-01-01', statut: 'actif' },
      { id_contrat: 'C5', id_indiv: 'I4', produit: 'Vie', date_effet: '2019-09-01', statut: 'résilié' },
      { id_contrat: 'C6', id_indiv: 'I9', produit: 'Prévoyance', date_effet: '2023-05-01', statut: 'actif' } // I9 inconnu !
    ]
  },
  cotisations: {
    pk: 'id_cotis',
    cols: ['id_cotis', 'id_contrat', 'annee', 'montant'],
    rows: [
      { id_cotis: 'K1', id_contrat: 'C1', annee: 2023, montant: 600 },
      { id_cotis: 'K2', id_contrat: 'C1', annee: 2024, montant: 620 },
      { id_cotis: 'K3', id_contrat: 'C2', annee: 2024, montant: 300 },
      { id_cotis: 'K4', id_contrat: 'C3', annee: 2023, montant: 540 },
      { id_cotis: 'K5', id_contrat: 'C3', annee: 2024, montant: 560 },
      { id_cotis: 'K6', id_contrat: 'C4', annee: 2024, montant: 580 },
      { id_cotis: 'K7', id_contrat: 'C99', annee: 2024, montant: 410 } // contrat C99 inexistant !
    ]
  },
  prestations: {
    pk: 'id_prest',
    cols: ['id_prest', 'id_contrat', 'date_sinistre', 'montant'],
    rows: [
      { id_prest: 'P1', id_contrat: 'C1', date_sinistre: '2023-04-12', montant: 450 },
      { id_prest: 'P2', id_contrat: 'C1', date_sinistre: '2024-02-20', montant: 700 },
      { id_prest: 'P3', id_contrat: 'C3', date_sinistre: '2023-11-05', montant: 1200 },
      { id_prest: 'P4', id_contrat: 'C5', date_sinistre: '2022-07-14', montant: 2500 },
      { id_prest: 'P5', id_contrat: 'C8', date_sinistre: '2024-03-03', montant: 300 } // contrat C8 inexistant !
    ]
  }
};

/* Clés naturelles proposées par défaut pour chaque couple de tables */
const DEFAULT_KEYS = {
  'individus|contrats': ['id_indiv', 'id_indiv'],
  'contrats|cotisations': ['id_contrat', 'id_contrat'],
  'contrats|prestations': ['id_contrat', 'id_contrat'],
  'cotisations|prestations': ['id_contrat', 'id_contrat']
};
function defaultKeys(l, r) {
  if (DEFAULT_KEYS[l + '|' + r]) return DEFAULT_KEYS[l + '|' + r];
  if (DEFAULT_KEYS[r + '|' + l]) return DEFAULT_KEYS[r + '|' + l].slice().reverse();
  return [DB[l].cols[0], DB[r].cols[0]];
}

/* Types de jointures : métadonnées pédagogiques */
const JOINS = {
  inner: {
    nom: 'INNER JOIN', court: 'Intersection',
    def: "Garde uniquement les lignes dont la clé existe des DEUX côtés.",
    actu: "« Je ne veux analyser que ce qui est présent partout » : contrats qui ont à la fois un assuré connu et des cotisations.",
    piege: "Silencieusement, tu perds les orphelins (contrat sans cotisation, cotisation sans contrat). Compare toujours les effectifs avant/après."
  },
  left: {
    nom: 'LEFT JOIN', court: 'Garder toute la gauche',
    def: "Garde TOUTES les lignes de la table de gauche ; les colonnes de droite sont vides (NULL) quand il n'y a pas de correspondance.",
    actu: "LE réflexe n°1 : « je pars de ma population de référence (individus, contrats) et j'enrichis ». Aucun individu ne disparaît.",
    piege: "Si la droite a plusieurs lignes par clé, la ligne de gauche est dupliquée (fan-out) : attention aux sommes."
  },
  right: {
    nom: 'RIGHT JOIN', court: 'Garder toute la droite',
    def: "Symétrique du LEFT JOIN : garde toutes les lignes de droite.",
    actu: "Rarement nécessaire : on préfère inverser l'ordre des tables et faire un LEFT JOIN (plus lisible).",
    piege: "Facile à confondre avec LEFT : repère toujours quelle table est ta population de référence."
  },
  full: {
    nom: 'FULL OUTER JOIN', court: 'Union des deux côtés',
    def: "Garde toutes les lignes des deux tables, appariées quand c'est possible, sinon complétées par des NULL.",
    actu: "Réconciliation : comparer la base de gestion et la base comptable (cotisations vs contrats) pour voir les écarts des deux côtés.",
    piege: "Résultat souvent plus large que prévu ; non supporté nativement dans MySQL (UNION de deux LEFT JOIN)."
  },
  left_anti: {
    nom: 'LEFT ANTI JOIN', court: 'Gauche SANS correspondance',
    def: "Garde les lignes de gauche qui n'ont AUCUNE correspondance à droite (on ne retient que les colonnes de gauche).",
    actu: "Contrôle qualité / prospection : assurés sans contrat, contrats sans cotisation, prestations sans contrat.",
    piege: "En SQL : LEFT JOIN + WHERE clé_droite IS NULL (ou NOT EXISTS). Ne pas utiliser NOT IN si la clé peut contenir des NULL."
  },
  right_anti: {
    nom: 'RIGHT ANTI JOIN', court: 'Droite SANS correspondance',
    def: "Garde les lignes de droite qui n'ont aucune correspondance à gauche.",
    actu: "Cotisations ou prestations rattachées à un contrat inexistant (orphelines) : à corriger avant tout calcul.",
    piege: "Plus lisible en inversant les tables et en faisant un LEFT ANTI."
  },
  semi: {
    nom: 'SEMI JOIN', court: 'Gauche AYANT une correspondance',
    def: "Garde les lignes de gauche qui ont au moins une correspondance à droite, sans dupliquer et sans ramener les colonnes de droite.",
    actu: "Filtrer : « les contrats ayant eu au moins un sinistre » (sans multiplier les lignes par le nombre de sinistres).",
    piege: "Évite le fan-out d'un INNER JOIN. En SQL : WHERE EXISTS (...)."
  },
  cross: {
    nom: 'CROSS JOIN', court: 'Produit cartésien',
    def: "Toutes les combinaisons possibles : chaque ligne de gauche avec chaque ligne de droite (pas de clé).",
    actu: "Construire une grille : produit × année × âge pour une table d'exposition, ou des scénarios de taux.",
    piege: "n × m lignes : explose vite. Si tu l'obtiens par accident (clé oubliée), le résultat est faux."
  }
};
const JOIN_ORDER = ['inner', 'left', 'right', 'full', 'left_anti', 'right_anti', 'semi', 'cross'];
