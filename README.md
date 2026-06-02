# SQLab

SQLab est une interface web permettant de se connecter à une instance SQL Server et de gérer des bases de données.

## Prérequis

- SQL Server (à configurer selon la documentation _[Configuration de SQL Server](./docs/sql_server_configuration.md)_)
- Git
- Node.js
- npm
- Docker
- Docker Compose

## Téléchargement du projet

Clôner le dépôt Git SQLab :

```BASH
git clone https://github.com/Christ0u/SQLab.git
```

## Installation des dépendances

Ouvrir le dossier `SQLab` dans un terminal.

Se déplacer dans le dossier `backend` :

```BASH
cd .\backend
```

Installer les dépendances :

```BASH
npm install
```

## Configuration initiale

Créer le fichier d'environnement à partir de l'exemple à la racine du répertoire du projet :

```bash
cp .env.example .env
```

Le fichier `.env` peut être personnalisé pour préremplir certains champs dans l'interface web et ainsi faciliter la connexion à une instance SQL Server.

```env
SQL_SERVER="host.docker.internal"     # Serveur SQL Server cible
SQL_INSTANCE=""                       # Instance SQL cible
SQL_PORT="1433"                       # Port associé au service SQL Server
SQL_LOGIN=""                          # Identifiant d'un utilisateur SQL Server
SQL_PASSWORD=""                       # Mot de passe d'un utilisateur SQL Server
```

**Remarque** : Dans le cas d'une instance SQL Server installée localement, ne pas modifier la variable `host.docker.internal`.

## Lancer l'application

A la racine du répertoire du projet :

```bash
docker-compose up --build
```

## Arrêter l'application

A la racine du répertoire du projet :

```bash
docker-compose down
```
