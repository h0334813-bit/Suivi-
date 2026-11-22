# 🎓 Suivi Master

Application web pour planifier ta journée de master et suivre ta progression : projets (deadlines + avancement), cours, révisions, examens et parcours (ECTS, notes, moyenne).

## Lancer
Ouvre simplement `index.html` dans un navigateur (aucune installation, aucune dépendance). Les données sont enregistrées dans le navigateur (`localStorage`).

## Fonctionnalités
- **Vue d'ensemble** : tâches du jour, prochain rendu/examen, « en ce moment / ensuite », échéances, semaine, parcours.
- **Ma journée** : timeline horaire avec ligne « maintenant » ; clique sur la grille pour créer un créneau, coche pour valider.
- **Semaine** : agenda des 7 jours.
- **Projets** : frise des deadlines, avancement (sous-tâches ou curseur), priorité, lien vers le Focus.
- **Cours** : emploi du temps hebdomadaire. **Examens** : compte à rebours, préparation, notes.
- **Révisions** : plan automatique (J-7 / J-4 / J-2 / J-1) avant chaque examen.
- **Parcours** : ECTS validés, moyenne, objectif de moyenne (note nécessaire), semestres/modules, graphiques, niveau/XP, série et succès.
- **Focus** : minuteur Pomodoro qui continue dans toutes les vues.
- Thème sombre/clair, couleur d'accent, export/import JSON. Raccourcis : `1`–`9` changent de vue, `n` crée une tâche.

Les données de démonstration se remplacent via ⚙ Réglages → *Tout effacer* (ou modifie-les directement).

---

## 🔗 Labo des jointures (actuariat) — `jointures/`
Application interactive pour comprendre les jointures sur un portefeuille individus / contrats / cotisations / prestations. Ouvre `jointures/index.html` (ou `/jointures/` sur GitHub Pages) : aucune installation.

1. **Comprendre** : tables, clés, granularité, cardinalité (données avec orphelins volontaires).
2. **Labo** : choisis tables, clés et type de jointure (INNER, LEFT, RIGHT, FULL, ANTI, SEMI, CROSS) ; lignes appariées/orphelines colorées, diagramme de Venn, code SQL / pandas / R / SAS.
3. **Quel réflexe ?** : arbre de décision et objectifs → jointure.
4. **Pièges & S/P** : fan-out (joindre puis sommer), ON vs WHERE, clés sales.
5. **Entraînement** : « quelle jointure ? » et « combien de lignes ? » avec score.
6. **Aide-mémoire**.
