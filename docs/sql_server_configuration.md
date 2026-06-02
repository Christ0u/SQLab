# Configuration de SQL Server

SQL Server nécessite une configuraiton initiale pour que SQLab puisse fonctionner.

## Configuration TCP/IP

Ouvrir `SQL Server Configuration Manager`.

![SQL Server Configuration Manager](./pictures/001.png)

Ouvrir le menu `SQL Server Network Configuration` puis `Protocols for <instance>`.

![SQL Server Configuration Manager](./pictures/002.png)

Cliquer droit sur `TCP/IP` et sélectionner `Propriétés`.

![SQL Server Configuration Manager](./pictures/003.png)

Dans la fenêtre qui s'affiche, cliquer sur le menu `IP Addresses`.

Dérouler l'ascensseur jusqu'à trouver la section `IPAll`.

![SQL Server Configuration Manager](./pictures/004.png)

Définir les champs de la section `IPAll` selon le tableau suivant.

| Champ             | Valeur | Remarque                |
| ----------------- | ------ | ----------------------- |
| TCP Dynamic Ports |        | Le champ doit être vide |
| TCP Port          | 1433   |                         |

Cliquer sur `Appliquer`.

Cliquer sur `OK` à l'affichage de l'avertissement.

![SQL Server Configuration Manager](./pictures/005.png)

Cliquer droit sur `TCP/IP` et sélectionner `Enable`.

Cliquer sur `OK` à l'affichage de l'avertissement.

![SQL Server Configuration Manager](./pictures/006.png)

S'assurer que le protocole `TCP/IP` est bien activé.

![SQL Server Configuration Manager](./pictures/007.png)

## Démarrage des services SQL Server

Ouvrir `SQL Server Configuration Manager`.

![SQL Server Configuration Manager](./pictures/001.png)

Ouvrir le menu `SQL Server Services`.

![SQL Server Configuration Manager](./pictures/008.png)

Cliquer droit sur `SQL Server(<instance>)` et sélectionner `Start`.

![SQL Server Configuration Manager](./pictures/009.png)

Cliquer droit sur `SQL Server Agent (<instance>)` et sélectionner `Start`.

![SQL Server Configuration Manager](./pictures/010.png)

S'assurer que l'état des services `SQL Server` et `SQL Server Agent` est défini à `Running`.

![SQL Server Configuration Manager](./pictures/011.png)
