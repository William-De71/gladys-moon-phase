# Phase de la lune

Cette intégration ajoute à Gladys un widget de tableau de bord **« Phase de la lune »** : la phase du jour,
l'illumination et l'âge de la lune, son disque éclairé, son lever et son coucher, et les prochains événements
lunaires.

## Prêt à l'emploi

**Rien à configurer** : tout est calculé localement à partir de la position de votre maison, sans compte, sans clé
et sans accès Internet.

La maison doit être **localisée** : renseignez sa position dans **Paramètres → Maisons**.

## Ajouter le widget

Éditez un tableau de bord, choisissez **Phase de la lune** dans les widgets d'intégration, puis réglez :

| Réglage                           | Rôle                                                                                                                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Maison**                        | Nom de la maison dont la position sert au calcul. Laisser vide pour la première maison localisée (le cas d'une seule maison).                                                          |
| **Afficher les détails**          | Affiche la liste sous la lune (distance, trajectoire, constellation, prochains événements). Décochez pour ne garder que la phase, le disque, le lever et le coucher.                   |
| **Calculer les valeurs à minuit** | Calcule l'illumination, la distance, l'âge et les décomptes à minuit, comme les calendriers lunaires, pour pouvoir les comparer ligne à ligne. Le lever et le coucher ne changent pas. |

## Ce que montre le widget

- **La phase** (Nouvelle Lune, Premier Croissant, Premier Quartier, Gibbeuse Croissante, Pleine Lune…), le
  **pourcentage éclairé** et l'**âge** de la lune (jours écoulés depuis la dernière nouvelle lune).
- **Le disque lunaire** (photo de la NASA) avec sa partie éclairée.
- **Le lever et le coucher** de la lune du jour, à l'heure de Gladys. `--:--` quand la lune ne se lève pas ou ne se
  couche pas ce jour-là (cela arrive environ un jour par mois).
- **Aujourd'hui** : distance Terre-Lune, trajectoire (ascendante ou descendante), constellation (zodiaque sidéral,
  comme les calendriers lunaires) et le prochain nœud.
- **À venir** : pleine lune, nouvelle lune, périgée, apogée et prochaine éclipse de lune, avec le nombre de jours
  et la date.

Le widget est mis à jour toutes les 10 minutes et juste après minuit.

## Questions fréquentes

**Le widget dit qu'aucune maison n'est localisée.** Renseignez la position d'une maison dans Paramètres → Maisons.

**Le widget dit « Aucune maison nommée … ».** Le nom saisi dans le réglage Maison ne correspond à aucune maison : le
message liste les noms à utiliser.

**Les heures sont décalées.** Vérifiez le fuseau horaire de Gladys (Paramètres → Système) ; l'intégration prend
celui-ci. Redémarrez l'intégration après l'avoir changé.

**Ma langue n'est pas l'anglais, le français ou l'allemand.** Le widget s'affiche alors en anglais.
